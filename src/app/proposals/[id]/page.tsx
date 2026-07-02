"use client";

import { useCallback, useEffect, useState, use, useRef } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/context/user-context";
import type { Proposal } from "@/lib/types";
import type { ProposalWorkflowState } from "@/lib/proposals/proposal-workflow";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  X,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Play,
} from "lucide-react";
import type { VoteType } from "@/lib/types";
import { ImpactAnalysisPanel } from "@/components/proposals/impact-analysis-panel";
import { DecisionTimeline } from "@/components/proposals/decision-timeline";
import { ProposalEnterpriseReport } from "@/components/proposals/proposal-enterprise-report";
import { LoadingState } from "@/components/ui/loading-state";

const COMMENT_VOTES: VoteType[] = ["approve_with_comments", "needs_discussion"];

export default function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { currentUser, isManager, isWorker } = useUser();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [workflow, setWorkflow] = useState<ProposalWorkflowState | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingVote, setPendingVote] = useState<VoteType | null>(null);
  const [voteComment, setVoteComment] = useState("");
  const [submittingVote, setSubmittingVote] = useState(false);
  const [rerunningImpact, setRerunningImpact] = useState(false);
  const [runningCouncils, setRunningCouncils] = useState(false);
  const [acting, setActing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [workflowError, setWorkflowError] = useState("");
  const councilsAutoRan = useRef(false);

  const loadProposal = useCallback(() => {
    return fetch(`/api/proposals/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setProposal(d.proposal ?? null);
        setLoadFailed(false);
      })
      .catch(() => setLoadFailed(true));
  }, [id]);

  const loadWorkflow = useCallback(async () => {
    const res = await fetch(`/api/proposals/${id}/workflow`);
    const data = await res.json();
    if (!res.ok) {
      setWorkflowError(data.error ?? "Failed to load workflow");
      return null;
    }
    setWorkflowError("");
    setWorkflow(data.workflow);
    return data.workflow as ProposalWorkflowState;
  }, [id]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadProposal(), loadWorkflow()]);
    setLoading(false);
  }, [loadProposal, loadWorkflow]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const runCouncils = useCallback(async () => {
    setRunningCouncils(true);
    setWorkflowError("");
    try {
      const res = await fetch(`/api/proposals/${id}/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_councils" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Council run failed");
      setWorkflow(data.workflow);
    } catch (e) {
      setWorkflowError(e instanceof Error ? e.message : "Council run failed");
    } finally {
      setRunningCouncils(false);
    }
  }, [id]);

  // Auto-run councils once after impact analysis for demo flow
  useEffect(() => {
    if (!proposal?.impact || !workflow || runningCouncils || councilsAutoRan.current) return;
    if (workflow.gates.councilsComplete) return;
    councilsAutoRan.current = true;
    runCouncils();
  }, [proposal?.impact, workflow, runningCouncils, runCouncils]);

  const submitVote = async (voteType: VoteType, comment?: string) => {
    setSubmittingVote(true);
    try {
      const voteRes = await fetch("/api/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: id,
          action: "vote",
          vote: voteType,
          userId: currentUser.id,
          userName: currentUser.name,
          comment: comment?.trim() || undefined,
        }),
      });
      const voteData = await voteRes.json();
      if (!voteRes.ok) throw new Error(voteData.error ?? "Vote failed");

      const tallyRes = await fetch("/api/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: id, action: "tally" }),
      });
      const tallyData = await tallyRes.json();
      if (!tallyRes.ok) throw new Error(tallyData.error ?? "Tally failed");

      setPendingVote(null);
      setVoteComment("");
      await loadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to submit vote");
    } finally {
      setSubmittingVote(false);
    }
  };

  const startVote = (voteType: VoteType) => {
    if (COMMENT_VOTES.includes(voteType)) {
      setPendingVote(voteType);
      setVoteComment("");
      return;
    }
    submitVote(voteType);
  };

  const confirmCommentVote = () => {
    if (!pendingVote) return;
    if (!voteComment.trim()) {
      alert("Please add a comment before submitting your vote.");
      return;
    }
    submitVote(pendingVote, voteComment);
  };

  const rerunImpact = async () => {
    setRerunningImpact(true);
    try {
      const res = await fetch(`/api/proposals/${id}/impact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, projectId: proposal?.projectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Impact analysis failed");
      if (data.proposal) setProposal(data.proposal);
      await loadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Impact analysis failed");
    } finally {
      setRerunningImpact(false);
    }
  };

  const managerAction = async (action: "accept" | "decline") => {
    setActing(true);
    try {
      const res = await fetch("/api/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: id, action, userId: currentUser.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      await loadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <LoadingState message="Loading enterprise workflow…" className="min-h-[50vh]" />
      </AppShell>
    );
  }

  if (loadFailed) {
    return (
      <AppShell>
        <div className="p-8 text-sm text-red-400">
          Failed to load this suggestion — check that the backend is running, then refresh.
        </div>
      </AppShell>
    );
  }

  if (!proposal) return <AppShell><div className="p-8">Not found</div></AppShell>;

  const gates = workflow?.gates;
  const canVoteNow =
    isWorker &&
    Boolean(gates?.canVote) &&
    ["under_review", "consensus_pending", "needs_discussion"].includes(proposal.status);
  const canManageNow =
    isManager && !["accepted", "rejected", "archived"].includes(proposal.status);
  const myVote = proposal.votes?.find((v) => v.userId === currentUser.id);

  return (
    <AppShell>
      <div className="p-8 space-y-6 max-w-5xl">
        <Link href="/proposals" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to suggestions
        </Link>

        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold">{proposal.title}</h1>
            <Badge>{proposal.status.replace(/_/g, " ")}</Badge>
            <Badge variant="secondary">adds to {proposal.context?.targetLabel ?? proposal.targetType}</Badge>
          </div>
          <p className="mt-2 text-muted-foreground">{proposal.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">by {proposal.authorName}</p>
        </div>

        {workflow && <DecisionTimeline steps={workflow.steps} />}

        {gates && gates.blockers.length > 0 && proposal.status !== "accepted" && proposal.status !== "rejected" && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="flex items-start gap-3 p-4 text-sm">
              <ShieldAlert className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-medium text-amber-200">Governance gates active</p>
                <ul className="mt-1 list-disc pl-4 text-muted-foreground space-y-0.5">
                  {gates.blockers.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {workflowError && (
          <Card className="border-red-500/30">
            <CardContent className="p-4 text-sm text-red-400">{workflowError}</CardContent>
          </Card>
        )}

        {proposal.impact ? (
          <div className="space-y-2">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={rerunImpact} disabled={rerunningImpact}>
                {rerunningImpact ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 h-3 w-3" />
                )}
                Re-run Impact Agent
              </Button>
            </div>
            <ImpactAnalysisPanel impact={proposal.impact} />
          </div>
        ) : (
          <Card className="border-amber-500/30">
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <p className="text-sm text-muted-foreground">Impact analysis pending — required before councils and voting.</p>
              <Button size="sm" onClick={rerunImpact} disabled={rerunningImpact}>
                {rerunningImpact ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Play className="mr-1 h-3 w-3" />}
                Run Impact
              </Button>
            </CardContent>
          </Card>
        )}

        {(runningCouncils || (proposal.impact && workflow && !workflow.gates.councilsComplete)) && (
          <Card>
            <CardContent className="p-6">
              <LoadingState message="Running Planning, Testing, and Evaluation councils…" size="sm" />
            </CardContent>
          </Card>
        )}

        {workflow?.gates.councilsComplete && workflow.enterpriseReport && (
          <ProposalEnterpriseReport
            report={workflow.enterpriseReport}
            councilRuns={workflow.councilRuns}
          />
        )}

        {proposal.review?.teamSummary && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base">Team Summary — Pros & Cons</CardTitle>
              <CardDescription>Visible to all group members</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{proposal.review.teamSummary}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-emerald-400 mb-2">Pros</p>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {proposal.review.pros.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-medium text-red-400 mb-2">Cons</p>
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {proposal.review.cons.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {proposal.votes && proposal.votes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Worker Votes ({proposal.votes.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {proposal.votes.map((v) => (
                <div key={v.userId} className="rounded border border-border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{v.vote.replace(/_/g, " ")}</Badge>
                    <span className="font-medium">{v.userName}</span>
                  </div>
                  {v.comment && (
                    <p className="mt-2 text-muted-foreground pl-1 border-l-2 border-primary/40 ml-1">
                      {v.comment}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {canVoteNow && !myVote && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Vote (Worker)</CardTitle>
              <CardDescription>
                Voting opens after impact analysis and enterprise councils complete.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingVote ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium">
                    {pendingVote === "approve_with_comments" ? "Support with comment" : "Needs discussion — add your comment"}
                  </p>
                  <textarea
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[80px]"
                    placeholder="Share your reasoning or concerns..."
                    value={voteComment}
                    onChange={(e) => setVoteComment(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={confirmCommentVote} disabled={submittingVote}>
                      Submit vote
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPendingVote(null)} disabled={submittingVote}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => startVote("approve")} disabled={submittingVote}>
                    <ThumbsUp className="mr-1 h-4 w-4" /> Support
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => startVote("approve_with_comments")} disabled={submittingVote}>
                    <MessageSquare className="mr-1 h-4 w-4" /> Support with comments
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => startVote("needs_discussion")} disabled={submittingVote}>
                    Needs discussion
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => startVote("reject")} disabled={submittingVote}>
                    <ThumbsDown className="mr-1 h-4 w-4" /> Against
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isWorker && !canVoteNow && !myVote && gates && !gates.councilsComplete && proposal.impact && (
          <Card className="border-border/60">
            <CardContent className="p-4 text-sm text-muted-foreground">
              Voting unlocks after enterprise councils finish analyzing this proposal.
            </CardContent>
          </Card>
        )}

        {myVote && (
          <Card className="border-primary/20">
            <CardContent className="p-4 text-sm">
              You voted: <Badge variant="secondary">{myVote.vote.replace(/_/g, " ")}</Badge>
              {myVote.comment && <p className="mt-2 text-muted-foreground">Your comment: {myVote.comment}</p>}
            </CardContent>
          </Card>
        )}

        {canManageNow && (
          <Card className="border-amber-500/30">
            <CardHeader>
              <CardTitle className="text-base">Manager Decision</CardTitle>
              <CardDescription>
                {proposal.targetType === "main"
                  ? "Accept creates a new branch (main idea + suggestion). Main idea stays unchanged."
                  : "Accept adds to the branch. If implementing, requirements & tasks update."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!gates?.canAccept && proposal.status !== "rejected" && (
                <p className="text-xs text-amber-300/90">
                  Accept is locked until impact analysis, all councils, and team consensus are complete.
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  onClick={() => managerAction("accept")}
                  disabled={acting || !gates?.canAccept}
                >
                  <Check className="mr-1 h-4 w-4" /> {acting ? "Working..." : "Accept"}
                </Button>
                <Button variant="destructive" onClick={() => managerAction("decline")} disabled={acting}>
                  <X className="mr-1 h-4 w-4" /> Decline
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {proposal.status === "accepted" && (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-4 space-y-2">
              <p className="text-emerald-400 font-medium">✓ Accepted by manager.</p>
              {gates?.memoryUpdated && (
                <p className="text-sm text-muted-foreground">Project Brain memory updated with this decision.</p>
              )}
              {proposal.targetType === "main" ? (
                <p className="text-sm text-muted-foreground">
                  A new branch was created. Main idea unchanged. Others can add more suggestions to the branch.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Added to branch. {proposal.impact?.taskImpact.length ? "Implementation tasks were updated." : ""}
                </p>
              )}
              <Link href="/branches">
                <Button size="sm" variant="outline">View Branches</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {proposal.status === "rejected" && (
          <Card className="border-red-500/30">
            <CardContent className="p-4 text-red-400">Declined by manager. No changes made.</CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
