import { v4 as uuid } from "uuid";
import { plainTextLower } from "@/lib/utils/text";
import type {
  DecisionBranch,
  FeaturePack,
  GovernedMemoryRecord,
  ImplementationTask,
  MemoryResourceType,
  MemoryVisibility,
  PermissionMetadata,
  ProjectBrain,
  Proposal,
} from "@/lib/types";

const ORG_ID = "org-andex-demo";

function basePermissions(
  projectId: string,
  ownerId: string,
  visibility: MemoryVisibility,
  allowedRoles: PermissionMetadata["allowedRoles"],
  extras: Partial<PermissionMetadata> = {}
): PermissionMetadata {
  const now = new Date().toISOString();
  return {
    organisationId: ORG_ID,
    projectId,
    ownerId,
    visibility,
    allowedRoles,
    createdBy: ownerId,
    createdAt: now,
    updatedAt: now,
    ...extras,
  };
}

function proposalVisibility(proposal: Proposal): MemoryVisibility {
  if (proposal.status === "accepted") return "internal";
  const title = plainTextLower(proposal.title);
  if (title.includes("leadership") || title.includes("confidential")) {
    return "leadership";
  }
  if (["under_review", "consensus_pending", "ready_for_manager", "impact_analyzed"].includes(proposal.status)) {
    return "confidential";
  }
  return "internal";
}

function recordId(resourceType: MemoryResourceType, resourceId: string): string {
  return `${resourceType}:${resourceId}`;
}

export function buildGovernedRecordsFromProject(project: ProjectBrain): GovernedMemoryRecord[] {
  const now = new Date().toISOString();
  const records: GovernedMemoryRecord[] = [];

  records.push({
    id: recordId("project_brain", project.id),
    resourceId: project.id,
    resourceType: "project_brain",
    title: project.name,
    content: project.vision,
    permissions: basePermissions(project.id, project.createdBy, "public", ["manager", "developer", "intern"]),
    lineage: { derivedFromIds: [], label: "Project Brain — approved direction" },
    createdAt: now,
    updatedAt: now,
  });

  for (const mem of project.institutionalMemory ?? []) {
    records.push({
      id: recordId("institutional_memory", mem.id),
      resourceId: mem.id,
      resourceType: "institutional_memory",
      title: mem.title,
      content: mem.content,
      permissions: basePermissions(
        project.id,
        project.createdBy,
        mem.source === "proposal" ? "internal" : "public",
        ["manager", "developer"],
        {
          sourceResourceId: mem.decisionId,
          sourceResourceType: mem.decisionId ? "proposal" : undefined,
          derivedFromIds: mem.decisionId ? [mem.decisionId] : [],
        }
      ),
      lineage: {
        parentResourceId: mem.decisionId,
        parentResourceType: mem.decisionId ? "proposal" : undefined,
        derivedFromIds: mem.decisionId ? [mem.decisionId] : [],
        label: mem.decisionId ? "Institutional memory ← accepted proposal" : "Institutional memory ← manual",
      },
      createdAt: mem.createdAt,
      updatedAt: now,
    });
  }

  // Demo seed: leadership notes with 30-day temporal lock (or past unlock for demo)
  const unlockAt = new Date(Date.now() + 30 * 86400000).toISOString(); // locked 30 days — temporal demo
  records.push({
    id: recordId("organisational_note", `leadership-${project.id}`),
    resourceId: `leadership-${project.id}`,
    resourceType: "organisational_note",
    title: "Leadership Strategy Notes",
    content:
      "Confidential: Q3 pricing strategy, acquisition targets, and unreleased roadmap priorities. Not for general engineering distribution.",
    permissions: basePermissions(project.id, project.createdBy, "leadership", ["manager"], {
      unlockAt,
      allowedRoles: ["manager", "developer"],
      classification: "leadership-meeting-notes",
    }),
    lineage: { derivedFromIds: [], label: "Leadership meeting notes" },
    createdAt: now,
    updatedAt: now,
  });

  return records;
}

