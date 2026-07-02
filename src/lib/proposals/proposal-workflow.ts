import { v4 as uuid } from "uuid";
import type {
  CouncilRun,
  DecisionBranch,
  EnterpriseReport,
  EvaluationReport,
  PlanningReport,
  ProjectBrain,
  Proposal,
  TestingReport,
} from "@/lib/types";
import {
  dbGetCouncilRunsForProposal,
  dbGetProject,
  dbGetProposal,
  dbSaveCouncilRun,
  dbSaveProject,
} from "@/lib/db/repository";
import { buildPlanningReport } from "@/lib/councils/planning-council";
import { buildTestingReport } from "@/lib/councils/testing-council";
import { buildEvaluationReport } from "@/lib/councils/evaluation-council";
import { buildEnterpriseReport, councilMeta } from "@/lib/engines/report-framework";
import { priorityFromProposal } from "@/lib/engines/priority-engine";
import { buildDecisionIntelligence } from "@/lib/engines/decision-intelligence";
import { refreshProjectPriorities } from "@/lib/engines/priority-service";

export type WorkflowStepStatus = "pending" | "active" | "complete" | "blocked";

export interface WorkflowStep {
  id: string;
  label: string;
  status: WorkflowStepStatus;
  detail?: string;
}

export interface WorkflowGates {
  hasImpact: boolean;
  councilsComplete: boolean;
  consensusPassed: boolean;
  memoryUpdated: boolean;
  canVote: boolean;
  canAccept: boolean;
  blockers: string[];
}

export interface ProposalWorkflowState {
  steps: WorkflowStep[];
  gates: WorkflowGates;
  councilRuns: {
    planning?: CouncilRun;
    testing?: CouncilRun;
    evaluation?: CouncilRun;
  };
  enterpriseReport: EnterpriseReport | null;
}

const PRE_APPROVAL_COUNCILS = ["planning", "testing", "evaluation"] as const;

function previewBranch(proposal: Proposal, project: ProjectBrain): DecisionBranch {
  return {
    id: `preview-${proposal.id}`,
    projectId: proposal.projectId,
    name: `preview/${proposal.title.toLowerCase().replace(/\s+/g, "-").slice(0, 28)}`,
    seedProposalId: proposal.id,
    proposalTitle: proposal.title,
    status: "open",
    version: project.currentVersion,
    mainVersionAtCreation: project.currentVersion,
    mergedBrain: project,
    acceptedProposalIds: [],
    createdAt: proposal.createdAt,
  };
}

function latestRunForCouncil(runs: CouncilRun[], councilId: string): CouncilRun | undefined {
  return runs.find((r) => r.councilId === councilId && r.status === "complete");
}

export function councilsCompleteForProposal(runs: CouncilRun[]): boolean {
  return PRE_APPROVAL_COUNCILS.every((id) => latestRunForCouncil(runs, id));
}

