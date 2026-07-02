import { v4 as uuid } from "uuid";
import { canManage, canVote, getTeamMember } from "@/lib/auth/team";
import {
  dbGetProjects,
  dbGetProject,
  dbSaveProject,
  dbGetProposals,
  dbGetProposal,
  dbSaveProposal,
  dbGetBranches,
  dbGetBranch,
  dbSaveBranch,
  dbGetTasks,
  dbSaveTask,
  dbSaveTasks,
  dbSaveAgentLog,
  dbGetAgentLogs,
  dbSaveDriftAlerts,
  dbGetDriftAlerts,
  dbSaveFeedbackItems,
  dbGetFeedbackItems,
  dbSaveFeaturePacks,
  dbGetFeaturePacks,
  dbGetFeaturePack,
  dbSaveFeaturePack,
  dbClearDiscoveryForProject,
  dbClearProjectData,
  dbGetCouncilRunsForProposal,
} from "@/lib/db/repository";
import { runProductDiscoveryAgent, featurePackToProposalText } from "@/lib/agents/product-discovery";
import { analyzeAndStoreImpact } from "@/lib/agents/impact-agent";
import { runPlanningCouncil } from "@/lib/councils/planning-council";
import { buildResourcePlan, assignTasksFromResources } from "@/lib/engines/resource-engine";
import { refreshProjectPriorities } from "@/lib/engines/priority-service";
import {
  councilsCompleteForProposal,
  updateMemoryOnProposalAccept,
} from "@/lib/proposals/proposal-workflow";
import { getMockFeedback } from "@/lib/discovery/mock-feedback";
import type {
  AgentLog,
  AgentName,
  DecisionBranch,
  DiscoveryResult,
  DriftAlert,
  FeaturePack,
  FeedbackItem,
  ImpactAnalysis,
  ImplementationTask,
  PipelineResult,
  ProjectBrain,
  Proposal,
  ProposalContext,
  ProposalTarget,
  ReviewAnalysis,
  Vote,
} from "@/lib/types";
import { universityBrain, UNIVERSITY_PROPOSALS, DIVERGENT_TASK } from "@/lib/fixtures/university";

async function log(agent: AgentName, action: string, input: string, output: string, proposalId?: string): Promise<AgentLog> {
  const entry: AgentLog = { id: uuid(), agent, action, input, output, proposalId, timestamp: new Date().toISOString() };
  await dbSaveAgentLog(entry);
  return entry;
}

async function getProjectById(projectId: string): Promise<ProjectBrain> {
  const project = await dbGetProject(projectId);
  if (!project) throw new Error("Project not found");
  return project;
}

async function getTargetBrain(proposal: Proposal): Promise<ProjectBrain> {
  if (proposal.targetType === "branch" && proposal.targetBranchId) {
    const branch = await dbGetBranch(proposal.targetBranchId);
    if (!branch) throw new Error("Target branch not found");
    return branch.mergedBrain;
  }
  if (!proposal.targetProjectId) throw new Error("Target project not set");
  return getProjectById(proposal.targetProjectId);
}

async function getTargetLabel(proposal: Proposal): Promise<string> {
  if (proposal.targetType === "branch" && proposal.targetBranchId) {
    const branch = await dbGetBranch(proposal.targetBranchId);
    const project = branch ? await dbGetProject(branch.projectId) : null;
    return project ? `${project.name} → ${branch?.name}` : `branch "${branch?.name}"`;
  }
  const project = proposal.targetProjectId ? await dbGetProject(proposal.targetProjectId) : null;
  return project ? `project "${project.name}"` : "main idea";
}

