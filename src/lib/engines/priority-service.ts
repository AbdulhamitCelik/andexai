import { v4 as uuid } from "uuid";
import {
  dbGetFeaturePacks,
  dbGetProposals,
  dbGetBranches,
  dbGetTasks,
  dbSavePriorityScores,
  dbGetPriorityScores,
} from "@/lib/db/repository";
import {
  computePriority,
  priorityFromFeaturePack,
  priorityFromProposal,
  priorityFromTask,
  priorityFromBranch,
} from "./priority-engine";
import { buildDecisionIntelligence } from "./decision-intelligence";
import type { PriorityScoreRecord, ProjectBrainRankings } from "@/lib/types";

export async function refreshProjectPriorities(projectId: string): Promise<PriorityScoreRecord[]> {
  const [packs, proposals, branches, tasks] = await Promise.all([
    dbGetFeaturePacks(projectId),
    dbGetProposals({ projectId }),
    dbGetBranches(),
    dbGetTasks(),
  ]);

  const projectBranches = branches.filter((b) => b.projectId === projectId);
  const scores: PriorityScoreRecord[] = [];

  for (const pack of packs) {
    const negative = pack.topEvidenceQuotes.length ? 0.6 : 0.3;
    scores.push(
      priorityFromFeaturePack({
        id: pack.id,
        projectId,
        title: pack.title,
        evidenceCount: pack.evidenceCount,
        estimatedImpact: pack.estimatedImpact,
        confidenceScore: pack.confidenceScore,
        negativeRatio: negative,
        topEvidenceQuotes: pack.topEvidenceQuotes,
      })
    );
  }

  for (const p of proposals) {
    const approve = p.votes?.filter((v) => v.vote.startsWith("approve")).length ?? 0;
    const total = Math.max(p.votes?.length ?? 0, 1);
    scores.push(
      priorityFromProposal({
        id: p.id,
        projectId,
        title: p.title,
        riskLevel: p.impact?.riskLevel,
        voteApproveRatio: approve / total,
        pros: p.review?.pros,
      })
    );
  }

  for (const b of projectBranches) {
    const seedScore = scores.find((s) => s.entityId === b.seedProposalId)?.overallScore;
    scores.push(
      priorityFromBranch({
        id: b.id,
        projectId,
        title: b.proposalTitle,
        status: b.status,
        proposalPriority: seedScore,
      })
    );
  }

  for (const t of tasks.filter((tk) => projectBranches.some((b) => b.id === tk.branchId))) {
    const branch = projectBranches.find((b) => b.id === t.branchId);
    const branchScore = scores.find((s) => s.entityId === branch?.id)?.overallScore;
    scores.push(
      priorityFromTask({
        id: t.id,
        projectId,
        title: t.title,
        status: t.status,
        branchPriority: branchScore,
      })
    );
  }

  scores.push(
    computePriority({
      entityType: "project",
      entityId: projectId,
      projectId,
      title: "Project overall",
      signals: {
        businessValue: scores.length ? Math.max(...scores.map((s) => s.overallScore).filter(Number.isFinite)) : 50,
        strategicAlignment: 75,
        confidence: scores.length ? Math.round(scores.reduce((a, s) => a + s.confidenceScore, 0) / scores.length) : 50,
      },
      recommendedAction: "Review Lifecycle OS for council status",
    })
  );

  await dbSavePriorityScores(scores);
  return scores;
}

export async function getProjectBrainRankings(projectId: string): Promise<ProjectBrainRankings> {
  let scores = await dbGetPriorityScores(projectId);
  if (!scores.length) scores = await refreshProjectPriorities(projectId);

  const ranked = scores
    .filter((s) => s.entityType !== "project")
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 8);

  const top = ranked[0];

  return {
    projectId,
    topPriorities: ranked.map((s) => ({
      entityType: s.entityType,
      entityId: s.entityId,
      title: s.title,
      score: s.overallScore,
      reasoning: s.reasoning[0] ?? s.summary,
    })),
    whatMattersNow: top?.title ?? "No prioritised items yet",
    why: top?.summary ?? "Run Discovery to generate Feature Packs with priority scores",
    nextAction: top?.recommendedAction ?? "Seed project and run Discovery Council",
    updatedAt: new Date().toISOString(),
  };
}

export async function getDecisionIntelligence(projectId: string) {
  const scores = await dbGetPriorityScores(projectId);
  const candidates = scores.filter((s) =>
    ["feature_pack", "proposal", "branch"].includes(s.entityType)
  );
  return buildDecisionIntelligence(candidates);
}

export async function getPriorityForEntity(entityId: string, projectId: string) {
  const scores = await dbGetPriorityScores(projectId);
  return scores.find((s) => s.entityId === entityId);
}

export { uuid };