export function buildProposalEnterpriseReport(
  proposal: Proposal,
  runs: CouncilRun[]
): EnterpriseReport | null {
  const planning = latestRunForCouncil(runs, "planning")?.report as PlanningReport | undefined;
  const testing = latestRunForCouncil(runs, "testing")?.report as TestingReport | undefined;
  const evaluation = latestRunForCouncil(runs, "evaluation")?.report as EvaluationReport | undefined;

  if (!planning || !testing || !evaluation) return null;

  const approve = proposal.votes?.filter((v) => v.vote.startsWith("approve")).length ?? 0;
  const total = Math.max(proposal.votes?.length ?? 0, 1);
  const priority = priorityFromProposal({
    id: proposal.id,
    projectId: proposal.projectId,
    title: proposal.title,
    riskLevel: proposal.impact?.riskLevel,
    voteApproveRatio: approve / total,
    pros: proposal.review?.pros,
  });

  const decisionIntel = buildDecisionIntelligence([priority]);
  const impactSummary =
    proposal.impact?.structured?.summary ??
    proposal.impact?.summary ??
    proposal.review?.teamSummary ??
    proposal.description.slice(0, 200);

  const recommended =
    evaluation.recommendedDecision ??
    evaluation.recommendation.toUpperCase();

  return buildEnterpriseReport({
    meta: councilMeta("evaluation", proposal.id, proposal.title, [
      "Impact Agent",
      "Planning Council",
      "Testing Council",
      "Evaluation Council",
      "Priority Engine",
      "Timeline Engine",
      "Resource Engine",
    ]),
    executiveSummary: `Enterprise decision package for "${proposal.title}". ${evaluation.executiveSummary}`,
    problemStatement: proposal.description.slice(0, 300),
    objectives: [
      "Validate business and technical impact before team consensus",
      "Produce council-backed timeline and resource estimates",
      "Enable manager approval with full audit trail",
    ],
    currentSituation: `Status: ${proposal.status.replace(/_/g, " ")}. Councils complete. ${proposal.votes?.length ?? 0} team vote(s) recorded.`,
    supportingEvidence: [
      ...(priority.supportingEvidence ?? []),
      planning.summary,
      testing.summary,
    ],
    keyMetrics: [
      { label: "Priority Score", value: priority.overallScore },
      { label: "Confidence", value: priority.confidenceScore },
      { label: "Planning Score", value: planning.priorityScore ?? priority.overallScore },
      { label: "Testing Score", value: testing.overallScore ?? 0 },
      { label: "Evaluation Health", value: evaluation.overallHealth ?? evaluation.overallScore },
      { label: "Approval Confidence", value: evaluation.approvalConfidence ?? priority.confidenceScore },
    ],
    businessImpact: planning.enterprise?.businessImpact ?? impactSummary,
    technicalImpact: proposal.impact?.architectureImpact?.join("; ") ?? testing.enterprise?.technicalImpact,
    financialImpact: planning.estimatedCost ?? planning.enterprise?.financialImpact,
    customerImpact: testing.enterprise?.customerImpact ?? proposal.review?.teamSummary?.slice(0, 160),
    riskLevel: proposal.impact?.riskLevel ?? planning.deadlineRisk ?? "medium",
    riskItems: [
      ...(proposal.review?.risks ?? []),
      ...(planning.enterprise?.riskAssessment?.items ?? []),
      ...(testing.enterprise?.riskAssessment?.items ?? []),
    ].slice(0, 8),
    dependencies: planning.criticalPath,
    complexityAssessment: `${planning.complexity} complexity — score ${priority.complexity}/100`,
    timeline: planning.timeline?.summary ?? planning.summary,
    resourceRequirements:
      planning.resources?.allocations.map((a) => `${a.role}: ${a.assignee} (${a.workloadPercent}% load)`) ??
      planning.ownerRecommendations?.map((o) => `${o.role}: ${o.assignee}`),
    priority,
    pros: proposal.review?.pros,
    cons: proposal.review?.cons,
    tradeoffs: proposal.review?.tradeoffs,
    recommendations: [
      `Council recommendation: ${recommended}`,
      decisionIntel?.prioritize.reasoning[0] ?? priority.recommendedAction,
      ...(evaluation.enterprise?.recommendations ?? []),
    ],
    actionItems: planning.timeline?.milestones.map((m) => ({
      action: m.name,
      priority: String(m.priority),
    })),
    successMetrics: ["Consensus majority before manager sign-off", "Zero governance bypass on approval"],
    kpis: [{ name: "Sprint velocity", target: planning.resources?.velocityEstimate ?? "TBD" }],
    approvalStatus:
      proposal.status === "accepted"
        ? "Approved by manager"
        : proposal.status === "ready_for_manager"
          ? "Awaiting manager approval"
          : "Blocked until consensus",
    nextSteps:
      proposal.status === "accepted"
        ? ["Start implementation on decision branch", "Update Project Brain memory"]
        : ["Complete team consensus", "Manager reviews enterprise report", "Accept or decline"],
    supportingSources: [
      `Proposal ${proposal.id}`,
      `Planning run ${latestRunForCouncil(runs, "planning")?.id}`,
      `Testing run ${latestRunForCouncil(runs, "testing")?.id}`,
      `Evaluation run ${latestRunForCouncil(runs, "evaluation")?.id}`,
    ],
  });
}

