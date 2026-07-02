import type { DecisionIntelligenceReport, DecisionComparison, PriorityScoreRecord } from "@/lib/types";

export function buildDecisionIntelligence(
  candidates: PriorityScoreRecord[],
  context?: { activeDeadline?: string; revenueAtRisk?: string }
): DecisionIntelligenceReport | null {
  if (candidates.length === 0) return null;

  const sorted = [...candidates].sort((a, b) => b.overallScore - a.overallScore);
  const top = sorted[0];
  const rest = sorted.slice(1, 4);

  const prioritize: DecisionComparison = {
    entityId: top.entityId,
    title: top.title,
    score: top.overallScore,
    shouldPrioritize: true,
    reasoning: [
      `Highest priority score (${top.overallScore}/100) among ${candidates.length} candidates`,
      ...top.reasoning.slice(0, 2),
      `Recommended action: ${top.recommendedAction}`,
    ],
    delayImpact: `Delaying "${top.title}" risks ${top.riskScore >= 60 ? "missing critical deadline and customer SLA" : "moderate schedule slip"}`,
    blockedItems: rest.filter((r) => r.overallScore > 60).map((r) => r.title),
    affectedCustomers: top.supportingEvidence.length
      ? [`Users cited in: ${top.supportingEvidence[0]?.slice(0, 60)}…`]
      : ["Customer segments tied to highest-demand feature packs"],
    revenueImpact: context?.revenueAtRisk ?? `Est. ${Math.round(top.businessValue * 0.15)}% revenue uplift if shipped on time`,
    engineeringImpact: `${top.complexity}/100 complexity — ${top.complexity > 65 ? "requires senior engineer allocation" : "standard team capacity"}`,
  };

  const defer: DecisionComparison[] = rest.map((r) => ({
    entityId: r.entityId,
    title: r.title,
    score: r.overallScore,
    shouldPrioritize: false,
    reasoning: [
      `Score ${r.overallScore}/100 — ${top.overallScore - r.overallScore} points below "${top.title}"`,
      `Defer until ${top.title} reaches testing phase or capacity frees`,
      r.recommendedAction,
    ],
    delayImpact: `Waiting preserves ${100 - r.riskScore}% lower risk exposure short-term`,
    engineeringImpact: "Engineering effort unchanged if deferred one sprint",
  }));

  return {
    prioritize,
    defer,
    summary: `Decision Intelligence: Prioritise "${top.title}" (${top.overallScore}/100). ${defer.length} item(s) should wait. ${context?.activeDeadline ? `Active deadline: ${context.activeDeadline}.` : ""} Humans approve all commitments.`,
    generatedAt: new Date().toISOString(),
  };
}
