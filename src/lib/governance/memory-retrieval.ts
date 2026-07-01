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
  const text = `${record.title} ${record.content}`.toLowerCase();
  const words = q.split(/\s+/).filter((w) => w.length > 3);
  let score = 0;
  for (const w of words) {
    if (text.includes(w)) score += 2;
  }
  if (record.title.toLowerCase().includes(q.slice(0, 20))) score += 5;
  return score;
}

export interface MemoryAskResult {
  answer: string;
  provider?: string;
  memoriesUsed: number;
  memoriesFiltered: number;
  accessDenied: boolean;
  message?: string;
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

  let records = await dbGetGovernedMemories(projectId);
  if (records.length === 0) {
    records = await syncGovernedMemoryRegistry();
    records = records.filter((r) => r.permissions.projectId === projectId);
  }

  const registry = new Map(records.map((r) => [r.id, r]));
  const auditBatch: PermissionAuditLog[] = [];

  // Score and rank candidates BEFORE permission filter (permission layer removes restricted)
  const candidates = records
    .map((r) => ({ record: r, score: scoreMemory(prompt, r) }))
    .filter((x) => x.score > 0 || records.length <= 8)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((x) => x.record);

  const { accessible, decisions } = filterAccessibleMemory(user, candidates, "query");

  for (let i = 0; i < candidates.length; i++) {
    const record = candidates[i];
    const decision = decisions.find((d) => d.resourceId === record.resourceId);
    const result = canAccess(user, record, "query", registry);
    auditBatch.push({
      id: uuid(),
      ...buildAuditLog(user, record, "query", result),
      timestamp: new Date().toISOString(),
    });
    void decision;
  }

  await dbSavePermissionAuditLogs(auditBatch);

  const memoriesFiltered = candidates.length - accessible.length;

  const projectBrain = accessible.find((r) => r.resourceType === "project_brain");
  const vision = projectBrain?.content ?? "";

  if (accessible.length === 0 && candidates.some((c) => !decisions.find((d) => d.resourceId === c.resourceId && d.granted))) {
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
    .slice(0, 6)
    .map((m) => `[${m.resourceType}] ${m.title}: ${m.content.slice(0, 400)}`)
    .join("\n\n");

  const system = [
    `You are the permission-governed Project Brain assistant.`,
    `User role: ${user.memoryRole}. Only the following AUTHORISED memories were retrieved after deterministic permission filtering.`,
    `Do NOT mention or hint at restricted/confidential resources the user cannot access.`,
    `Project vision: ${vision}`,
    memoryContext ? `\nAuthorised organisational memory:\n${memoryContext}` : "",
  ].join("\n");

  try {
    const result = await chat(prompt, { system, maxTokens: 400 });
    return {
      answer: result.text,
      provider: result.provider,
      memoriesUsed: accessible.length,
      memoriesFiltered,
      accessDenied: false,
    };
  } catch {
    return {
      answer: vision
        ? `Based on authorised project vision only: ${vision.slice(0, 300)}… (LLM unavailable — permission filter still applied; ${accessible.length} memories authorised, ${memoriesFiltered} filtered.)`
        : "LLM unavailable. Permission filtering completed successfully.",
      memoriesUsed: accessible.length,
      memoriesFiltered,
      accessDenied: false,
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
