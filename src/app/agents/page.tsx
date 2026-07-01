"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import type { AgentLog } from "@/lib/types";

const AGENT_COLORS: Record<string, string> = {
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
  progress: "bg-emerald-500/20 text-emerald-400",
  evolution: "bg-fuchsia-500/20 text-fuchsia-400",
  permission: "bg-stone-500/20 text-stone-400",
  analytics: "bg-teal-500/20 text-teal-400",
  orchestrator: "bg-amber-500/20 text-amber-400",
};

const AGENT_SKILLS: Record<string, { title: string; skills: string[] }> = {
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
      "permission.checkAccess(userId, resourceId, action)",
      "permission.assignRole(userId, role)",
      "permission.canApproveProposal(userId, proposalId)",
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

export default function AgentsPage() {
  const [logs, setLogs] = useState<AgentLog[]>([]);

  useEffect(() => {
    fetch("/api/agents").then((r) => r.json()).then((d) => setLogs(d.logs));
  }, []);

  return (
    <AppShell>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Agent Activity Log</h1>
          <p className="text-sm text-muted-foreground">Transparent, auditable, explainable — every AI action recorded</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Agent Skill Sets</h2>
          <p className="text-sm text-muted-foreground">Each agent headline shows the set of supported skills below.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-6">
          {Object.entries(AGENT_SKILLS).map(([agent, config]) => (
            <div key={agent} className={`rounded-md px-3 py-2 text-xs font-medium ${AGENT_COLORS[agent] ?? "bg-secondary"}`}>
              {config.title}
            </div>
          ))}
        </div>

        <section className="space-y-8 mb-8">
          {Object.entries(AGENT_SKILLS).map(([agent, config]) => (
            <Card key={agent} className="border">
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold">{config.title}</h2>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {config.skills.map((skill) => (
                    <li key={skill} className="list-disc pl-5">
                      {skill}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </section>

        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium ${AGENT_COLORS[log.agent] ?? "bg-secondary"}`}>
                    {log.agent.replace(/_/g, " ")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{log.action}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground truncate">In: {log.input}</p>
                    <p className="text-xs">{log.output}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
