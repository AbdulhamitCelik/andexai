import type {
  EstimatedImpact,
  PriorityDimension,
  PriorityDimensionKey,
  PriorityEntityType,
  PriorityScoreRecord,
} from "@/lib/types";
import { v4 as uuid } from "uuid";

/** Default dimension weights — councils pass signals; engine computes transparent scores */
export const DIMENSION_WEIGHTS: Record<PriorityDimensionKey, { weight: number; label: string }> = {
  businessValue: { weight: 0.12, label: "Business Value" },
  customerImpact: { weight: 0.1, label: "Customer Impact" },
  revenueImpact: { weight: 0.08, label: "Revenue Impact" },
  userDemand: { weight: 0.08, label: "User Demand" },
  supportingRequests: { weight: 0.06, label: "Supporting Requests" },
  customerSentiment: { weight: 0.06, label: "Customer Sentiment" },
  strategicAlignment: { weight: 0.07, label: "Strategic Alignment" },
  urgency: { weight: 0.08, label: "Urgency" },
  complexity: { weight: 0.05, label: "Complexity (inverse)" },
  estimatedEffort: { weight: 0.04, label: "Effort (inverse)" },
  dependencies: { weight: 0.04, label: "Dependencies (inverse)" },
  technicalRisk: { weight: 0.05, label: "Technical Risk (inverse)" },
  securityRisk: { weight: 0.04, label: "Security Risk (inverse)" },
  businessRisk: { weight: 0.04, label: "Business Risk (inverse)" },
  resourceAvailability: { weight: 0.04, label: "Resource Availability" },
  estimatedRoi: { weight: 0.06, label: "Estimated ROI" },
  confidence: { weight: 0.05, label: "AI Confidence" },
  historicalSuccess: { weight: 0.04, label: "Historical Success" },
};

const INVERSE_DIMENSIONS = new Set<PriorityDimensionKey>([
  "complexity",
  "estimatedEffort",
  "dependencies",
  "technicalRisk",
  "securityRisk",
  "businessRisk",
]);

