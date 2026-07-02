import type { CouncilId } from "@/lib/types";

export interface CouncilDefinition {
  id: CouncilId;
  label: string;
  purpose: string;
  agents: { id: string; name: string; role: string }[];
  inputs: string[];
  outputs: string[];
}

export const COUNCILS: CouncilDefinition[] = [
  {
    id: "discovery",
    label: "Discovery Council",
    purpose: "Discover product opportunities from raw customer feedback.",
    agents: [
      { id: "feature_discovery", name: "Feature Discovery Agent", role: "Cluster feedback into themes" },
      { id: "complaint_clustering", name: "Complaint Clustering Agent", role: "Group repeated complaints" },
      { id: "geo_analysis", name: "Geo Analysis Agent", role: "Surface location patterns" },
      { id: "sentiment", name: "Sentiment Agent", role: "Score emotional tone" },
      { id: "business_value", name: "Business Value Agent", role: "Estimate impact potential" },
    ],
    inputs: ["App Reviews", "Support Tickets", "Surveys", "Social", "GitHub Issues"],
    outputs: ["Feature Packs"],
  },
  {
    id: "proposal",
    label: "Proposal Council",
    purpose: "Analyse opportunities with context, impact, and structured trade-offs.",
    agents: [
      { id: "proposal", name: "Proposal Agent", role: "Create and classify proposals" },
      { id: "impact", name: "Impact Agent", role: "Architecture and dependency analysis" },
      { id: "review", name: "Review Agent", role: "Pros, cons, risks, alternatives" },
    ],
    inputs: ["Feature Packs", "Project Brain", "Prior decisions"],
    outputs: ["Proposal package with evidence"],
  },
  {
    id: "approval",
    label: "Approval Council",
    purpose: "Human-in-the-loop consensus and manager approval.",
    agents: [
      { id: "consensus", name: "Consensus Agent", role: "Collect votes and comments" },
      { id: "communication", name: "Communication Agent", role: "Notify stakeholders" },
    ],
    inputs: ["Team votes", "Manager decision"],
    outputs: ["Decision Branch"],
  },
  {
    id: "planning",
    label: "Planning Council",
    purpose: "Transform approved proposals into executable roadmaps.",
    agents: [
      { id: "timeline", name: "Timeline Agent", role: "Sprint sequencing" },
      { id: "dependency", name: "Dependency Agent", role: "Critical path" },
      { id: "complexity", name: "Complexity Agent", role: "Effort estimation" },
      { id: "priority", name: "Priority Agent", role: "Business value ranking" },
      { id: "sprint_planning", name: "Sprint Planning Agent", role: "Sprint breakdown" },
      { id: "deadline", name: "Deadline Agent", role: "Schedule risk" },
      { id: "resource", name: "Resource Allocation Agent", role: "Owner recommendations" },
      { id: "risk_planning", name: "Risk Planning Agent", role: "Delivery risks" },
    ],
    inputs: ["Accepted proposal", "Branch scope", "Project Brain"],
    outputs: ["Roadmap", "Sprint plan", "Milestones"],
  },
  {
    id: "implementation",
    label: "Implementation Council",
    purpose: "Generate and evolve implementation tasks with lineage.",
    agents: [
      { id: "task_generation", name: "Task Generation Agent", role: "Create tasks from plan" },
      { id: "dependency_tracking", name: "Dependency Tracking Agent", role: "Task ordering" },
      { id: "progress", name: "Progress Agent", role: "Track delivery" },
      { id: "evolution", name: "Implementation Evolution Agent", role: "Update affected tasks only" },
    ],
    inputs: ["Planning report", "Accepted suggestions"],
    outputs: ["Implementation tasks"],
  },
  {
    id: "testing",
    label: "Testing Council",
    purpose: "Multi-perspective evaluation before release.",
    agents: [
      { id: "customer_sim", name: "Customer Simulation Council", role: "Persona-based review" },
      { id: "qa", name: "QA Agent", role: "Functional testing" },
      { id: "performance", name: "Performance Agent", role: "Latency and load" },
      { id: "security", name: "Security Agent", role: "Vulnerability scan" },
      { id: "ab_testing", name: "A/B Testing Agent", role: "Variant comparison" },
    ],
    inputs: ["Implementation tasks", "Proposal scope"],
    outputs: ["Structured testing report"],
  },
  {
    id: "evaluation",
    label: "Evaluation Council",
    purpose: "Executive synthesis of all council reports.",
    agents: [
      { id: "evaluation", name: "Evaluation Agent", role: "Score aggregation" },
      { id: "metrics", name: "Metrics Agent", role: "KPI analysis" },
      { id: "executive_summary", name: "Executive Summary Agent", role: "Leadership brief" },
      { id: "recommendation", name: "Recommendation Agent", role: "Ship / revise / rollback" },
    ],
    inputs: ["Planning", "Implementation", "Testing", "A/B reports"],
    outputs: ["Executive report", "Recommendation"],
  },
  {
    id: "learning",
    label: "Learning Loop",
    purpose: "Update Project Brain from completed cycles.",
    agents: [
      { id: "learning", name: "Learning Agent", role: "Extract lessons" },
      { id: "pattern", name: "Pattern Recognition Agent", role: "Find recurring themes" },
      { id: "knowledge_update", name: "Knowledge Update Agent", role: "Write institutional memory" },
    ],
    inputs: ["Evaluation report", "Testing data", "Customer feedback"],
    outputs: ["Lessons learned", "Brain updates"],
  },
];

export function getCouncil(id: CouncilId): CouncilDefinition | undefined {
  return COUNCILS.find((c) => c.id === id);
}