export function buildGovernedRecordsFromProposal(proposal: Proposal): GovernedMemoryRecord[] {
  const now = new Date().toISOString();
  const visibility = proposalVisibility(proposal);
  const allowedRoles: PermissionMetadata["allowedRoles"] =
    visibility === "public"
      ? ["manager", "developer", "intern"]
      : visibility === "internal"
        ? ["manager", "developer"]
        : ["manager"];

  const records: GovernedMemoryRecord[] = [
    {
      id: recordId("proposal", proposal.id),
      resourceId: proposal.id,
      resourceType: "proposal",
      title: proposal.title,
      content: proposal.description,
      permissions: basePermissions(proposal.projectId, proposal.authorId, visibility, allowedRoles, {
        sourceResourceId: proposal.targetProjectId,
        sourceResourceType: "project_brain",
      }),
      lineage: {
        parentResourceId: proposal.targetProjectId,
        parentResourceType: "project_brain",
        derivedFromIds: [],
        label: "Engineering proposal",
      },
      createdAt: proposal.createdAt,
      updatedAt: now,
    },
  ];

  if (proposal.review?.teamSummary) {
    records.push({
      id: recordId("ai_summary", `review-${proposal.id}`),
      resourceId: `review-${proposal.id}`,
      resourceType: "ai_summary",
      title: `AI Review Summary: ${proposal.title}`,
      content: `${proposal.review.teamSummary}\nPros: ${proposal.review.pros.join("; ")}\nCons: ${proposal.review.cons.join("; ")}`,
      permissions: basePermissions(proposal.projectId, proposal.authorId, visibility, allowedRoles, {
        sourceResourceId: proposal.id,
        sourceResourceType: "proposal",
        derivedFromIds: [proposal.id],
      }),
      lineage: {
        parentResourceId: proposal.id,
        parentResourceType: "proposal",
        derivedFromIds: [proposal.id],
        label: "AI Summary ← generated from Proposal",
      },
      createdAt: proposal.updatedAt,
      updatedAt: now,
    });
  }

  records.push({
    id: recordId("embedding", `emb-${proposal.id}`),
    resourceId: `emb-${proposal.id}`,
    resourceType: "embedding",
    title: `Embedding vector: ${proposal.title}`,
    content: `[vector] Semantic embedding of proposal "${proposal.title}" for retrieval.`,
    permissions: basePermissions(proposal.projectId, proposal.authorId, visibility, allowedRoles, {
      sourceResourceId: proposal.id,
      sourceResourceType: "proposal",
      derivedFromIds: [proposal.id],
    }),
    lineage: {
      parentResourceId: proposal.id,
      parentResourceType: "proposal",
      derivedFromIds: [proposal.id],
      label: "Embedding ← generated from Proposal",
    },
    createdAt: proposal.updatedAt,
    updatedAt: now,
  });

  return records;
}

export function buildGovernedRecordsFromFeaturePack(pack: FeaturePack): GovernedMemoryRecord[] {
  const now = new Date().toISOString();
  const visibility: MemoryVisibility = pack.status === "promoted" ? "internal" : "public";
  const allowedRoles: PermissionMetadata["allowedRoles"] =
    visibility === "public" ? ["manager", "developer", "intern"] : ["manager", "developer"];

  return [
    {
      id: recordId("feature_pack", pack.id),
      resourceId: pack.id,
      resourceType: "feature_pack",
      title: pack.title,
      content: `${pack.summary}\nSuggested: ${pack.suggestedFeature}`,
      permissions: basePermissions(pack.projectId, "system", visibility, allowedRoles, {
        derivedFromIds: pack.feedbackIds,
      }),
      lineage: {
        derivedFromIds: pack.feedbackIds,
        label: "Feature Pack ← generated from App Reviews / feedback",
      },
      createdAt: pack.createdAt,
      updatedAt: now,
    },
  ];
}

export function buildGovernedRecordsFromBranch(branch: DecisionBranch): GovernedMemoryRecord[] {
  const now = new Date().toISOString();
  return [
    {
      id: recordId("decision_branch", branch.id),
      resourceId: branch.id,
      resourceType: "decision_branch",
      title: branch.name,
      content: `Decision branch from proposal "${branch.proposalTitle}" — status: ${branch.status}`,
      permissions: basePermissions(branch.projectId, "system", "internal", ["manager", "developer"], {
        sourceResourceId: branch.seedProposalId,
        sourceResourceType: "proposal",
      }),
      lineage: {
        parentResourceId: branch.seedProposalId,
        parentResourceType: "proposal",
        derivedFromIds: [branch.seedProposalId],
        label: "Decision Branch ← accepted proposal",
      },
      createdAt: branch.createdAt,
      updatedAt: now,
    },
  ];
}

export function buildGovernedRecordsFromTask(task: ImplementationTask, projectId: string): GovernedMemoryRecord {
  const now = new Date().toISOString();
  return {
    id: recordId("implementation_task", task.id),
    resourceId: task.id,
    resourceType: "implementation_task",
    title: task.title,
    content: task.description,
    permissions: basePermissions(projectId, "system", "internal", ["manager", "developer"], {
      sourceResourceId: task.proposalId,
      sourceResourceType: task.proposalId ? "proposal" : undefined,
    }),
    lineage: {
      parentResourceId: task.proposalId,
      parentResourceType: task.proposalId ? "proposal" : undefined,
      derivedFromIds: task.proposalId ? [task.proposalId] : [],
      label: "Implementation Task ← accepted proposal",
    },
    createdAt: task.createdAt,
    updatedAt: now,
  };
}

export function mergeAllGovernedRecords(
  projects: ProjectBrain[],
  proposals: Proposal[],
  branches: DecisionBranch[],
  tasks: ImplementationTask[],
  featurePacks: FeaturePack[]
): GovernedMemoryRecord[] {
  const map = new Map<string, GovernedMemoryRecord>();

  const add = (records: GovernedMemoryRecord[]) => {
    for (const r of records) map.set(r.id, r);
  };

  for (const p of projects) add(buildGovernedRecordsFromProject(p));
  for (const p of proposals) add(buildGovernedRecordsFromProposal(p));
  for (const b of branches) add(buildGovernedRecordsFromBranch(b));
  for (const fp of featurePacks) add(buildGovernedRecordsFromFeaturePack(fp));

  const branchProject = new Map(branches.map((b) => [b.id, b.projectId]));
  for (const t of tasks) {
    const projectId = branchProject.get(t.branchId) ?? projects[0]?.id ?? "unknown";
    add([buildGovernedRecordsFromTask(t, projectId)]);
  }

  return [...map.values()];
}

export function newAuditId(): string {
  return uuid();
}
