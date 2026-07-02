import { chat } from "@/lib/llm";
import { getTeamMember } from "@/lib/auth/team";
import {
  buildAuditLog,
  canAccess,
  filterAccessibleMemory,
} from "@/lib/governance/permission-service";
import { mergeAllGovernedRecords } from "@/lib/governance/memory-registry";
import {
  dbGetProjects,
  dbGetProposals,
  dbGetBranches,
  dbGetTasks,
  dbGetFeaturePacks,
  dbSaveGovernedMemories,
  dbGetGovernedMemories,
  dbSavePermissionAuditLogs,
  dbGetPermissionAuditLogs,
} from "@/lib/db/repository";
import type { GovernedMemoryRecord, PermissionAuditLog } from "@/lib/types";
import { v4 as uuid } from "uuid";
import { asPlainText, plainTextLower } from "@/lib/utils/text";

export async function syncGovernedMemoryRegistry(): Promise<GovernedMemoryRecord[]> {
  const [projects, proposals, branches, tasks, featurePacks] = await Promise.all([
    dbGetProjects(),
    dbGetProposals(),
    dbGetBranches(),
    dbGetTasks(),
    dbGetFeaturePacks(),
  ]);

  const records = mergeAllGovernedRecords(projects, proposals, branches, tasks, featurePacks);
  await dbSaveGovernedMemories(records);
  return records;
}

function scoreMemory(query: string, record: GovernedMemoryRecord): number {
  const q = query.toLowerCase();
  const text = `${asPlainText(record.title)} ${asPlainText(record.content)}`.toLowerCase();
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  let score = 0;
  for (const w of words) {
    if (text.includes(w)) score += 2;
  }
  if (record.resourceType === "project_brain") score += 8;
  if (plainTextLower(record.title).includes(q.slice(0, 24))) score += 5;
  return score;
}

function rankMemoriesForQuery(records: GovernedMemoryRecord[], prompt: string): GovernedMemoryRecord[] {
  const scored = records
    .map((r) => ({ record: r, score: scoreMemory(prompt, r) }))
    .sort((a, b) => b.score - a.score);

  const brain = scored.find((x) => x.record.resourceType === "project_brain")?.record;
  const top = scored
    .filter((x) => x.score > 0)
    .slice(0, 8)
    .map((x) => x.record);

  if (brain && !top.some((r) => r.id === brain.id)) {
    top.unshift(brain);
  }

  if (top.length === 0) {
    return scored.slice(0, 6).map((x) => x.record);
  }

  return top.slice(0, 8);
}

export interface MemoryAskResult {
  answer: string;
  provider?: string;
  model?: string;
  memoriesUsed: number;
  memoriesFiltered: number;
  accessDenied: boolean;
  message?: string;
  llmFallback?: boolean;
}

/**
 * Permission-governed memory retrieval → LLM.
 * Flow: candidates → permission filter → only authorised context to LLM.
 * LLM NEVER decides permissions.
 */