export interface PriorityInput {
  entityType: PriorityEntityType;
  entityId: string;
  projectId: string;
  title: string;
  signals: Partial<Record<PriorityDimensionKey, number>>;
  evidence?: string[];
  recommendedAction?: string;
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function impactToScore(impact: EstimatedImpact | "low" | "medium" | "high" | undefined): number {
  if (impact === "high") return 85;
  if (impact === "medium") return 60;
  if (impact === "low") return 35;
  return 50;
}

function riskToScore(risk: "low" | "medium" | "high" | undefined): number {
  if (risk === "high") return 85;
  if (risk === "medium") return 55;
  return 25;
}

function buildDimension(
  key: PriorityDimensionKey,
  rawScore: number,
  reasoning: string
): PriorityDimension {
  const meta = DIMENSION_WEIGHTS[key];
  const score = clamp(rawScore);
  const effective = INVERSE_DIMENSIONS.has(key) ? 100 - score : score;
  return {
    key,
    label: meta.label,
    score,
    weight: meta.weight,
    weightedContribution: Math.round(effective * meta.weight * 100) / 100,
    reasoning,
  };
}

export function computePriority(input: PriorityInput): PriorityScoreRecord {
  const dims: PriorityDimension[] = [];
  const s = input.signals;

  if (s.businessValue != null)
    dims.push(buildDimension("businessValue", s.businessValue, `Business value signal: ${s.businessValue}/100 based on strategic and revenue alignment.`));
  if (s.customerImpact != null)
    dims.push(buildDimension("customerImpact", s.customerImpact, `Customer impact: ${s.customerImpact}/100 — breadth and severity of user-facing effects.`));
  if (s.revenueImpact != null)
    dims.push(buildDimension("revenueImpact", s.revenueImpact, `Revenue impact: ${s.revenueImpact}/100 — estimated effect on conversion and retention.`));
  if (s.userDemand != null)
    dims.push(buildDimension("userDemand", s.userDemand, `User demand: ${s.userDemand}/100 — volume and intensity of requests.`));
  if (s.supportingRequests != null)
    dims.push(buildDimension("supportingRequests", s.supportingRequests, `${s.supportingRequests}/100 — correlated support tickets and feedback volume.`));
  if (s.customerSentiment != null)
    dims.push(buildDimension("customerSentiment", s.customerSentiment, `Sentiment score: ${s.customerSentiment}/100 — negative feedback increases urgency.`));
  if (s.strategicAlignment != null)
    dims.push(buildDimension("strategicAlignment", s.strategicAlignment, `Strategic alignment: ${s.strategicAlignment}/100 vs company objectives.`));
  if (s.urgency != null)
    dims.push(buildDimension("urgency", s.urgency, `Urgency: ${s.urgency}/100 — deadline pressure and time sensitivity.`));
  if (s.complexity != null)
    dims.push(buildDimension("complexity", s.complexity, `Complexity: ${s.complexity}/100 — higher complexity reduces delivery priority unless impact is critical.`));
  if (s.estimatedEffort != null)
    dims.push(buildDimension("estimatedEffort", s.estimatedEffort, `Effort estimate: ${s.estimatedEffort}/100 — larger effort increases schedule risk.`));
  if (s.dependencies != null)
    dims.push(buildDimension("dependencies", s.dependencies, `Dependencies: ${s.dependencies}/100 — more blockers increase coordination cost.`));
  if (s.technicalRisk != null)
    dims.push(buildDimension("technicalRisk", s.technicalRisk, `Technical risk: ${s.technicalRisk}/100.`));
  if (s.securityRisk != null)
    dims.push(buildDimension("securityRisk", s.securityRisk, `Security risk: ${s.securityRisk}/100.`));
  if (s.businessRisk != null)
    dims.push(buildDimension("businessRisk", s.businessRisk, `Business risk: ${s.businessRisk}/100.`));
  if (s.resourceAvailability != null)
    dims.push(buildDimension("resourceAvailability", s.resourceAvailability, `Resource availability: ${s.resourceAvailability}/100 — team capacity to deliver.`));
  if (s.estimatedRoi != null)
    dims.push(buildDimension("estimatedRoi", s.estimatedRoi, `ROI estimate: ${s.estimatedRoi}/100.`));
  if (s.confidence != null)
    dims.push(buildDimension("confidence", s.confidence, `AI confidence: ${s.confidence}/100 — quality of evidence.`));
  if (s.historicalSuccess != null)
    dims.push(buildDimension("historicalSuccess", s.historicalSuccess, `Historical success: ${s.historicalSuccess}/100 — similar past initiatives.`));

  const totalWeight = dims.reduce((a, d) => a + d.weight, 0) || 1;
  const overallScore = clamp(
    dims.reduce((sum, d) => {
      const effective = INVERSE_DIMENSIONS.has(d.key) ? 100 - d.score : d.score;
      return sum + effective * (d.weight / totalWeight);
    }, 0)
  );

  const confidenceScore = clamp(s.confidence ?? overallScore * 0.85);
  const riskDims = dims.filter((d) =>
    ["technicalRisk", "securityRisk", "businessRisk", "complexity"].includes(d.key)
  );
  const riskScore =
    riskDims.length > 0
      ? clamp(riskDims.reduce((a, d) => a + d.score, 0) / riskDims.length)
      : clamp(100 - overallScore * 0.6);

  const businessValue = clamp(s.businessValue ?? s.customerImpact ?? overallScore);
  const complexity = clamp(s.complexity ?? s.estimatedEffort ?? 50);

  const reasoning = dims.map((d) => `${d.label}: ${d.score}/100 — ${d.reasoning}`);
  const topDrivers = [...dims]
    .sort((a, b) => b.weightedContribution - a.weightedContribution)
    .slice(0, 3)
    .map((d) => d.label);

  return {
    id: uuid(),
    entityType: input.entityType,
    entityId: input.entityId,
    projectId: input.projectId,
    title: input.title,
    overallScore,
    confidenceScore,
    riskScore,
    businessValue,
    complexity,
    dimensions: dims,
    summary: `Priority ${overallScore}/100 driven primarily by ${topDrivers.join(", ")}. Risk ${riskScore}/100.`,
    recommendedAction:
      input.recommendedAction ??
      (overallScore >= 75
        ? "Prioritise for immediate planning and resource allocation"
        : overallScore >= 50
          ? "Schedule in next roadmap cycle after dependency review"
          : "Defer — monitor for new evidence before committing resources"),
    reasoning,
    supportingEvidence: input.evidence ?? [],
    updatedAt: new Date().toISOString(),
  };
}

/** Adapters — councils call these instead of hardcoding scores */

export function priorityFromFeaturePack(input: {
  id: string;
  projectId: string;
  title: string;
  evidenceCount: number;
  estimatedImpact: EstimatedImpact;
  confidenceScore: number;
  negativeRatio: number;
  topEvidenceQuotes: string[];
}): PriorityScoreRecord {
  const demand = Math.min(input.evidenceCount * 8, 90);
  const sentiment = Math.round(input.negativeRatio * 100);
  return computePriority({
    entityType: "feature_pack",
    entityId: input.id,
    projectId: input.projectId,
    title: input.title,
    signals: {
      businessValue: impactToScore(input.estimatedImpact),
      customerImpact: demand,
      userDemand: demand,
      supportingRequests: Math.min(input.evidenceCount * 10, 95),
      customerSentiment: sentiment,
      revenueImpact: impactToScore(input.estimatedImpact) - 5,
      strategicAlignment: impactToScore(input.estimatedImpact),
      urgency: Math.round(sentiment * 0.7 + demand * 0.3),
      confidence: input.confidenceScore,
      complexity: 100 - impactToScore(input.estimatedImpact) + 20,
    },
    evidence: input.topEvidenceQuotes.slice(0, 3),
    recommendedAction: "Promote to Proposal Council for structured analysis",
  });
}

export function priorityFromProposal(input: {
  id: string;
  projectId: string;
  title: string;
  riskLevel?: "low" | "medium" | "high";
  voteApproveRatio?: number;
  evidenceCount?: number;
  pros?: string[];
}): PriorityScoreRecord {
  const risk = riskToScore(input.riskLevel);
  const votes = Math.round((input.voteApproveRatio ?? 0.5) * 100);
  return computePriority({
    entityType: "proposal",
    entityId: input.id,
    projectId: input.projectId,
    title: input.title,
    signals: {
      businessValue: 100 - risk + 15,
      strategicAlignment: votes,
      urgency: votes > 70 ? 75 : 50,
      technicalRisk: risk,
      businessRisk: risk,
      confidence: votes,
      userDemand: Math.min((input.evidenceCount ?? 1) * 15, 90),
      customerImpact: Math.min((input.evidenceCount ?? 1) * 12, 85),
    },
    evidence: input.pros?.slice(0, 2),
    recommendedAction: votes >= 70 ? "Ready for manager approval review" : "Gather more team consensus",
  });
}

export function priorityFromTask(input: {
  id: string;
  projectId: string;
  title: string;
  status: string;
  branchPriority?: number;
}): PriorityScoreRecord {
  const blocked = input.status === "blocked" ? 90 : input.status === "in_progress" ? 70 : 50;
  return computePriority({
    entityType: "task",
    entityId: input.id,
    projectId: input.projectId,
    title: input.title,
    signals: {
      urgency: blocked,
      businessValue: input.branchPriority ?? 60,
      complexity: 45,
      resourceAvailability: input.status === "blocked" ? 30 : 65,
    },
    recommendedAction:
      input.status === "blocked"
        ? "Unblock dependencies before continuing sprint"
        : input.status === "pending"
          ? "Assign owner and start in current sprint"
          : "Continue — on track",
  });
}

export function priorityFromBranch(input: {
  id: string;
  projectId: string;
  title: string;
  status: string;
  proposalPriority?: number;
}): PriorityScoreRecord {
  const active = input.status === "implementing" ? 85 : input.status === "open" ? 70 : 40;
  return computePriority({
    entityType: "branch",
    entityId: input.id,
    projectId: input.projectId,
    title: input.title,
    signals: {
      businessValue: input.proposalPriority ?? active,
      urgency: active,
      strategicAlignment: input.proposalPriority ?? 65,
      resourceAvailability: input.status === "implementing" ? 55 : 75,
    },
    recommendedAction:
      input.status === "open"
        ? "Run Planning Council then start implementation"
        : input.status === "implementing"
          ? "Complete testing and evaluation cycle"
          : "Archive learnings to Project Brain",
  });
}

export { impactToScore, riskToScore };
