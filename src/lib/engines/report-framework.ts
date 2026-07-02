import type { CouncilId, EnterpriseReport, EnterpriseReportMeta, PriorityScoreRecord } from "@/lib/types";

export interface ReportBuildInput {
  meta: EnterpriseReportMeta;
  executiveSummary: string;
  problemStatement?: string;
  objectives?: string[];
  currentSituation?: string;
  supportingEvidence?: string[];
  keyMetrics?: { label: string; value: string | number }[];
  businessImpact?: string;
  technicalImpact?: string;
  financialImpact?: string;
  customerImpact?: string;
  riskLevel?: "low" | "medium" | "high";
  riskItems?: string[];
  dependencies?: string[];
  complexityAssessment?: string;
  timeline?: string;
  resourceRequirements?: string[];
  priority?: PriorityScoreRecord;
  alternativeSolutions?: string[];
  pros?: string[];
  cons?: string[];
  tradeoffs?: string[];
  recommendations?: string[];
  actionItems?: { action: string; owner?: string; priority?: string }[];
  successMetrics?: string[];
  kpis?: { name: string; target: string }[];
  approvalStatus?: string;
  nextSteps?: string[];
  supportingSources?: string[];
}

/** Universal enterprise report builder — no council returns raw LLM output */
export function buildEnterpriseReport(input: ReportBuildInput): EnterpriseReport {
  return {
    meta: input.meta,
    executiveSummary: input.executiveSummary,
    problemStatement: input.problemStatement,
    objectives: input.objectives,
    currentSituation: input.currentSituation,
    supportingEvidence: input.supportingEvidence ?? [],
    keyMetrics: input.keyMetrics ?? [],
    businessImpact: input.businessImpact,
    technicalImpact: input.technicalImpact,
    financialImpact: input.financialImpact,
    customerImpact: input.customerImpact,
    riskAssessment: input.riskItems?.length
      ? { level: input.riskLevel ?? "medium", items: input.riskItems }
      : undefined,
    dependencies: input.dependencies,
    complexityAssessment: input.complexityAssessment,
    timeline: input.timeline,
    resourceRequirements: input.resourceRequirements,
    priorityScore: input.priority?.overallScore,
    confidenceScore: input.priority?.confidenceScore,
    alternativeSolutions: input.alternativeSolutions,
    pros: input.pros,
    cons: input.cons,
    tradeoffs: input.tradeoffs,
    recommendations: input.recommendations,
    actionItems: input.actionItems,
    successMetrics: input.successMetrics,
    kpis: input.kpis,
    approvalStatus: input.approvalStatus,
    nextSteps: input.nextSteps,
    supportingSources: input.supportingSources,
  };
}

export function councilMeta(
  councilId: CouncilId,
  entityId: string,
  entityTitle: string,
  agents: string[]
): EnterpriseReportMeta {
  return {
    generatedBy: agents.join(", "),
    timestamp: new Date().toISOString(),
    councilId,
    entityId,
    entityTitle,
  };
}

export const REPORT_SECTION_LABELS: Record<string, string> = {
  executiveSummary: "Executive Summary",
  problemStatement: "Problem Statement",
  objectives: "Objectives",
  currentSituation: "Current Situation",
  supportingEvidence: "Supporting Evidence",
  keyMetrics: "Key Metrics",
  businessImpact: "Business Impact",
  technicalImpact: "Technical Impact",
  financialImpact: "Financial Impact",
  customerImpact: "Customer Impact",
  riskAssessment: "Risk Assessment",
  dependencies: "Dependencies",
  complexityAssessment: "Complexity Assessment",
  timeline: "Timeline",
  resourceRequirements: "Resource Requirements",
  priorityScore: "Priority Score",
  confidenceScore: "Confidence Score",
  alternativeSolutions: "Alternative Solutions",
  pros: "Pros",
  cons: "Cons",
  tradeoffs: "Trade-offs",
  recommendations: "Recommendations",
  actionItems: "Action Items",
  successMetrics: "Success Metrics",
  kpis: "KPIs",
  approvalStatus: "Approval Status",
  nextSteps: "Next Steps",
  supportingSources: "Supporting Sources",
};
