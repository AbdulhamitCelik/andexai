import {
  dbGetCouncilRuns,
  dbGetFeaturePacks,
  dbGetProposals,
  dbGetBranches,
  dbGetTasks,
  dbGetProposal,
  dbGetBranch,
} from "@/lib/db/repository";
import { runPlanningCouncil } from "./planning-council";
import { runTestingCouncil } from "./testing-council";
import { runEvaluationCouncil } from "./evaluation-council";
import { runLearningLoop } from "./learning-loop";
import { resolveLifecyclePhases, latestRun } from "./lifecycle";
import type { CouncilId, CouncilRun } from "@/lib/types";
import { COUNCILS } from "./registry";

export async function getLifecycleDashboard(projectId: string) {
  const [featurePacks, proposals, branches, councilRuns] = await Promise.all([
    dbGetFeaturePacks(projectId),
    dbGetProposals({ projectId }),
    dbGetBranches(),
    dbGetCouncilRuns(projectId),
  ]);

  const phases = resolveLifecyclePhases({
    featurePacks,
    proposals,
    branches: branches.filter((b) => b.projectId === projectId),
    councilRuns,
    projectId,
  });

  return {
    projectId,
    phases,
    councils: COUNCILS,
    runs: councilRuns,
    activeBranch: branches.find((b) => b.projectId === projectId && (b.status === "open" || b.status === "implementing")),
  };
}

export async function executeCouncil(
  councilId: CouncilId,
  projectId: string,
  branchId?: string
): Promise<CouncilRun | { run: CouncilRun; project?: unknown }> {
  const runs = await dbGetCouncilRuns(projectId);

  switch (councilId) {
    case "planning": {
      if (!branchId) throw new Error("branchId required for Planning Council");
      const branch = await dbGetBranch(branchId);
      if (!branch) throw new Error("Branch not found");
      const proposal = await dbGetProposal(branch.seedProposalId);
      if (!proposal) throw new Error("Seed proposal not found");
      return runPlanningCouncil(projectId, branch, proposal);
    }
    case "testing": {
      if (!branchId) throw new Error("branchId required for Testing Council");
      const branch = await dbGetBranch(branchId);
      if (!branch) throw new Error("Branch not found");
      const proposal = await dbGetProposal(branch.seedProposalId);
      if (!proposal) throw new Error("Seed proposal not found");
      const tasks = await dbGetTasks(branchId);
      return runTestingCouncil(projectId, branch, proposal, tasks);
    }
    case "evaluation": {
      if (!branchId) throw new Error("branchId required for Evaluation Council");
      const branch = await dbGetBranch(branchId);
      if (!branch) throw new Error("Branch not found");
      const proposal = await dbGetProposal(branch.seedProposalId);
      if (!proposal) throw new Error("Seed proposal not found");
      return runEvaluationCouncil(
        projectId,
        branchId,
        proposal.id,
        proposal.title,
        latestRun(runs, "planning"),
        latestRun(runs, "testing")
      );
    }
    case "learning":
      return runLearningLoop(projectId, latestRun(runs, "evaluation"));
    default:
      throw new Error(`Council "${councilId}" runs automatically through existing workflow — use Feature Packs, Proposals, or Branches pages.`);
  }
}