export function resolveProposalWorkflow(
  proposal: Proposal,
  runs: CouncilRun[],
  project?: ProjectBrain
): ProposalWorkflowState {
  const hasImpact = Boolean(proposal.impact?.structured || proposal.impact?.summary);
  const councilsComplete = councilsCompleteForProposal(runs);
  const consensusPassed = proposal.status === "ready_for_manager" || proposal.status === "accepted";
  const memoryUpdated =
    proposal.status === "accepted" &&
    Boolean(project?.institutionalMemory?.some((m) => m.decisionId === proposal.id));

  const blockers: string[] = [];
  if (!hasImpact) blockers.push("Impact analysis must complete first");
  if (!councilsComplete) blockers.push("Planning, Testing, and Evaluation councils must complete");
  if (!consensusPassed && proposal.status !== "rejected")
    blockers.push("Team consensus must reach ready for manager");

  const voteOpen = ["under_review", "consensus_pending", "needs_discussion"].includes(proposal.status);
  const canVote = voteOpen && hasImpact && councilsComplete && !consensusPassed;
  const canAccept =
    proposal.status === "ready_for_manager" && hasImpact && councilsComplete && consensusPassed;

  const enterpriseReport = councilsComplete ? buildProposalEnterpriseReport(proposal, runs) : null;

  const steps: WorkflowStep[] = [
    {
      id: "created",
      label: "Proposal created",
      status: "complete",
      detail: `Submitted by ${proposal.authorName}`,
    },
    {
      id: "impact",
      label: "Impact generated",
      status: hasImpact ? "complete" : proposal.status === "draft" ? "blocked" : "active",
      detail: hasImpact ? "Impact Agent analysis ready" : "Waiting for impact analysis",
    },
    {
      id: "councils",
      label: "Councils completed",
      status: !hasImpact ? "blocked" : councilsComplete ? "complete" : "active",
      detail: councilsComplete
        ? "Planning, Testing, and Evaluation councils finished"
        : "Running enterprise councils…",
    },
    {
      id: "enterprise",
      label: "Enterprise report generated",
      status: !councilsComplete ? "blocked" : enterpriseReport ? "complete" : "active",
      detail: enterpriseReport ? "Unified decision package ready" : "Assembling report",
    },
    {
      id: "consensus",
      label: "Consensus reached",
      status: !councilsComplete
        ? "blocked"
        : consensusPassed
          ? "complete"
          : voteOpen
            ? "active"
            : proposal.status === "rejected"
              ? "blocked"
              : "pending",
      detail: consensusPassed
        ? "Majority approval — ready for manager"
        : `${proposal.votes?.length ?? 0} vote(s) — workers must align`,
    },
    {
      id: "manager",
      label: "Manager approved",
      status:
        proposal.status === "accepted"
          ? "complete"
          : proposal.status === "ready_for_manager"
            ? "active"
            : proposal.status === "rejected"
              ? "blocked"
              : "pending",
      detail:
        proposal.status === "accepted"
          ? "Decision committed"
          : proposal.status === "rejected"
            ? "Declined by manager"
            : "Awaiting manager sign-off",
    },
    {
      id: "memory",
      label: "Memory updated",
      status:
        proposal.status === "accepted"
          ? memoryUpdated
            ? "complete"
            : "active"
          : "pending",
      detail: memoryUpdated
        ? "Project Brain institutional memory updated"
        : proposal.status === "accepted"
          ? "Recording decision in Project Brain"
          : "Runs after manager approval",
    },
  ];

  return {
    steps,
    gates: {
      hasImpact,
      councilsComplete,
      consensusPassed,
      memoryUpdated,
      canVote,
      canAccept,
      blockers,
    },
    councilRuns: {
      planning: latestRunForCouncil(runs, "planning"),
      testing: latestRunForCouncil(runs, "testing"),
      evaluation: latestRunForCouncil(runs, "evaluation"),
    },
    enterpriseReport,
  };
}