function mergeProposalIntoBrain(base: ProjectBrain, proposal: Proposal): ProjectBrain {
  const merged = JSON.parse(JSON.stringify(base)) as ProjectBrain;
  const versionParts = merged.currentVersion.split(".").map(Number);
  versionParts[2] += 1;
  merged.currentVersion = versionParts.join(".");
  merged.institutionalMemory.push({
    id: uuid(),
    title: proposal.title,
    content: proposal.description,
    source: "proposal",
    decisionId: proposal.id,
    createdAt: new Date().toISOString(),
  });
  merged.goals = [...merged.goals, `Add: ${proposal.title}`];
  merged.updatedAt = new Date().toISOString();
  return merged;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function getProjects(): Promise<ProjectBrain[]> {
  return dbGetProjects();
}

export async function getProject(projectId: string): Promise<ProjectBrain | undefined> {
  return dbGetProject(projectId);
}

export async function getMainIdea(): Promise<ProjectBrain | null> {
  const projects = await dbGetProjects();
  return projects[0] ?? null;
}

export async function getProjectBrain(): Promise<ProjectBrain | null> {
  return getMainIdea();
}

export async function createProject(
  managerId: string,
  name: string,
  vision: string,
  goals: string[] = [],
  functionalRequirements: string[] = [],
  nonFunctionalRequirements: string[] = []
): Promise<ProjectBrain> {
  const manager = getTeamMember(managerId);
  if (!manager || !canManage(manager.role)) throw new Error("Only managers can create projects");

  const project: ProjectBrain = {
    id: uuid(),
    name,
    vision,
    goals: goals.length ? goals : ["Deliver the project vision"],
    functionalRequirements,
    nonFunctionalRequirements,
    architecture: [],
    institutionalMemory: [],
    currentVersion: "1.0.0",
    createdBy: managerId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await dbSaveProject(project);
  await log("project_brain", "create", name, "Project created by manager");
  return project;
}

export async function updateProject(
  managerId: string,
  projectId: string,
  updates: {
    name?: string;
    vision?: string;
    goals?: string[];
    functionalRequirements?: string[];
    nonFunctionalRequirements?: string[];
  }
): Promise<ProjectBrain> {
  const manager = getTeamMember(managerId);
  if (!manager || !canManage(manager.role)) throw new Error("Only managers can edit projects");

  const project = await getProjectById(projectId);
  const updated = { ...project, ...updates, updatedAt: new Date().toISOString() };
  await dbSaveProject(updated);
  await log("project_brain", "update", projectId, "Project updated by manager");
  return updated;
}

// ─── Proposals ───────────────────────────────────────────────────────────────

export async function createProposal(
  title: string,
  description: string,
  authorId: string,
  authorName: string,
  targetType: ProposalTarget,
  targetProjectId?: string,
  targetBranchId?: string
): Promise<Proposal> {
  let projectId: string;

  if (targetType === "main") {
    if (!targetProjectId) throw new Error("targetProjectId required when adding to a project");
    await getProjectById(targetProjectId);
    projectId = targetProjectId;
  } else {
    if (!targetBranchId) throw new Error("targetBranchId required for branch suggestions");
    const branch = await dbGetBranch(targetBranchId);
    if (!branch) throw new Error("Branch not found");
    if (!["open", "implementing"].includes(branch.status)) {
      throw new Error("Can only add suggestions to open or implementing branches");
    }
    projectId = branch.projectId;
  }

  const proposal: Proposal = {
    id: uuid(),
    title,
    description,
    authorId,
    authorName,
    status: "draft",
    targetType,
    targetProjectId: targetType === "main" ? targetProjectId : undefined,
    targetBranchId: targetType === "branch" ? targetBranchId : undefined,
    projectId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await dbSaveProposal(proposal);
  const label = await getTargetLabel(proposal);
  await log("proposal", "create", title, `Suggestion for ${label}`, proposal.id);
  return proposal;
}

async function gatherContext(proposal: Proposal): Promise<ProposalContext> {
  const targetLabel = await getTargetLabel(proposal);
  const targetBrain = await getTargetBrain(proposal);
  const allProposals = await dbGetProposals({ projectId: proposal.projectId });

  const relatedDecisions = allProposals
    .filter((p) => p.status === "accepted" && p.id !== proposal.id)
    .slice(-5)
    .map((p) => p.title);

  const keywords = proposal.description.toLowerCase().split(/\s+/);
  const relatedArchitecture = targetBrain.architecture
    .filter((a) => keywords.some((k) => a.name.toLowerCase().includes(k) || a.description.toLowerCase().includes(k)))
    .map((a) => a.name);

  const duplicates = allProposals
    .filter((p) => p.id !== proposal.id && !["rejected", "archived"].includes(p.status))
    .filter((p) => p.title.toLowerCase().slice(0, 12) === proposal.title.toLowerCase().slice(0, 12))
    .map((p) => p.title);

  const context: ProposalContext = {
    relatedDecisions,
    relatedArchitecture,
    duplicates,
    targetLabel,
    summary: `Suggestion for ${targetLabel}. Compared against "${targetBrain.name}" — ${relatedArchitecture.length} components may be affected.`,
  };

  proposal.context = context;
  proposal.status = "context_gathered";
  proposal.updatedAt = new Date().toISOString();
  await dbSaveProposal(proposal);
  await log("proposal", "gather_context", proposal.title, context.summary, proposal.id);
  return context;
}

async function analyzeImpact(proposal: Proposal, userId?: string): Promise<ImpactAnalysis> {
  const fresh = await dbGetProposal(proposal.id);
  if (!fresh) throw new Error("Proposal not found");
  return analyzeAndStoreImpact(fresh, userId);
}

async function generateReview(proposal: Proposal): Promise<ReviewAnalysis> {
  const fresh = await dbGetProposal(proposal.id);
  if (!fresh?.impact?.structured) {
    throw new Error("Review Agent requires LLM-generated impact analysis");
  }

  const structured = fresh.impact.structured;
  const targetLabel = await getTargetLabel(fresh);

  const pros = structured.tradeOffs.map((t) => t.benefit).filter(Boolean);
  if (pros.length === 0 && structured.summary) pros.push(structured.summary.slice(0, 120));

  const cons = structured.tradeOffs.map((t) => t.cost).filter(Boolean);
  const risks = structured.risks.map((r) => `${r.risk} (severity: ${r.severity}, likelihood: ${r.likelihood}) — mitigation: ${r.mitigation}`);
  const tradeoffs = structured.tradeOffs.map(
    (t) =>
      `${t.benefit} ↔ ${t.cost}${t.affectedStakeholders.length ? ` [${t.affectedStakeholders.join(", ")}]` : ""}`
  );

  const questions = [
    ...structured.implementationNotes.slice(0, 2).map((n) => `Implementation: ${n}`),
    ...structured.rollbackConsiderations.slice(0, 1).map((r) => `Rollback: ${r}`),
    `Does this align with ${targetLabel} given recommendation "${structured.recommendation}"?`,
  ];

  const review: ReviewAnalysis = {
    pros: pros.length ? pros : [`Addresses: ${fresh.title}`],
    cons: cons.length ? cons : ["Scope and trade-offs require team discussion"],
    risks,
    tradeoffs: tradeoffs.length ? tradeoffs : structured.dependencies.map((d) => d.dependency),
    questions,
    suggestedReviewers: [
      ...new Set(
        structured.tradeOffs.flatMap((t) => t.affectedStakeholders).filter(Boolean)
      ),
    ].slice(0, 5),
    teamSummary: `${structured.summary} Impact Agent recommendation: ${structured.recommendation.replace(/_/g, " ")}. ${structured.reasoning.slice(0, 280)}${structured.reasoning.length > 280 ? "…" : ""}`,
  };

  fresh.review = review;
  fresh.status = "under_review";
  fresh.updatedAt = new Date().toISOString();
  await dbSaveProposal(fresh);
  await log("review", "generate", fresh.title, review.teamSummary, fresh.id);
  return review;
}

// ─── Voting ──────────────────────────────────────────────────────────────────

async function assertProposalGovernanceForVote(proposal: Proposal): Promise<void> {
  if (!proposal.impact) throw new Error("Impact analysis must complete before voting");
  const runs = await dbGetCouncilRunsForProposal(proposal.id);
  if (!councilsCompleteForProposal(runs)) {
    throw new Error("Planning, Testing, and Evaluation councils must complete before consensus");
  }
}

async function assertProposalGovernanceForAccept(proposal: Proposal): Promise<void> {
  if (!proposal.impact) throw new Error("Impact analysis required before manager approval");
  const runs = await dbGetCouncilRunsForProposal(proposal.id);
  if (!councilsCompleteForProposal(runs)) {
    throw new Error("All enterprise councils must complete before manager approval");
  }
  if (proposal.status !== "ready_for_manager") {
    throw new Error("Team consensus must reach ready for manager before approval");
  }
}

export async function castVote(
  proposalId: string,
  userId: string,
  userName: string,
  vote: Vote["vote"],
  comment?: string
): Promise<Proposal> {
  const member = getTeamMember(userId);
  if (!member || !canVote(member.role)) throw new Error("Only workers can vote on suggestions");

  const proposal = await dbGetProposal(proposalId);
  if (!proposal) throw new Error("Proposal not found");
  if (!["under_review", "consensus_pending", "needs_discussion"].includes(proposal.status)) {
    throw new Error("This suggestion is not open for voting");
  }
  await assertProposalGovernanceForVote(proposal);

  if (!proposal.votes) proposal.votes = [];
  const idx = proposal.votes.findIndex((v) => v.userId === userId);
  const entry: Vote = { userId, userName, vote, comment, createdAt: new Date().toISOString() };
  if (idx >= 0) proposal.votes[idx] = entry;
  else proposal.votes.push(entry);

  proposal.status = "consensus_pending";
  proposal.updatedAt = new Date().toISOString();
  await dbSaveProposal(proposal);
  await log("consensus", "vote", `${userName}: ${vote}`, comment ?? "", proposalId);
  return proposal;
}

export async function tallyVotes(proposalId: string): Promise<Proposal> {
  const proposal = await dbGetProposal(proposalId);
  if (!proposal?.votes?.length) throw new Error("No votes recorded");

  const approvals = proposal.votes.filter((v) => v.vote === "approve" || v.vote === "approve_with_comments").length;
  const rejections = proposal.votes.filter((v) => v.vote === "reject").length;
  const discussions = proposal.votes.filter((v) => v.vote === "needs_discussion").length;

  // Conservative human-in-the-loop governance: any needs_discussion vote or a
  // rejection majority sends the suggestion back to the team; a tie stays
  // pending for a human tie-break. Only a clear approval majority reaches the
  // manager — and even then the manager still decides (never auto-approved).
  if (discussions > 0) proposal.status = "needs_discussion";
  else if (rejections > approvals) proposal.status = "needs_discussion";
  else if (approvals === rejections) proposal.status = "consensus_pending";
  else proposal.status = "ready_for_manager";

  proposal.updatedAt = new Date().toISOString();
  await dbSaveProposal(proposal);
  await log(
    "consensus",
    "tally",
    proposalId,
    `${approvals} approve, ${rejections} reject, ${discussions} needs-discussion → ${proposal.status}`,
    proposalId
  );
  return proposal;
}

// ─── Manager decisions ───────────────────────────────────────────────────────

export async function managerAcceptProposal(proposalId: string, managerId: string, note?: string): Promise<PipelineResult> {
  const manager = getTeamMember(managerId);
  if (!manager || !canManage(manager.role)) throw new Error("Only managers can accept or decline suggestions");

  const proposal = await dbGetProposal(proposalId);
  if (!proposal) throw new Error("Proposal not found");
  await assertProposalGovernanceForAccept(proposal);

  proposal.managerDecision = "accepted";
  proposal.managerNote = note;
  proposal.status = "accepted";
  proposal.updatedAt = new Date().toISOString();
  await dbSaveProposal(proposal);
  await updateMemoryOnProposalAccept(proposal);
  await log("consensus", "accept", proposal.title, note ?? "Accepted by manager", proposalId);

  if (proposal.targetType === "main") {
    const branch = await createDecisionBranch(proposal);
    await runPlanningCouncil(proposal.targetProjectId!, branch, proposal);
    await log("planning", "council_run", proposal.title, "Planning Council generated roadmap after manager approval.", proposal.id);
    const logs = (await dbGetAgentLogs()).filter((l) => l.proposalId === proposalId);
    return { proposal, logs, branch };
  }

  const branch = await dbGetBranch(proposal.targetBranchId!);
  if (!branch) throw new Error("Target branch not found");

  branch.mergedBrain = mergeProposalIntoBrain(branch.mergedBrain, proposal);
  branch.version = branch.mergedBrain.currentVersion;
  branch.acceptedProposalIds.push(proposal.id);
  proposal.branchId = branch.id;
  await dbSaveBranch(branch);
  await dbSaveProposal(proposal);

  let tasks: ImplementationTask[] = [];
  if (branch.status === "implementing") {
    tasks = await applyRequirementChangeDuringImplementation(proposal, branch);
  }

  await log("branch", "add_suggestion", proposal.title, `Added to ${branch.name}. Project unchanged.`, proposal.id);
  const logs = (await dbGetAgentLogs()).filter((l) => l.proposalId === proposalId);
  return { proposal, logs, branch, tasks };
}

export async function managerDeclineProposal(proposalId: string, managerId: string, note?: string): Promise<Proposal> {
  const manager = getTeamMember(managerId);
  if (!manager || !canManage(manager.role)) throw new Error("Only managers can accept or decline suggestions");

  const proposal = await dbGetProposal(proposalId);
  if (!proposal) throw new Error("Proposal not found");

  proposal.managerDecision = "declined";
  proposal.managerNote = note;
  proposal.status = "rejected";
  proposal.updatedAt = new Date().toISOString();
  await dbSaveProposal(proposal);
  await log("consensus", "decline", proposal.title, note ?? "Declined by manager", proposalId);
  return proposal;
}

// ─── Branches ────────────────────────────────────────────────────────────────

async function createDecisionBranch(proposal: Proposal): Promise<DecisionBranch> {
  const project = await getProjectById(proposal.targetProjectId!);
  const mergedBrain = mergeProposalIntoBrain(project, proposal);

  const branch: DecisionBranch = {
    id: uuid(),
    projectId: project.id,
    name: `branch/${proposal.title.toLowerCase().replace(/\s+/g, "-").slice(0, 28)}`,
    seedProposalId: proposal.id,
    proposalTitle: proposal.title,
    status: "open",
    version: mergedBrain.currentVersion,
    mainVersionAtCreation: project.currentVersion,
    mergedBrain,
    acceptedProposalIds: [proposal.id],
    createdAt: new Date().toISOString(),
  };

  await dbSaveBranch(branch);
  proposal.branchId = branch.id;
  await dbSaveProposal(proposal);
  await log("branch", "create", proposal.title, `Branch for "${project.name}" — project v${project.currentVersion} unchanged.`, proposal.id);
  return branch;
}

export async function startBranchImplementation(branchId: string, managerId: string): Promise<ImplementationTask[]> {
  const manager = getTeamMember(managerId);
  if (!manager || !canManage(manager.role)) throw new Error("Only managers can start implementation");

  const branch = await dbGetBranch(branchId);
  if (!branch) throw new Error("Branch not found");
  if (branch.status !== "open") throw new Error("Branch is not in collecting phase");

  const existingTasks = await dbGetTasks(branchId);
  if (existingTasks.some((t) => t.status !== "cancelled")) {
    throw new Error("Implementation already started for this branch");
  }

  branch.status = "implementing";
  branch.implementingAt = new Date().toISOString();
  await dbSaveBranch(branch);

  const allProposals = await dbGetProposals();
  const acceptedProposals = allProposals.filter((p) => branch.acceptedProposalIds.includes(p.id));
  const allTasks: ImplementationTask[] = [];
  for (const p of acceptedProposals) {
    allTasks.push(...(await generateImplementationTasks(p, branch)));
  }

  const resources = buildResourcePlan({
    requiredSkills: ["Backend", "Frontend", "QA", "DevOps"],
    sprints: [],
    tasks: allTasks,
  });
  const assigned = assignTasksFromResources(allTasks, resources);
  await dbSaveTasks(assigned);

  await refreshProjectPriorities(branch.projectId);
  await log("implementation", "start", branch.name, `${assigned.length} sub-tasks created with resource allocation`, branch.seedProposalId);
  return assigned;
}

export async function mergeBranchToMain(branchId: string, managerId: string): Promise<DecisionBranch> {
  const manager = getTeamMember(managerId);
  if (!manager || !canManage(manager.role)) throw new Error("Only managers can merge to main");

  const branch = await dbGetBranch(branchId);
  if (!branch) throw new Error("Branch not found");
  if (!["open", "implementing"].includes(branch.status)) throw new Error("Branch cannot be merged");

  await dbSaveProject(JSON.parse(JSON.stringify(branch.mergedBrain)));
  branch.status = "merged_to_main";
  branch.mergedAt = new Date().toISOString();
  await dbSaveBranch(branch);
  await log("branch", "merge_to_main", branch.name, `Project updated to v${branch.version}`, branch.seedProposalId);
  return branch;
}

export async function discardBranch(branchId: string, managerId: string): Promise<DecisionBranch> {
  const manager = getTeamMember(managerId);
  if (!manager || !canManage(manager.role)) throw new Error("Only managers can discard branches");

  const branch = await dbGetBranch(branchId);
  if (!branch) throw new Error("Branch not found");
  if (!["open", "implementing"].includes(branch.status)) throw new Error("Branch cannot be discarded");

  branch.status = "discarded";
  branch.discardedAt = new Date().toISOString();
  await dbSaveBranch(branch);

  const project = await dbGetProject(branch.projectId);
  const tasks = await dbGetTasks(branchId);
  for (const task of tasks) {
    if (["pending", "in_progress"].includes(task.status)) {
      task.status = "cancelled";
      task.updatedAt = new Date().toISOString();
      await dbSaveTask(task);
    }
  }

  await log("branch", "discard", branch.name, `Discarded. Project "${project?.name}" remains v${project?.currentVersion}.`, branch.seedProposalId);
  return branch;
}

export async function getBranch(branchId: string): Promise<DecisionBranch | undefined> {
  return dbGetBranch(branchId);
}

export async function getOpenBranches(projectId?: string): Promise<DecisionBranch[]> {
  const branches = await dbGetBranches();
  return branches.filter(
    (b) => ["open", "implementing"].includes(b.status) && (!projectId || b.projectId === projectId)
  );
}

export async function getBranchesForProject(projectId: string): Promise<DecisionBranch[]> {
  const branches = await dbGetBranches();
  return branches.filter((b) => b.projectId === projectId);
}

// ─── Implementation ──────────────────────────────────────────────────────────

async function generateImplementationTasks(proposal: Proposal, branch: DecisionBranch): Promise<ImplementationTask[]> {
  const affected = proposal.impact?.architectureImpact.map((i) => i.target) ?? [];
  const reviewNotes = proposal.review?.pros?.length
    ? `\nTeam review highlights:\n- ${proposal.review.pros.join("\n- ")}`
    : "";

  const descParts = proposal.description
    .split(/[.\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);

  const steps =
    descParts.length >= 2
      ? descParts.slice(0, 5).map((part, i) => ({
          title: `${proposal.title} — step ${i + 1}`,
          desc: `${part}.${reviewNotes && i === 0 ? reviewNotes : ""}`,
        }))
      : [
          {
            title: `Design: ${proposal.title}`,
            desc: `Design solution for accepted suggestion:\n${proposal.description}${reviewNotes}`,
          },
          {
            title: `Implement: ${proposal.title}`,
            desc: `Build per suggestion scope:\n${proposal.description}`,
          },
          {
            title: `Validate: ${proposal.title}`,
            desc: `Test and verify: ${proposal.description}`,
          },
          {
            title: `Document: ${proposal.title}`,
            desc: `Update branch knowledge for: ${proposal.title}`,
          },
        ];

  const tasks: ImplementationTask[] = steps.map((s) => ({
    id: uuid(),
    title: s.title,
    description: s.desc,
    status: "pending",
    branchId: branch.id,
    proposalId: proposal.id,
    affectedComponents: affected,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  await dbSaveTasks(tasks);
  return tasks;
}

async function applyRequirementChangeDuringImplementation(
  proposal: Proposal,
  branch: DecisionBranch
): Promise<ImplementationTask[]> {
  const updated = await updateAffectedTasks(proposal, branch.id);
  const newTasks = await generateImplementationTasks(proposal, branch);
  await log("implementation", "requirements_changed", proposal.title, `${updated.length} updated, ${newTasks.length} new tasks`, proposal.id);
  return [...updated, ...newTasks];
}

async function updateAffectedTasks(proposal: Proposal, branchId: string): Promise<ImplementationTask[]> {
  const affected = new Set(proposal.impact?.architectureImpact.map((i) => i.target) ?? []);
  const updated: ImplementationTask[] = [];
  const tasks = await dbGetTasks(branchId);

  for (const task of tasks) {
    const overlap = task.affectedComponents.some((c) => affected.has(c)) || task.proposalId === proposal.id;
    if (overlap && ["pending", "in_progress"].includes(task.status)) {
      task.description += ` [Requirements updated: ${proposal.title}]`;
      if (task.status === "pending") task.status = "blocked";
      task.updatedAt = new Date().toISOString();
      await dbSaveTask(task);
      updated.push(task);
    }
  }
  return updated;
}

export async function detectDrift(): Promise<DriftAlert[]> {
  const alerts: DriftAlert[] = [];
  const branches = await dbGetBranches();
  const proposals = await dbGetProposals();
  const projects = await dbGetProjects();
  const tasks = await dbGetTasks();
  const now = new Date().toISOString();

  // 1. Pending suggestions piling up on a branch that is already implementing.
  for (const branch of branches.filter((b) => b.status === "implementing")) {
    const pending = proposals.filter(
      (p) => p.targetBranchId === branch.id && ["under_review", "consensus_pending", "ready_for_manager"].includes(p.status)
    );
    if (pending.length > 0) {
      alerts.push({
        id: uuid(),
        projectId: branch.projectId,
        severity: "medium",
        source: "implementation",
        description: `${pending.length} pending suggestion(s) on implementing branch "${branch.name}"`,
        recommendation: "Manager should review before implementation diverges",
        detectedAt: now,
      });
    }
  }

  // 2. Implementation drift: active tasks referencing components that are not
  //    in the relevant brain's architecture (branch brain if the task belongs
  //    to a known branch, otherwise any project brain).
  const activeTasks = tasks.filter((t) => !["completed", "cancelled"].includes(t.status));
  for (const task of activeTasks) {
    const branch = branches.find((b) => b.id === task.branchId);
    const architecture = branch ? branch.mergedBrain.architecture : projects.flatMap((p) => p.architecture);
    const known = new Set(architecture.map((a) => a.name));
    const phantom = task.affectedComponents.filter((c) => !known.has(c));
    if (phantom.length > 0) {
      alerts.push({
        id: uuid(),
        projectId: branch?.projectId,
        severity: "high",
        source: "implementation",
        description: `Task "${task.title}" references component(s) missing from the project brain: ${phantom.join(", ")}`,
        recommendation: "Re-scope the task or update the brain — the architecture no longer includes these components",
        detectedAt: now,
      });
    }
  }

  // 3. Backlog drift: more than 3 open suggestions on one project means the
  //    team's shared understanding is likely diverging from the brain.
  for (const project of projects) {
    const open = proposals.filter(
      (p) => p.projectId === project.id && !["accepted", "rejected", "archived"].includes(p.status)
    );
    if (open.length > 3) {
      alerts.push({
        id: uuid(),
        projectId: project.id,
        severity: "medium",
        source: "backlog",
        description: `${open.length} open suggestions on "${project.name}" — decision backlog is growing`,
        recommendation: "Review, decide, or archive stale suggestions to keep shared understanding current",
        detectedAt: now,
      });
    }
  }

  if (alerts.length) await dbSaveDriftAlerts(alerts);
  await log(
    "drift_detection",
    "scan",
    `${projects.length} project(s), ${activeTasks.length} active task(s), ${proposals.length} suggestion(s)`,
    alerts.length ? `${alerts.length} drift alert(s) raised` : "No drift detected — team alignment looks healthy"
  );
  return alerts;
}

// ─── Pipelines ───────────────────────────────────────────────────────────────

export async function runProposalPipeline(
  title: string,
  description: string,
  authorId: string,
  authorName: string,
  targetType: ProposalTarget,
  targetProjectId?: string,
  targetBranchId?: string
): Promise<PipelineResult> {
  const proposal = await createProposal(title, description, authorId, authorName, targetType, targetProjectId, targetBranchId);
  await gatherContext(proposal);
  await analyzeImpact(proposal, authorId);
  const updated = await dbGetProposal(proposal.id);
  if (updated) await generateReview(updated);
  const label = await getTargetLabel(proposal);
  await log("communication", "notify_slack", `New suggestion for ${label}: ${title}`, "Queued", proposal.id);
  const logs = (await dbGetAgentLogs()).filter((l) => l.proposalId === proposal.id);
  try {
    const { syncGovernedMemoryRegistry } = await import("@/lib/governance/memory-retrieval");
    await syncGovernedMemoryRegistry();
  } catch {
    /* registry sync is best-effort */
  }
  return { proposal: (await dbGetProposal(proposal.id)) ?? proposal, logs };
}

/** Re-run LLM Impact Agent for an existing proposal */
export async function rerunImpactAnalysis(proposalId: string, userId?: string): Promise<ImpactAnalysis> {
  const proposal = await dbGetProposal(proposalId);
  if (!proposal) throw new Error("Proposal not found");
  const impact = await analyzeAndStoreImpact(proposal, userId);
  const updated = await dbGetProposal(proposalId);
  if (updated?.impact?.structured) await generateReview(updated);
  return impact;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getProposals(projectId?: string, branchId?: string): Promise<Proposal[]> {
  return dbGetProposals({ projectId, branchId });
}

export async function getProposal(id: string): Promise<Proposal | undefined> {
  return dbGetProposal(id);
}

export async function getBranches(): Promise<DecisionBranch[]> {
  return dbGetBranches();
}

export async function getTasks(branchId?: string): Promise<ImplementationTask[]> {
  return dbGetTasks(branchId);
}

export async function getAgentLogs(): Promise<AgentLog[]> {
  return dbGetAgentLogs();
}

export async function getDriftAlerts(): Promise<DriftAlert[]> {
  return dbGetDriftAlerts();
}

export async function getSuggestionTargets(): Promise<
  { value: string; label: string; type: "project" | "branch"; projectId: string; branchId?: string }[]
> {
  const targets: { value: string; label: string; type: "project" | "branch"; projectId: string; branchId?: string }[] = [];
  const projects = await getProjects();

  for (const project of projects) {
    targets.push({ value: `project:${project.id}`, label: project.name, type: "project", projectId: project.id });
    for (const branch of await getOpenBranches(project.id)) {
      targets.push({
        value: `branch:${branch.id}`,
        label: `${project.name} → ${branch.name}`,
        type: "branch",
        projectId: project.id,
        branchId: branch.id,
      });
    }
  }
  return targets;
}

// ─── Product Discovery ───────────────────────────────────────────────────────

export async function runProductDiscovery(
  projectId: string,
  feedbackInput?: FeedbackItem[]
): Promise<DiscoveryResult> {
  await getProjectById(projectId);

  const feedback =
    feedbackInput && feedbackInput.length > 0
      ? feedbackInput.map((f) => ({ ...f, projectId }))
      : getMockFeedback(projectId);

  await dbClearDiscoveryForProject(projectId);
  await dbSaveFeedbackItems(feedback);

  const featurePacks = runProductDiscoveryAgent(projectId, feedback);
  await dbSaveFeaturePacks(featurePacks);
  await refreshProjectPriorities(projectId);

  await log(
    "product_discovery",
    "cluster_feedback",
    `${feedback.length} feedback items`,
    `Generated ${featurePacks.length} Feature Packs for project ${projectId}`
  );

  return { projectId, feedbackProcessed: feedback.length, featurePacks };
}

export async function getFeaturePacks(projectId?: string): Promise<FeaturePack[]> {
  return dbGetFeaturePacks(projectId);
}

export async function getFeaturePack(id: string): Promise<FeaturePack | undefined> {
  return dbGetFeaturePack(id);
}

export async function getProjectFeedback(projectId: string): Promise<FeedbackItem[]> {
  const stored = await dbGetFeedbackItems(projectId);
  return stored.length > 0 ? stored : getMockFeedback(projectId);
}

export async function promoteFeaturePackToProposal(
  featurePackId: string,
  authorId: string,
  authorName: string,
  target: string
): Promise<PipelineResult & { featurePack: FeaturePack }> {
  const pack = await dbGetFeaturePack(featurePackId);
  if (!pack) throw new Error("Feature Pack not found");
  if (pack.status === "promoted") throw new Error("Feature Pack already promoted to a proposal");

  const [targetType, targetId] = target.split(":") as ["project" | "branch", string];
  if (!targetId) throw new Error("Invalid target");

  const { title, description } = featurePackToProposalText(pack);
  const result = await runProposalPipeline(
    title,
    description,
    authorId,
    authorName,
    targetType === "project" ? "main" : "branch",
    targetType === "project" ? targetId : undefined,
    targetType === "branch" ? targetId : undefined
  );

  pack.status = "promoted";
  pack.promotedProposalId = result.proposal.id;
  pack.updatedAt = new Date().toISOString();
  await dbSaveFeaturePack(pack);

  await log(
    "product_discovery",
    "promote_to_proposal",
    pack.title,
    `Promoted Feature Pack → proposal ${result.proposal.id}`,
    result.proposal.id
  );

  return { ...result, featurePack: pack };
}

// ─── Test organisation seed: Metropolitan University ────────────────────────
// Drives the real pipeline with a fixture that covers edge cases (rejected,
// needs-discussion, tied votes, duplicates, drift). See src/lib/fixtures.

/** Fixture-only vote — bypasses team role check for university panel members */
async function seedCastVote(
  proposalId: string,
  userId: string,
  userName: string,
  vote: Vote["vote"],
  comment?: string
): Promise<Proposal> {
  const proposal = await dbGetProposal(proposalId);
  if (!proposal) throw new Error("Proposal not found");

  if (!proposal.votes) proposal.votes = [];
  const idx = proposal.votes.findIndex((v) => v.userId === userId);
  const entry: Vote = { userId, userName, vote, comment, createdAt: new Date().toISOString() };
  if (idx >= 0) proposal.votes[idx] = entry;
  else proposal.votes.push(entry);

  proposal.status = "consensus_pending";
  proposal.updatedAt = new Date().toISOString();
  await dbSaveProposal(proposal);
  await log("consensus", "vote", `${userName}: ${vote}`, comment ?? "", proposalId);
  return proposal;
}

export async function seedProject(): Promise<ProjectBrain> {
  const now = new Date().toISOString();
  const seed: ProjectBrain = {
    id: uuid(),
    name: "E-Commerce Platform",
    vision: "Build a scalable, maintainable e-commerce platform with clear architectural boundaries",
    goals: [
      "Reduce time-to-market for new features",
      "Maintain shared team understanding of architecture",
      "Enable safe, reversible engineering decisions",
    ],
    architecture: [
      { id: "1", name: "API Gateway", type: "api", description: "Central API entry point", dependencies: ["Auth Service"] },
      { id: "2", name: "Auth Service", type: "service", description: "Authentication and authorization", dependencies: ["User DB"] },
      { id: "3", name: "Product Service", type: "service", description: "Product catalog management", dependencies: ["Product DB", "Search Service"] },
      { id: "4", name: "Order Service", type: "service", description: "Order processing and fulfillment", dependencies: ["Payment Service", "Inventory Service"] },
      { id: "5", name: "Payment Service", type: "integration", description: "Stripe payment integration", dependencies: [] },
      { id: "6", name: "User DB", type: "database", description: "PostgreSQL user data store", dependencies: [] },
      { id: "7", name: "Product DB", type: "database", description: "PostgreSQL product catalog", dependencies: [] },
      { id: "8", name: "Search Service", type: "module", description: "Elasticsearch product search", dependencies: [] },
    ],
    institutionalMemory: [
      {
        id: uuid(),
        title: "Adopted microservices architecture",
        content: "Team decided to split monolith into domain-bounded services for independent scaling.",
        source: "decision",
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
      {
        id: uuid(),
        title: "PostgreSQL as primary datastore",
        content: "Chose PostgreSQL over MongoDB for ACID compliance in order processing.",
        source: "decision",
        createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      },
    ],
    currentVersion: "1.0.0",
    createdBy: "mgr-1",
    createdAt: now,
    updatedAt: now,
  };

  await dbSaveProject(seed);
  await log("project_brain", "seed", "demo", "E-Commerce demo initialized");
  return seed;
}

export async function seedUniversity(): Promise<ProjectBrain> {
  const brain = universityBrain();
  const now = new Date().toISOString();
  brain.createdBy = "mgr-1";
  brain.createdAt = now;
  brain.updatedAt = now;
  await dbClearProjectData(brain.id); // idempotent re-seed
  await dbSaveProject(brain);
  await log("project_brain", "seed", "university", "Metropolitan University demo initialized");

  for (const spec of UNIVERSITY_PROPOSALS) {
    const { proposal } = await runProposalPipeline(
      spec.title,
      spec.description,
      spec.author.id,
      spec.author.name,
      "main",
      brain.id
    );

    for (const v of spec.votes) {
      await seedCastVote(proposal.id, v.user.id, v.user.name, v.vote, v.comment);
    }

    if (spec.votes.length) {
      await tallyVotes(proposal.id);
    }

    if (spec.finalize === "approve") {
      const updated = await dbGetProposal(proposal.id);
      if (updated?.status === "ready_for_manager") {
        await managerAcceptProposal(proposal.id, "mgr-1");
      }
    } else if (spec.finalize === "check") {
      // A rejection majority alone never sets "rejected" — only the manager
      // can decline. The fixture's manager declines where the panel clearly
      // voted the proposal down.
      if (spec.expectStatus === "rejected") {
        await managerDeclineProposal(proposal.id, "mgr-1", "Rejected by manager after team review");
      }
    }
  }

  const branches = await dbGetBranches();
  const branch =
    branches.find((b) => b.projectId === brain.id) ??
    ({ id: uuid() } as DecisionBranch);

  const task: ImplementationTask = {
    id: uuid(),
    title: DIVERGENT_TASK.title,
    description: DIVERGENT_TASK.description,
    status: "pending",
    branchId: branch.id,
    affectedComponents: DIVERGENT_TASK.affectedComponents,
    createdAt: now,
    updatedAt: now,
  };
  await dbSaveTask(task);

  await detectDrift();

  try {
    const { syncGovernedMemoryRegistry } = await import("@/lib/governance/memory-retrieval");
    await syncGovernedMemoryRegistry();
  } catch {
    /* best-effort */
  }

  return brain;
}
