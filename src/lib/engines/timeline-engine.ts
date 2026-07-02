import type { DecisionBranch, PriorityScoreRecord, Proposal, TimelineEngineOutput } from "@/lib/types";
import { riskToScore } from "./priority-engine";

export function buildTimeline(
  proposal: Proposal,
  branch: DecisionBranch,
  priority: PriorityScoreRecord
): TimelineEngineOutput {
  const risk = proposal.impact?.riskLevel ?? "medium";
  const weeks = risk === "high" ? 8 : risk === "medium" ? 5 : 3;
  const title = proposal.title;
  const desc = proposal.description.slice(0, 120);
  const deps = proposal.impact?.dependencyImpact.map((d) => d.target).slice(0, 5) ?? ["Project Brain alignment"];
  const timelineRisk = priority.riskScore >= 70 ? "high" : priority.riskScore >= 45 ? "medium" : "low";

  const sprints = [
    {
      name: "Sprint 1 — Foundation",
      focus: "Backend & data layer",
      weekStart: 1,
      items: [`Design: ${title}`, "Database schema & migrations", "Authentication & permissions"],
    },
    {
      name: "Sprint 2 — Core build",
      focus: "Feature implementation",
      weekStart: 3,
      items: [`Implement: ${title}`, desc || "Core feature scope", "API integration"],
    },
    {
      name: "Sprint 3 — Frontend & polish",
      focus: "User-facing delivery",
      weekStart: 5,
      items: ["UI components", "Accessibility pass", "Internationalisation hooks"],
    },
    {
      name: "Sprint 4 — Test & deploy",
      focus: "Quality and release",
      weekStart: 7,
      items: ["QA regression", "Performance testing", "Deployment & monitoring"],
    },
  ];

  const milestones = [
    { name: "Architecture sign-off", week: 1, priority: priority.overallScore },
    { name: "MVP feature complete", week: weeks - 2, priority: priority.overallScore - 5 },
    { name: "Release candidate", week: weeks, priority: priority.overallScore },
  ];

  const criticalPath = ["Design", "Backend API", "Core feature", "QA", "Deploy"];

  const dependencyGraph = deps.map((dep, i) => ({
    from: i === 0 ? title : deps[i - 1],
    to: dep,
    type: i === 0 ? "blocks" : "depends_on",
  }));

  const delayPredictions =
    timelineRisk === "high"
      ? [`${title} may slip 1–2 sprints if ${deps[0]} is delayed`, "Peak traffic window requires early load testing"]
      : timelineRisk === "medium"
        ? ["Minor slip possible if QA finds regression in payment flows"]
        : ["On track for planned release window"];

  return {
    roadmap: [
      {
        rank: 1,
        entityId: branch.id,
        title,
        businessPriority: priority.overallScore,
        riskLevel: risk,
        estimatedDurationWeeks: weeks,
        estimatedCost: risk === "high" ? "$120k–$180k" : risk === "medium" ? "$60k–$100k" : "$30k–$60k",
        requiredSkills: ["Backend", "Frontend", "QA", "DevOps"],
        requiredTeams: ["Platform", "Product Engineering", "QA"],
        roadmapPosition: 1,
        recommendedOrder: 1,
        dependencies: deps,
      },
    ],
    sprints,
    milestones,
    criticalPath,
    dependencyGraph,
    deliveryForecast: `Week ${weeks} delivery forecast at ${priority.confidenceScore}% confidence`,
    releaseForecast: `Release candidate week ${weeks} — ${timelineRisk} timeline risk`,
    delayPredictions,
    timelineRisk,
    summary: `Timeline Engine: ${weeks}-week roadmap for "${title}" with ${timelineRisk} risk. Adapts when priority score changes (currently ${priority.overallScore}/100).`,
  };
}

export function adaptTimelineOnPriorityChange(
  timeline: TimelineEngineOutput,
  oldPriority: number,
  newPriority: number
): TimelineEngineOutput {
  if (Math.abs(oldPriority - newPriority) < 10) return timeline;

  const shifted = newPriority > oldPriority;
  const adjusted = timeline.sprints.map((s, i) => ({
    ...s,
    weekStart: shifted ? Math.max(1, s.weekStart - 1) : s.weekStart + (i > 0 ? 1 : 0),
  }));

  return {
    ...timeline,
    sprints: adjusted,
    delayPredictions: shifted
      ? ["Priority increased — recommend pulling sprint items forward"]
      : ["Priority decreased — consider deferring Sprint 3 polish to next cycle"],
    summary: `${timeline.summary} Recalculated after priority change ${oldPriority} → ${newPriority}.`,
  };
}

export { riskToScore };
