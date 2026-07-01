import { v4 as uuid } from "uuid";
import type { EstimatedImpact, FeaturePack, FeedbackItem } from "@/lib/types";

interface ThemeTemplate {
  id: string;
  keywords: string[];
  title: string;
  userProblem: string;
  suggestedFeature: string;
  pros: string[];
  cons: string[];
  risks: string[];
  estimatedImpact: EstimatedImpact;
}

const THEMES: ThemeTemplate[] = [
  {
    id: "uk-checkout",
    keywords: ["checkout", "payment", "apple pay", "google pay", "slow", "freeze", "latency", "cart", "pay", "local payment"],
    title: "Improve UK Checkout Experience",
    userProblem: "UK users repeatedly report slow checkout, payment failures, and missing local payment methods.",
    suggestedFeature: "Add Apple Pay & Google Pay and optimise checkout latency for UK users",
    pros: [
      "Directly addresses highest-volume UK support tickets",
      "Reduces cart abandonment at payment step",
      "Aligns with local payment expectations in London/UK market",
    ],
    cons: [
      "Requires payment provider integration work",
      "Latency fixes may need backend infrastructure changes",
      "Regional rollout adds QA complexity",
    ],
    risks: [
      "Payment integration bugs could temporarily increase failure rates",
      "PCI compliance scope may expand",
    ],
    estimatedImpact: "high",
  },
  {
    id: "search-discovery",
    keywords: ["search", "find", "filter", "discover", "category", "autocomplete", "relevant", "browse"],
    title: "Smarter Product Search & Discovery",
    userProblem: "Users struggle to find products — search is underused and filters feel broken.",
    suggestedFeature: "Rebuild search with autocomplete, visual filters, and relevance ranking",
    pros: [
      "Improves core shopping loop for all user segments",
      "Search usage benchmark gap suggests large upside",
      "Reduces support tickets about 'can't find products'",
    ],
    cons: [
      "Search relevance tuning is iterative",
      "May require catalog metadata cleanup first",
    ],
    risks: [
      "Bad search rollout could frustrate power users",
      "Index migration downtime during deploy",
    ],
    estimatedImpact: "high",
  },
  {
    id: "notifications",
    keywords: ["notification", "push", "alert", "spam", "order status", "flash sale", "smart"],
    title: "Intelligent Notification Preferences",
    userProblem: "Users feel bombarded by generic push notifications or miss important order updates.",
    suggestedFeature: "Smart notification tiers — order updates vs personalised deals, with user controls",
    pros: [
      "Recovers users who disabled all notifications",
      "Improves engagement without increasing spam complaints",
    ],
    cons: [
      "Preference UI adds onboarding friction if over-designed",
      "Delivery timing depends on reliable backend events",
    ],
    risks: [
      "Over-segmentation could reduce campaign reach",
    ],
    estimatedImpact: "medium",
  },
  {
    id: "onboarding",
    keywords: ["signup", "sign up", "onboard", "registration", "verify", "password reset", "loyalty", "new user"],
    title: "Streamline New User Onboarding",
    userProblem: "New users abandon during a long signup flow and struggle with verification steps.",
    suggestedFeature: "Reduce signup to 2 steps with social login and deferred email verification",
    pros: [
      "Directly targets 68% drop-off at verification step",
      "Faster time-to-first-purchase for new users",
    ],
    cons: [
      "Social login adds OAuth dependency",
      "Deferred verification may increase fraud risk",
    ],
    risks: [
      "Auth changes can block existing login flows if mis-deployed",
    ],
    estimatedImpact: "medium",
  },
  {
    id: "accessibility",
    keywords: ["dark mode", "accessibility", "screen reader", "text size", "contrast", "night", "eyes"],
    title: "Accessibility & Dark Mode",
    userProblem: "Users with accessibility needs and night-time shoppers request dark mode and better readability.",
    suggestedFeature: "Ship system-aware dark mode and WCAG AA contrast pass on core screens",
    pros: [
      "847 survey votes — highest feature request in Q1",
      "Improves inclusivity and App Store accessibility rating",
    ],
    cons: [
      "Design system needs dual-theme tokens",
      "Every screen must be audited for contrast",
    ],
    risks: [
      "Incomplete dark mode looks unprofessional",
    ],
    estimatedImpact: "medium",
  },
];

function scoreItemForTheme(item: FeedbackItem, theme: ThemeTemplate): number {
  const text = `${item.text} ${item.geo ?? ""}`.toLowerCase();
  let score = 0;
  for (const kw of theme.keywords) {
    if (text.includes(kw.toLowerCase())) score += kw.includes(" ") ? 3 : 1;
  }
  if (item.sentiment === "negative") score += 0.5;
  return score;
}

