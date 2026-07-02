import type {
  CouncilId,
  CouncilRun,
  DecisionBranch,
  FeaturePack,
  LifecyclePhaseState,
  Proposal,
} from "@/lib/types";
import { COUNCILS } from "./registry";

export function resolveLifecyclePhases(input: {
  featurePacks: FeaturePack[];
  proposals: Proposal[];
  branches: DecisionBranch[];
  councilRuns: CouncilRun[];
  projectId: string;
}): LifecyclePhaseState[] {
  const { featurePacks, proposals, branches, councilRuns, projectId } = input;
  const projectPacks = featurePacks.filter((f) => f.projectId === projectId);
  const projectProposals = proposals.filter((p) => p.projectId === projectId);
  const projectBranches = branches.filter((b) => b.projectId === projectId);
  const runs = councilRuns.filter((r) => r.projectId === projectId);

  const hasDiscovery = projectPacks.length > 0;
  const hasProposal = projectProposals.some((p) => p.review);
  const hasApproval = projectProposals.some((p) => p.status === "accepted");
  const hasPlanning = runs.some((r) => r.councilId === "planning");
  const hasImplementation = projectBranches.some((b) => b.status === "implementing");
  const hasTesting = runs.some((r) => r.councilId === "testing");
  const hasEvaluation = runs.some((r) => r.councilId === "evaluation");
  const hasLearning = runs.some((r) => r.councilId === "learning");

  const phaseComplete: Record<CouncilId, boolean> = {
    discovery: hasDiscovery,
    proposal: hasProposal,
    approval: hasApproval,
    planning: hasPlanning,
    implementation: hasImplementation,
    testing: hasTesting,
    evaluation: hasEvaluation,
    learning: hasLearning,
  };

  let activeSet = false;
  return COUNCILS.map((council) => {
    const complete = phaseComplete[council.id];
    const report = runs.find((r) => r.councilId === council.id);
    let status: LifecyclePhaseState["status"] = "pending";

    if (complete) status = "complete";
    else if (!activeSet && !complete) {
      status = "active";
      activeSet = true;
    } else if (!complete) status = "locked";

    if (council.id === "approval" && projectProposals.some((p) => ["consensus_pending", "ready_for_manager"].includes(p.status))) {
      status = "active";
    }

    return {
      id: council.id,
      label: council.label,
      status,
      agents: council.agents.map((a) => a.name),
      summary: report ? `${council.label} report available` : undefined,
      reportId: report?.id,
    };
  });
}

export function latestRun(runs: CouncilRun[], councilId: CouncilId): CouncilRun | undefined {
  return runs.filter((r) => r.councilId === councilId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}
