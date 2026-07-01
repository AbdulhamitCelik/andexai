export const AGENT_SKILLS: Record<string, { title: string; skills: string[] }> = {
  project_brain: {
    title: "Project Brain Agent",
    skills: [
      "projectBrain.getCurrentState(projectId)",
      "projectBrain.updateApprovedState(projectId, approvedChange)",
      "projectBrain.getDecisionHistory(projectId)",
      "projectBrain.explainCurrentDirection(projectId)",
      "projectBrain.compareWithProposal(projectId, proposalId)",
    ],
  },
  proposal: {
    title: "Proposal Agent",
    skills: [
      "proposal.createProposal(projectId, authorId, proposalText)",
      "proposal.classifyProposal(proposalId)",
      "proposal.findDuplicates(projectId, proposalId)",
      "proposal.attachContext(proposalId)",
      "proposal.submitForReview(proposalId)",
    ],
  },
  product_discovery: {
    title: "Product Discovery Agent",
    skills: [
      "discovery.ingestFeedback(projectId, feedbackItems[])",
      "discovery.clusterSimilarFeedback(projectId)",
      "discovery.generateFeaturePacks(projectId)",
      "discovery.rankByPriority(projectId)",
      "discovery.promoteToProposal(featurePackId, target)",
    ],
  },
  impact: {
    title: "Impact Analysis Agent",
    skills: [
      "impact.analyseProposalImpact(projectId, proposalId)",
      "impact.findAffectedRequirements(projectId, proposalId)",
      "impact.findAffectedTasks(projectId, proposalId)",
      "impact.estimateRework(projectId, proposalId)",
      "impact.detectBreakingChanges(projectId, proposalId)",
      "impact.generateImpactReport(projectId, proposalId)",
    ],
  },
  review: {
    title: "Review Agent",
    skills: [
      "review.generatePros(proposalId)",
      "review.generateCons(proposalId)",
      "review.generateTradeoffs(proposalId)",
      "review.suggestAlternatives(proposalId)",
      "review.recommendReviewers(projectId, proposalId)",
      "review.generateReviewSummary(proposalId)",
    ],
  },
  consensus: {
    title: "Consensus Agent",
    skills: [
      "consensus.castVote(proposalId, userId, vote, comment)",
      "consensus.getVoteStatus(proposalId)",
      "consensus.detectStalemate(proposalId)",
      "consensus.checkApprovalThreshold(proposalId)",
      "consensus.finaliseDecision(proposalId)",
    ],
  },
  branch: {
    title: "Branch Agent",
    skills: [
      "branch.createProposalBranch(projectId, proposalId)",
      "branch.compareBranchToMain(projectId, branchId)",
      "branch.mergeBranchToMain(projectId, branchId)",
      "branch.rollbackToPreviousState(projectId, versionId)",
      "branch.archiveBranch(branchId)",
    ],
  },
  implementation: {
    title: "Implementation Agent",
    skills: [
      "implementation.generateTasks(projectId, proposalId)",
      "implementation.generateTaskDependencies(projectId, proposalId)",
      "implementation.updateAffectedTasks(projectId, proposalId)",
      "implementation.preserveUnchangedTasks(projectId, proposalId)",
      "implementation.generateImplementationPlan(projectId)",
    ],
  },
  knowledge: {
    title: "Knowledge Agent",
    skills: [
      "knowledge.storeDecision(projectId, decision)",
      "knowledge.searchPastDecisions(projectId, query)",
      "knowledge.explainDecision(projectId, decisionId)",
      "knowledge.getRejectedIdeas(projectId)",
      "knowledge.traceDecisionLineage(projectId, decisionId)",
    ],
  },
  drift_detection: {
    title: "Drift Detection Agent",
    skills: [
      "drift.compareImplementationToMain(projectId)",
      "drift.detectRequirementDrift(projectId)",
      "drift.detectTaskDrift(projectId)",
      "drift.calculateAlignmentScore(projectId)",
      "drift.generateDriftAlert(projectId)",
    ],
  },
  communication: {
    title: "Communication Agent",
    skills: [
      "communication.notifyReviewers(proposalId)",
      "communication.sendProposalSummary(proposalId)",
      "communication.sendDecisionUpdate(projectId, decisionId)",
      "communication.generateDailyDigest(projectId)",
      "communication.notifyAffectedMembers(projectId, proposalId)",
    ],
  },
  progress: {
    title: "Progress Agent",
    skills: [
      "progress.getProjectProgress(projectId)",
      "progress.detectBlockers(projectId)",
      "progress.generateSprintSummary(projectId)",
      "progress.estimateCompletionDate(projectId)",
      "progress.trackTaskVelocity(projectId)",
    ],
  },
  evolution: {
    title: "Evolution Agent",
    skills: [
      "evolution.archiveOldRequirement(projectId, requirementId)",
      "evolution.compareRequirementVersions(projectId, oldVersion, newVersion)",
      "evolution.migrateTasksToNewRequirement(projectId, proposalId)",
      "evolution.generateChangeLog(projectId)",
      "evolution.restoreRequirementVersion(projectId, versionId)",
    ],
  },
  permission: {
    title: "Permission Agent",
    skills: [
      "permission.canAccess(userId, resourceId, action)",
      "permission.filterAccessibleMemory(userId, memories[])",
      "permission.assertAccess(userId, resourceId, action)",
      "permission.writeAuditLog(userId, action, resourceId)",
      "permission.filterMemoryByAccess(userId, memoryResults)",
    ],
  },
  analytics: {
    title: "Analytics Agent",
    skills: [
      "analytics.getProposalStats(projectId)",
      "analytics.getTeamAlignmentMetrics(projectId)",
      "analytics.getRiskDashboard(projectId)",
      "analytics.getDecisionTimeline(projectId)",
      "analytics.generateProjectHealthReport(projectId)",
    ],
  },
  orchestrator: {
    title: "Orchestrator Agent",
    skills: [
      "orchestrator.routeEvent(event)",
      "orchestrator.runProposalWorkflow(projectId, proposalText, authorId)",
      "orchestrator.runApprovalWorkflow(proposalId)",
      "orchestrator.runImplementationUpdate(projectId, proposalId)",
      "orchestrator.handleAgentFailure(agentName, taskId)",
    ],
  },
};

export const AGENT_COLORS: Record<string, string> = {
  project_brain: "bg-purple-500/20 text-purple-400",
  proposal: "bg-blue-500/20 text-blue-400",
  impact: "bg-orange-500/20 text-orange-400",
  review: "bg-cyan-500/20 text-cyan-400",
  consensus: "bg-green-500/20 text-green-400",
  branch: "bg-pink-500/20 text-pink-400",
  implementation: "bg-yellow-500/20 text-yellow-400",
  knowledge: "bg-slate-500/20 text-slate-400",
  communication: "bg-indigo-500/20 text-indigo-400",
  drift_detection: "bg-red-500/20 text-red-400",
  product_discovery: "bg-violet-500/20 text-violet-400",
  progress: "bg-emerald-500/20 text-emerald-400",
  evolution: "bg-fuchsia-500/20 text-fuchsia-400",
  permission: "bg-stone-500/20 text-stone-400",
  analytics: "bg-teal-500/20 text-teal-400",
  orchestrator: "bg-amber-500/20 text-amber-400",
};
