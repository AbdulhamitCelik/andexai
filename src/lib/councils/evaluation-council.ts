import { v4 as uuid } from "uuid";
import type { CouncilRun, EvaluationReport, PlanningReport, TestingReport } from "@/lib/types";
import { dbSaveCouncilRun } from "@/lib/db/repository";
import { buildEnterpriseReport, councilMeta } from "@/lib/engines/report-framework";

const EVALUATION_AGENTS = [
  "Evaluation Agent",
  "Metrics Agent",
  "Executive Summary Agent",
  "Recommendation Agent",
];

export function buildEvaluationReport(
  planning: PlanningReport | undefined,
  testing: TestingReport | undefined,
  proposalTitle: string
): EvaluationReport {
  const techHealth = testing?.overallScore ?? (testing?.overallReadiness === "ready" ? 88 : testing?.overallReadiness === "needs_work" ? 72 : 55);
  const winnerSat = testing?.abTesting.variants[1]?.satisfaction;
  const customerSat = testing?.customerSatisfaction ?? Math.round((winnerSat ?? 3.75) * 20);
  const security = testing?.securityScore ?? (testing?.technical.security.includes("no confidential") ? 90 : 75);
  const overall = Math.round((techHealth + customerSat + security + (planning?.businessValueScore ?? 65)) / 4);

  let recommendation: EvaluationReport["recommendation"] = "revise";
  if (testing?.overallReadiness === "ready" && overall >= 80) recommendation = "ship";
  else if (overall < 50) recommendation = "rollback";

  const businessHealth = planning?.businessValueScore ?? 70;
  const engineeringHealth = techHealth;
  const productHealth = Math.round((customerSat + (planning?.priorityScore ?? 65)) / 2);
  const customerHealth = customerSat;
  const deliveryHealth = planning?.timeline?.timelineRisk === "high" ? 55 : planning?.timeline?.timelineRisk === "medium" ? 72 : 88;

  const enterprise = buildEnterpriseReport({
    meta: councilMeta("evaluation", proposalTitle, proposalTitle, EVALUATION_AGENTS),
    executiveSummary: `Board-ready evaluation for "${proposalTitle}". Overall health ${overall}/100. Decision: ${recommendation.toUpperCase()}. Human approval required.`,
    problemStatement: `Should we ship "${proposalTitle}" to production?`,
    objectives: ["Synthesise all council reports", "Provide measurable recommendation"],
    currentSituation: `Planning: ${planning ? "complete" : "missing"}. Testing: ${testing ? "complete" : "missing"}.`,
    supportingEvidence: [
      planning?.summary ?? "No planning report",
      testing?.summary ?? "No testing report",
      `A/B winner: ${testing?.abTesting.winner ?? "N/A"}`,
    ],
    keyMetrics: [
      { label: "Overall Health", value: overall },
      { label: "Business Health", value: businessHealth },
      { label: "Engineering Health", value: engineeringHealth },
      { label: "Customer Health", value: customerHealth },
      { label: "Delivery Health", value: deliveryHealth },
      { label: "Approval Confidence", value: Math.round(overall * 0.9) },
    ],
    businessImpact: planning?.enterprise?.businessImpact,
    technicalImpact: testing?.enterprise?.technicalImpact,
    financialImpact: planning?.estimatedCost,
    customerImpact: testing?.enterprise?.customerImpact,
    riskLevel: planning?.deadlineRisk ?? "medium",
    riskItems: planning?.enterprise?.riskAssessment?.items ?? [],
    timeline: planning?.timeline?.summary,
    recommendations: [recommendation === "ship" ? "Ship with monitoring" : recommendation === "revise" ? "Revise before release" : "Rollback or archive"],
    approvalStatus: "Requires executive / manager sign-off",
    nextSteps: recommendation === "ship" ? ["Deploy", "Run Learning Loop"] : ["Address gaps", "Re-run Testing Council"],
  });

  return {
    overallScore: overall,
    customerSatisfaction: customerSat,
    technicalHealth: techHealth,
    security,
    performance: testing?.performanceScore ?? testing?.abTesting.variants[1]?.performance ?? 85,
    accessibility: testing?.accessibilityScore ?? 78,
    businessValue: businessHealth,
    recommendation,
    executiveSummary: enterprise.executiveSummary,
    evidence: enterprise.supportingEvidence,
    overallHealth: overall,
    businessHealth,
    engineeringHealth,
    productHealth,
    customerHealth,
    deliveryHealth,
    riskSummary: enterprise.riskAssessment?.items,
    timelineSummary: planning?.timeline?.releaseForecast,
    budgetSummary: planning?.estimatedCost,
    recommendedDecision: recommendation.toUpperCase(),
    approvalConfidence: Math.round(overall * 0.9),
    futureRecommendations: [
      "Apply A/B winner learnings to similar Feature Packs",
      "Update Project Brain with council cycle lessons",
    ],
    enterprise,
  };
}

export async function runEvaluationCouncil(
  projectId: string,
  branchId: string,
  proposalId: string,
  proposalTitle: string,
  planningRun: CouncilRun | undefined,
  testingRun: CouncilRun | undefined
): Promise<CouncilRun> {
  const planning = planningRun?.report as PlanningReport | undefined;
  const testing = testingRun?.report as TestingReport | undefined;
  const report = buildEvaluationReport(planning, testing, proposalTitle);
  const now = new Date().toISOString();
  const run: CouncilRun = {
    id: uuid(),
    councilId: "evaluation",
    projectId,
    branchId,
    proposalId,
    status: "complete",
    agents: EVALUATION_AGENTS,
    report,
    createdAt: now,
    updatedAt: now,
  };
  await dbSaveCouncilRun(run);
  return run;
}