export async function askWithGovernedMemory(
  userId: string,
  projectId: string,
  prompt: string
): Promise<MemoryAskResult> {
  const user = getTeamMember(userId);
  if (!user) {
    return { answer: "", accessDenied: true, memoriesUsed: 0, memoriesFiltered: 0, message: "Unknown user" };
  }

  let records = await syncGovernedMemoryRegistry();
  records = records.filter((r) => r.permissions.projectId === projectId);

  const registry = new Map(records.map((r) => [r.id, r]));
  const auditBatch: PermissionAuditLog[] = [];

  const candidates = rankMemoriesForQuery(records, prompt);
  const { accessible, decisions } = filterAccessibleMemory(user, candidates, "query");

  for (const record of candidates) {
    const result = canAccess(user, record, "query", registry);
    auditBatch.push({
      id: uuid(),
      ...buildAuditLog(user, record, "query", result),
      timestamp: new Date().toISOString(),
    });
  }

  await dbSavePermissionAuditLogs(auditBatch);

  const memoriesFiltered = candidates.length - accessible.length;

  const projectBrain = accessible.find((r) => r.resourceType === "project_brain");
  const vision = projectBrain?.content ?? "";

  if (
    accessible.length === 0 &&
    candidates.some((c) => !decisions.find((d) => d.resourceId === c.resourceId && d.granted))
  ) {
    return {
      answer: "",
      accessDenied: true,
      memoriesUsed: 0,
      memoriesFiltered,
      message:
        "Access Denied. No authorised organisational memory is available for your role. Permissions are enforced before AI retrieval — restricted content is never sent to the LLM.",
    };
  }

  const memoryContext = accessible
    .slice(0, 8)
    .map((m) => `[${m.resourceType}] ${m.title}: ${m.content.slice(0, 500)}`)
    .join("\n\n");

  const system = [
    "You are the Project Brain assistant for an engineering decision platform.",
    `The user's role is ${user.memoryRole}. Answer ONLY using the authorised organisational memory below.`,
    "Directly address the user's specific question — do not give a generic project summary unless they asked for one.",
    "If the memory does not contain enough detail, say what is known and what is missing.",
    "Do NOT mention or hint at restricted resources the user cannot access.",
    vision ? `Project vision (authoritative): ${vision}` : "",
    memoryContext ? `\nAuthorised organisational memory:\n${memoryContext}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const result = await chat(prompt, { system, maxTokens: 600, temperature: 0.75 });
    return {
      answer: result.text,
      provider: result.provider,
      model: result.model,
      memoriesUsed: accessible.length,
      memoriesFiltered,
      accessDenied: false,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "LLM unavailable";
    const excerpt = accessible
      .slice(0, 3)
      .map((m) => `• ${m.title}: ${m.content.slice(0, 120)}…`)
      .join("\n");

    return {
      answer: excerpt
        ? `I could not reach an LLM provider (${detail}). Based on authorised memory only:\n\n${excerpt}\n\nConfigure an API key in .env.local and run npm run test:llm.`
        : `LLM unavailable (${detail}). No authorised memory matched your question.`,
      memoriesUsed: accessible.length,
      memoriesFiltered,
      accessDenied: false,
      llmFallback: true,
      message: detail,
    };
  }
}

export async function getGovernanceDashboard(userId: string, projectId?: string) {
  const user = getTeamMember(userId);
  if (!user) throw new Error("Unknown user");

  let records = projectId ? await dbGetGovernedMemories(projectId) : await dbGetGovernedMemories();
  if (records.length === 0) records = await syncGovernedMemoryRegistry();
  if (projectId) records = records.filter((r) => r.permissions.projectId === projectId);

  const { accessible, decisions } = filterAccessibleMemory(user, records, "read");
  const restricted = records.filter((r) => !accessible.some((a) => a.id === r.id));

  const auditLogs = await dbGetPermissionAuditLogs({ userId, projectId, limit: 50 });

  const lineage = records.map((r) => ({
    id: r.id,
    title: r.title,
    type: r.resourceType,
    label: r.lineage.label,
    parent: r.lineage.parentResourceId
      ? `${r.lineage.parentResourceType}:${r.lineage.parentResourceId}`
      : null,
    visibility: r.permissions.visibility,
  }));

  return {
    user: { id: user.id, name: user.name, memoryRole: user.memoryRole, workflowRole: user.role },
    accessible,
    restricted: restricted.map((r) => ({
      id: r.id,
      resourceId: r.resourceId,
      resourceType: r.resourceType,
      title: r.title,
      visibility: r.permissions.visibility,
      unlockAt: r.permissions.unlockAt,
      lineage: r.lineage.label,
    })),
    decisions,
    auditLogs,
    lineage,
    stats: {
      total: records.length,
      accessible: accessible.length,
      restricted: restricted.length,
    },
  };
}
