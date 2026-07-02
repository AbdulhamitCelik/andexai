import {
  dbGetProposals,
  dbGetBranches,
  dbGetTasks,
  dbGetCouncilRuns,
} from "@/lib/db/repository";
import type { ProjectBrain, Proposal } from "@/lib/types";

export interface ProjectBrainContext {
  projectId: string;
  projectName: string;
  vision: string;
  goals: string[];
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  architecture: { name: string; type: string; description: string; dependencies: string[] }[];
  activeComponents: string[];
  institutionalMemory: { title: string; content: string; source: string }[];
  constraints: string[];
}

export interface DecisionHistoryContext {
  acceptedDecisions: { id: string; title: string; summary: string; managerNote?: string }[];
  rejectedAlternatives: { id: string; title: string; reason?: string }[];
  priorTradeOffs: string[];
  relatedProposals: { id: string; title: string; status: string; overlap: string }[];
  implementationOutcomes: { branchName: string; status: string; taskCount: number; pendingTasks: number }[];
}

export interface ImpactAnalysisContext {
  proposalId: string;
  proposalTitle: string;
  proposalText: string;
  projectId: string;
  targetLabel: string;
  projectBrain: ProjectBrainContext;
  decisionHistory: DecisionHistoryContext;
  activeTasks: { title: string; status: string; assignee?: string; branchName?: string }[];
  roadmapSummary?: string;
  activeRisks: string[];
}

function severityRank(s: string): number {
  const order: Record<string, number> = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };
  return order[s] ?? 1;
}

function mapSeverityToLegacy(s: string): "low" | "medium" | "high" {
  if (s === "critical" || s === "high") return "high";
  if (s === "medium") return "medium";
  return "low";
}

export { mapSeverityToLegacy, severityRank };

export async function buildImpactAnalysisContext(
  proposal: Proposal,
  targetBrain: ProjectBrain,
  targetLabel: string
): Promise<ImpactAnalysisContext> {
  const allProposals = await dbGetProposals({ projectId: proposal.projectId });
  const branches = (await dbGetBranches()).filter((b) => b.projectId === proposal.projectId);
  const councilRuns = await dbGetCouncilRuns(proposal.projectId);

  const keywords = new Set(
    `${proposal.title} ${proposal.description}`.toLowerCase().split(/\W+/).filter((w) => w.length > 3)
  );

  const relatedProposals = allProposals
    .filter((p) => p.id !== proposal.id)
    .map((p) => {
      const overlap = keywords.has(p.title.toLowerCase().split(/\W+/)[0])
        ? "title keyword overlap"
        : p.description.toLowerCase().split(/\W+/).some((w) => keywords.has(w))
          ? "description keyword overlap"
          : "same project scope";
      return { id: p.id, title: p.title, status: p.status, overlap };
    })
    .slice(0, 8);

  const acceptedDecisions = allProposals
    .filter((p) => p.status === "accepted")
    .map((p) => ({
      id: p.id,
      title: p.title,
      summary: p.impact?.structured?.summary ?? p.impact?.summary ?? p.description.slice(0, 200),
      managerNote: p.managerNote,
    }));

  const rejectedAlternatives = allProposals
    .filter((p) => p.status === "rejected")
    .map((p) => ({
      id: p.id,
      title: p.title,
      reason: p.managerNote ?? p.review?.cons?.[0],
    }));

  const priorTradeOffs = allProposals
    .flatMap((p) => p.impact?.structured?.tradeOffs?.map((t) => `${p.title}: ${t.benefit} vs ${t.cost}`) ?? [])
    .slice(0, 10);

  const implementationOutcomes: DecisionHistoryContext["implementationOutcomes"] = [];
  const activeTasks: ImpactAnalysisContext["activeTasks"] = [];

  for (const branch of branches) {
    const tasks = await dbGetTasks(branch.id);
    const pending = tasks.filter((t) => !["completed", "cancelled"].includes(t.status));
    implementationOutcomes.push({
      branchName: branch.name,
      status: branch.status,
      taskCount: tasks.length,
      pendingTasks: pending.length,
    });
    for (const t of pending.slice(0, 15)) {
      activeTasks.push({
        title: t.title,
        status: t.status,
        assignee: t.assignee,
        branchName: branch.name,
      });
    }
  }

  const planningRun = councilRuns.find((r) => r.councilId === "planning");
  const roadmapSummary =
    planningRun && typeof planningRun.report === "object" && planningRun.report !== null && "summary" in planningRun.report
      ? String((planningRun.report as { summary?: string }).summary)
      : undefined;

  const activeRisks = [
    ...allProposals.flatMap((p) => p.impact?.structured?.risks?.map((r) => r.risk) ?? []),
    ...targetBrain.institutionalMemory.filter((m) => m.content.toLowerCase().includes("risk")).map((m) => m.title),
  ].slice(0, 12);

  const constraints = [
    ...(targetBrain.nonFunctionalRequirements ?? []),
    ...targetBrain.goals.filter((g) => g.toLowerCase().includes("must") || g.toLowerCase().includes("constraint")),
  ];

  return {
    proposalId: proposal.id,
    proposalTitle: proposal.title,
    proposalText: `${proposal.title}\n\n${proposal.description}`,
    projectId: proposal.projectId,
    targetLabel,
    projectBrain: {
      projectId: targetBrain.id,
      projectName: targetBrain.name,
      vision: targetBrain.vision,
      goals: targetBrain.goals,
      functionalRequirements: targetBrain.functionalRequirements ?? [],
      nonFunctionalRequirements: targetBrain.nonFunctionalRequirements ?? [],
      architecture: targetBrain.architecture.map((a) => ({
        name: a.name,
        type: a.type,
        description: a.description,
        dependencies: a.dependencies,
      })),
      activeComponents: targetBrain.architecture.map((a) => a.name),
      institutionalMemory: targetBrain.institutionalMemory.slice(-10).map((m) => ({
        title: m.title,
        content: m.content.slice(0, 300),
        source: m.source,
      })),
      constraints,
    },
    decisionHistory: {
      acceptedDecisions,
      rejectedAlternatives,
      priorTradeOffs,
      relatedProposals,
      implementationOutcomes,
    },
    activeTasks,
    roadmapSummary,
    activeRisks,
  };
}

export function formatContextForPrompt(ctx: ImpactAnalysisContext): string {
  return JSON.stringify(
    {
      target: ctx.targetLabel,
      projectBrain: ctx.projectBrain,
      decisionHistory: ctx.decisionHistory,
      activeImplementationTasks: ctx.activeTasks,
      currentRoadmap: ctx.roadmapSummary ?? "No planning council roadmap yet",
      knownActiveRisks: ctx.activeRisks,
    },
    null,
    2
  );
}
