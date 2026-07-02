import type { Proposal, ProjectBrain } from "@/lib/types";
import { dbGetBranch, dbGetProject } from "@/lib/db/repository";

/** Shared helpers for impact agent (avoids circular import with orchestrator) */

export async function getTargetBrainForProposal(proposal: Proposal): Promise<ProjectBrain> {
  if (proposal.targetType === "branch" && proposal.targetBranchId) {
    const branch = await dbGetBranch(proposal.targetBranchId);
    if (!branch) throw new Error("Target branch not found");
    return branch.mergedBrain;
  }
  if (!proposal.targetProjectId) throw new Error("Target project not set");
  const project = await dbGetProject(proposal.targetProjectId);
  if (!project) throw new Error("Project not found");
  return project;
}

export async function getTargetLabelForProposal(proposal: Proposal): Promise<string> {
  if (proposal.targetType === "branch" && proposal.targetBranchId) {
    const branch = await dbGetBranch(proposal.targetBranchId);
    const project = branch ? await dbGetProject(branch.projectId) : null;
    return project ? `${project.name} → ${branch?.name}` : `branch "${branch?.name}"`;
  }
  const project = proposal.targetProjectId ? await dbGetProject(proposal.targetProjectId) : null;
  return project ? `project "${project.name}"` : "main idea";
}
