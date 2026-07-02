import { v4 as uuid } from "uuid";
import type { DecisionBranch, PlanningReport, Proposal } from "@/lib/types";
import { dbSaveCouncilRun } from "@/lib/db/repository";
import type { CouncilRun } from "@/lib/types";
import { priorityFromProposal } from "@/lib/engines/priority-engine";
import { buildTimeline } from "@/lib/engines/timeline-engine";
import { buildResourcePlan, getOwnerRecommendations } from "@/lib/engines/resource-engine";
import { buildEnterpriseReport, councilMeta } from "@/lib/engines/report-framework";
import { refreshProjectPriorities } from "@/lib/engines/priority-service";

const PLANNING_AGENTS = [
  "Timeline Agent",
  "Dependency Agent",
  "Complexity Agent",
  "Priority Agent",
  "Sprint Planning Agent",
  "Deadline Agent",
  "Resource Allocation Agent",
  "Risk Planning Agent",
];

function buildPlanningReport(proposal: Proposal, branch: DecisionBranch): PlanningReport {
  const approve = proposal.votes?.filter((v) => v.vote.startsWith("approve")).length ?? 0;
  const total = proposal.votes?.length ?? 1;
  const priority = priorityFromProposal({
    id: proposal.id,
    projectId: proposal.projectId,
    title: proposal.title,
    riskLevel: proposal.impact?.riskLevel,
    voteApproveRatio: approve / total,
    pros: proposal.review?.pros,
  });

  const timeline = buildTimeline(proposal, branch, priority);
  const resources = buildResourcePlan({
    requiredSkills: ["Backend", "Frontend", "QA", "DevOps"],
    sprints: timeline.sprints,
    tasks: [],
  });

  const complex = proposal.impact?.riskLevel ?? "medium";
  const roadmap = timeline.roadmap[0];

  const enterprise = buildEnterpriseReport({
    meta: councilMeta("planning", branch.id, proposal.title, PLANNING_AGENTS),
    executiveSummary: `Planning Council recommends a ${timeline.roadmap[0]?.estimatedDurationWeeks ?? 5}-week roadmap for "${proposal.title}" with priority ${priority.overallScore}/100.`,
    problemStatement: proposal.description.slice(0, 300),
    objectives: [`Deliver "${proposal.title}" on branch ${branch.name}`, "Maintain Project Brain alignment"],
    currentSituation: `Branch ${branch.name} approved — project v${branch.mainVersionAtCreation} unchanged until merge.`,
    supportingEvidence: priority.supportingEvidence,
    keyMetrics: [
      { label: "Priority Score", value: priority.overallScore },
      { label: "Confidence", value: priority.confidenceScore },
      { label: "Risk Score", value: priority.riskScore },
      { label: "Duration (weeks)", value: roadmap?.estimatedDurationWeeks ?? 5 },
    ],
    businessImpact: `Business value ${priority.businessValue}/100 — ${proposal.review?.pros?.[0] ?? "Aligns with approved proposal scope"}`,
    technicalImpact: proposal.impact?.summary ?? "Architecture impact analysed in Proposal Council",
    financialImpact: roadmap?.estimatedCost ?? "TBD",
    customerImpact: proposal.review?.teamSummary?.slice(0, 200),
    riskLevel: timeline.timelineRisk,
    riskItems: proposal.review?.risks ?? ["Schedule risk if dependencies slip"],
    dependencies: timeline.criticalPath,
    complexityAssessment: `${complex} complexity (${priority.complexity}/100)`,
    timeline: timeline.summary,
    resourceRequirements: resources.allocations.map((a) => `${a.role}: ${a.assignee} (${a.workloadPercent}% load)`),
    priority,
    pros: proposal.review?.pros,
    cons: proposal.review?.cons,
    tradeoffs: proposal.review?.tradeoffs,
    recommendations: [`Proceed with ${timeline.sprints.length}-sprint plan`, "Human approval required before implementation"],
    actionItems: timeline.milestones.map((m) => ({
      action: m.name,
      priority: String(m.priority),
    })),
    successMetrics: ["On-time milestone delivery", "Zero critical regressions at RC"],
    kpis: [{ name: "Sprint velocity", target: resources.velocityEstimate }],
    approvalStatus: "Awaiting manager to start implementation",
    nextSteps: ["Start Implementation on branch", "Run Testing Council after tasks complete"],
    supportingSources: [`Proposal ${proposal.id}`, `Branch ${branch.id}`],
  });

  return {
    complexity: complex,
    businessValueScore: priority.businessValue,
    estimatedDurationWeeks: roadmap?.estimatedDurationWeeks ?? 5,
    deadlineRisk: timeline.timelineRisk,
    requiredSkills: roadmap?.requiredSkills ?? ["Backend", "Frontend", "QA", "DevOps"],
    sprints: timeline.sprints,
    milestones: timeline.milestones.map((m) => ({ name: m.name, week: m.week })),
    criticalPath: timeline.criticalPath,
    dependencies: timeline.roadmap[0]?.dependencies ?? [],
    ownerRecommendations: getOwnerRecommendations(resources),
    summary: timeline.summary,
    priorityScore: priority.overallScore,
    confidenceScore: priority.confidenceScore,
    riskScore: priority.riskScore,
    estimatedCost: roadmap?.estimatedCost,
    requiredTeams: roadmap?.requiredTeams,
    timeline,
    resources,
    enterprise,
  };
}

export async function runPlanningCouncil(
  projectId: string,
  branch: DecisionBranch,
  proposal: Proposal
): Promise<CouncilRun> {
  const report = buildPlanningReport(proposal, branch);
  await refreshProjectPriorities(projectId);
  const now = new Date().toISOString();
  const run: CouncilRun = {
    id: uuid(),
    councilId: "planning",
    projectId,
    branchId: branch.id,
    proposalId: proposal.id,
    status: "complete",
    agents: PLANNING_AGENTS,
    report,
    createdAt: now,
    updatedAt: now,
  };
  await dbSaveCouncilRun(run);
  return run;
}
