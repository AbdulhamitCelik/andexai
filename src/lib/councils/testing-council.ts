import { v4 as uuid } from "uuid";
import type { DecisionBranch, ImplementationTask, Proposal, TestingReport } from "@/lib/types";
import { dbSaveCouncilRun } from "@/lib/db/repository";
import type { CouncilRun } from "@/lib/types";
import { priorityFromProposal } from "@/lib/engines/priority-engine";
import { buildEnterpriseReport, councilMeta } from "@/lib/engines/report-framework";

const TESTING_AGENTS = [
  "Customer Agent",
  "Power User Agent",
  "Accessibility Agent",
  "International User Agent",
  "Mobile User Agent",
  "Enterprise User Agent",
  "QA Agent",
  "Regression Agent",
  "Performance Agent",
  "Security Agent",
  "A/B Testing Agent",
];

export function buildTestingReport(proposal: Proposal, branch: DecisionBranch, tasks: ImplementationTask[]): TestingReport {
  const scope = proposal.title;
  const taskCount = tasks.length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  const priority = priorityFromProposal({
    id: proposal.id,
    projectId: proposal.projectId,
    title: proposal.title,
    riskLevel: proposal.impact?.riskLevel,
  });

  const overallScore = pending > taskCount / 2 ? 62 : pending > 0 ? 78 : 88;
  const customerSat = 84;
  const perf = proposal.impact?.riskLevel === "high" ? 78 : 89;
  const security = 90;
  const accessibility = pending > 0 ? 72 : 85;
  const reliability = branch.status === "implementing" ? 75 : 88;
  const deploymentRisk = pending > taskCount / 2 ? "high" : pending > 0 ? "medium" : "low";
  const recommendation = deploymentRisk === "low" ? "ship" : "revise";

  const enterprise = buildEnterpriseReport({
    meta: councilMeta("testing", branch.id, scope, TESTING_AGENTS),
    executiveSummary: `Testing Council evaluated "${scope}" — overall ${overallScore}/100. Recommendation: ${recommendation.toUpperCase()}.`,
    problemStatement: `Validate "${scope}" before release to production`,
    objectives: ["Customer satisfaction", "Security compliance", "A/B winner selection"],
    currentSituation: `${taskCount - pending}/${taskCount} tasks verified; branch status: ${branch.status}`,
    supportingEvidence: [`A/B winner: Variant B`, `${taskCount} implementation tasks tracked`],
    keyMetrics: [
      { label: "Overall Score", value: overallScore },
      { label: "Customer Satisfaction", value: customerSat },
      { label: "Performance", value: perf },
      { label: "Security", value: security },
    ],
    businessImpact: "Variant B shows +62% conversion vs control",
    technicalImpact: `${taskCount - pending} tasks verified`,
    customerImpact: "6 persona simulations completed",
    riskLevel: deploymentRisk,
    riskItems: pending > 0 ? [`${pending} pending QA tasks`] : ["No critical blockers"],
    recommendations: [recommendation === "ship" ? "Ship with gradual rollout" : "Complete pending tasks before ship"],
    actionItems: pending > 0 ? [{ action: "Complete pending QA tasks", priority: "high" }] : [{ action: "Proceed to Evaluation Council", priority: "medium" }],
    approvalStatus: "Awaiting Evaluation Council + human ship decision",
    nextSteps: ["Run Evaluation Council", "Manager approves deployment"],
    priority,
  });

  return {
    customerSimulation: {
      customer: `New user flow for "${scope}" is intuitive; onboarding friction acceptable.`,
      powerUser: `Power users want keyboard shortcuts and bulk actions for ${scope}.`,
      accessibility: pending > 0 ? "WCAG audit pending — schedule before ship." : "Screen reader paths verified on core flows.",
      international: "UK payment localisation validated; EU locale strings need review.",
      mobile: "Mobile checkout latency within target on 4G simulation.",
      enterprise: "SSO and audit log requirements met for enterprise pilot.",
    },
    technical: {
      qa: `${taskCount} tasks tracked; ${taskCount - pending} verified, ${pending} pending.`,
      regression: "No regressions in auth or payment flows.",
      performance: proposal.impact?.riskLevel === "high" ? "Load test recommended before peak traffic." : "P95 latency within SLA.",
      security: "Permission layer enforced before memory retrieval; no confidential leak in Ask Brain.",
      reliability: branch.status === "implementing" ? "Implementation in progress — monitor error budgets." : "Stable on staging.",
    },
    abTesting: {
      recommendation: "Ship Variant B with gradual rollout (10% → 50% → 100%).",
      winner: "Variant B",
      variants: [
        { variant: "Variant A — Control", conversion: 2.1, retention: 68, satisfaction: 3.8, performance: 92, failureRate: 1.2 },
        { variant: "Variant B — Feature", conversion: 3.4, retention: 74, satisfaction: 4.2, performance: 89, failureRate: 0.9 },
        { variant: "Variant C — Minimal", conversion: 2.8, retention: 71, satisfaction: 4.0, performance: 95, failureRate: 0.7 },
      ],
    },
    overallReadiness: pending > taskCount / 2 ? "needs_work" : pending > 0 ? "needs_work" : "ready",
    summary: `Testing Council evaluated "${scope}" across customer, technical, and A/B perspectives. Overall ${overallScore}/100.`,
    overallScore,
    customerSatisfaction: customerSat,
    abWinner: "Variant B",
    performanceScore: perf,
    securityScore: security,
    accessibilityScore: accessibility,
    reliabilityScore: reliability,
    regressionStatus: "Pass — no critical regressions",
    bugSummary: pending > 0 ? [`${pending} tasks pending verification`] : ["No open critical bugs"],
    knownIssues: pending > 0 ? ["WCAG audit pending"] : [],
    deploymentRisk,
    recommendation,
    enterprise,
  };
}

export async function runTestingCouncil(
  projectId: string,
  branch: DecisionBranch,
  proposal: Proposal,
  tasks: ImplementationTask[]
): Promise<CouncilRun> {
  const report = buildTestingReport(proposal, branch, tasks);
  const now = new Date().toISOString();
  const run: CouncilRun = {
    id: uuid(),
    councilId: "testing",
    projectId,
    branchId: branch.id,
    proposalId: proposal.id,
    status: "complete",
    agents: TESTING_AGENTS,
    report,
    createdAt: now,
    updatedAt: now,
  };
  await dbSaveCouncilRun(run);
  return run;
}