function topGeo(items: FeedbackItem[]): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const geo = item.geo ?? "Global";
    counts.set(geo, (counts.get(geo) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([geo, n]) => `${geo} (${n})`);
}

function topSegments(items: FeedbackItem[]): string[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item.userSegment, (counts.get(item.userSegment) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([seg]) => seg.replace(/_/g, " "));
}

function priorityScore(count: number, impact: EstimatedImpact, negativeRatio: number): number {
  const impactWeight = impact === "high" ? 40 : impact === "medium" ? 25 : 10;
  const volumeWeight = Math.min(count * 3, 35);
  const sentimentWeight = Math.round(negativeRatio * 25);
  return Math.min(100, impactWeight + volumeWeight + sentimentWeight);
}

function confidenceScore(count: number, avgMatch: number): number {
  const volume = Math.min(count / 10, 1) * 50;
  const match = Math.min(avgMatch / 5, 1) * 50;
  return Math.round(volume + match);
}

/**
 * ProductDiscoveryAgent — clusters raw feedback into 3–5 actionable Feature Packs.
 * MVP uses keyword/thematic clustering (no LLM required for demo reliability).
 */
export function runProductDiscoveryAgent(
  projectId: string,
  feedback: FeedbackItem[]
): FeaturePack[] {
  if (feedback.length === 0) return [];

  const assignments = new Map<string, { items: FeedbackItem[]; scores: number[] }>();

  for (const item of feedback) {
    let bestTheme = THEMES[0];
    let bestScore = 0;
    for (const theme of THEMES) {
      const s = scoreItemForTheme(item, theme);
      if (s > bestScore) {
        bestScore = s;
        bestTheme = theme;
      }
    }
    if (bestScore > 0) {
      const bucket = assignments.get(bestTheme.id) ?? { items: [], scores: [] };
      bucket.items.push(item);
      bucket.scores.push(bestScore);
      assignments.set(bestTheme.id, bucket);
    }
  }

  const ranked = [...assignments.entries()]
    .filter(([, { items }]) => items.length >= 2)
    .sort((a, b) => b[1].items.length - a[1].items.length)
    .slice(0, 5);

  const now = new Date().toISOString();

  return ranked.map(([themeId, { items, scores }]) => {
    const theme = THEMES.find((t) => t.id === themeId)!;
    const negativeCount = items.filter((i) => i.sentiment === "negative").length;
    const geoInsights = topGeo(items);
    const segments = topSegments(items);
    const quotes = items.slice(0, 4).map((i) => i.text);
    const avgMatch = scores.reduce((a, b) => a + b, 0) / scores.length;

    const summary =
      theme.id === "uk-checkout"
        ? `Users in the UK repeatedly complain about slow checkout and missing local payment options. ${items.length} signals clustered.`
        : `${items.length} feedback signals point to: ${theme.userProblem.slice(0, 80)}…`;

    return {
      id: uuid(),
      projectId,
      title: theme.title,
      summary,
      userProblem: theme.userProblem,
      suggestedFeature: theme.suggestedFeature,
      evidenceCount: items.length,
      topEvidenceQuotes: quotes,
      geoInsights,
      affectedUserSegments: segments,
      pros: theme.pros,
      cons: theme.cons,
      risks: theme.risks,
      priorityScore: priorityScore(items.length, theme.estimatedImpact, negativeCount / items.length),
      confidenceScore: confidenceScore(items.length, avgMatch),
      estimatedImpact: theme.estimatedImpact,
      status: "discovered" as const,
      feedbackIds: items.map((i) => i.id),
      createdAt: now,
      updatedAt: now,
    };
  });
}

export function featurePackToProposalText(pack: FeaturePack): { title: string; description: string } {
  const evidence = pack.topEvidenceQuotes.map((q) => `• "${q}"`).join("\n");
  const geo = pack.geoInsights.length ? `\n\nGeo insights: ${pack.geoInsights.join("; ")}` : "";
  const segments = pack.affectedUserSegments.length
    ? `\nAffected segments: ${pack.affectedUserSegments.join(", ")}`
    : "";

  return {
    title: pack.title,
    description: [
      `**Discovered from ${pack.evidenceCount} user feedback signals** (Feature Pack)`,
      "",
      `**Problem:** ${pack.userProblem}`,
      "",
      `**Suggested feature:** ${pack.suggestedFeature}`,
      "",
      "**Evidence samples:**",
      evidence,
      geo,
      segments,
      "",
      `Priority score: ${pack.priorityScore}/100 | Confidence: ${pack.confidenceScore}/100 | Impact: ${pack.estimatedImpact}`,
    ].join("\n"),
  };
}