export async function runProposalPreApprovalCouncils(proposalId: string): Promise<CouncilRun[]> {
  const proposal = await dbGetProposal(proposalId);
  if (!proposal) throw new Error("Proposal not found");
  if (!proposal.impact) throw new Error("Impact analysis required before councils can run");

  const existing = await dbGetCouncilRunsForProposal(proposalId);
  if (councilsCompleteForProposal(existing)) return existing;

  const project = await dbGetProject(proposal.projectId);
  if (!project) throw new Error("Project not found");

  const branch = previewBranch(proposal, project);
  const saved: CouncilRun[] = [];
  const now = () => new Date().toISOString();

  if (!latestRunForCouncil(existing, "planning")) {
    const planningReport = buildPlanningReport(proposal, branch);
    const planningRun: CouncilRun = {
      id: uuid(),
      councilId: "planning",
      projectId: proposal.projectId,
      branchId: branch.id,
      proposalId: proposal.id,
      status: "complete",
      agents: ["Timeline Agent", "Priority Agent", "Resource Allocation Agent"],
      report: planningReport,
      createdAt: now(),
      updatedAt: now(),
    };
    await dbSaveCouncilRun(planningRun);
    saved.push(planningRun);
  }


  if (!latestRunForCouncil(existing, "testing")) {
    const testingReport = buildTestingReport(proposal, branch, []);
    const testingRun: CouncilRun = {
      id: uuid(),
      councilId: "testing",
      projectId: proposal.projectId,
      branchId: branch.id,
      proposalId: proposal.id,
      status: "complete",
      agents: ["QA Agent", "Customer Agent", "A/B Testing Agent"],
      report: testingReport,
      createdAt: now(),
      updatedAt: now(),
    };
    await dbSaveCouncilRun(testingRun);
    saved.push(testingRun);
  }

  const allAfterTesting = [...existing, ...saved];

  if (!latestRunForCouncil(existing, "evaluation")) {
    const pRun = latestRunForCouncil(allAfterTesting, "planning");
    const tRun = latestRunForCouncil(allAfterTesting, "testing");
    const pReport = pRun?.report as PlanningReport | undefined;
    const tReport = tRun?.report as TestingReport | undefined;
    if (!pReport || !tReport) throw new Error("Council reports incomplete");

    const evaluationReport = buildEvaluationReport(pReport, tReport, proposal.title);
    const evaluationRun: CouncilRun = {
      id: uuid(),
      councilId: "evaluation",
      projectId: proposal.projectId,
      branchId: branch.id,
      proposalId: proposal.id,
      status: "complete",
      agents: ["Evaluation Agent", "Executive Summary Agent"],
      report: evaluationReport,
      createdAt: now(),
      updatedAt: now(),
    };
    await dbSaveCouncilRun(evaluationRun);
    saved.push(evaluationRun);
  }

  await refreshProjectPriorities(proposal.projectId);
  return dbGetCouncilRunsForProposal(proposalId);
}

export async function getProposalWorkflow(proposalId: string): Promise<ProposalWorkflowState | null> {
  const proposal = await dbGetProposal(proposalId);
  if (!proposal) return null;
  const runs = await dbGetCouncilRunsForProposal(proposalId);
  const project = await dbGetProject(proposal.projectId);
  return resolveProposalWorkflow(proposal, runs, project);
}

export async function updateMemoryOnProposalAccept(proposal: Proposal): Promise<void> {
  const project = await dbGetProject(proposal.projectId);
  if (!project) return;

  const already = project.institutionalMemory?.some((m) => m.decisionId === proposal.id);
  if (already) return;

  project.institutionalMemory = project.institutionalMemory ?? [];
  project.institutionalMemory.push({
    id: uuid(),
    title: `Decision: ${proposal.title}`,
    content: [
      `Manager approved suggestion "${proposal.title}" on ${new Date().toLocaleDateString()}.`,
      proposal.impact?.summary ?? proposal.description.slice(0, 200),
      proposal.managerNote ? `Manager note: ${proposal.managerNote}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    source: "proposal",
    decisionId: proposal.id,
    createdAt: new Date().toISOString(),
  });
  await dbSaveProject(project);
}
