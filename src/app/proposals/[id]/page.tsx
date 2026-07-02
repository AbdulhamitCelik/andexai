"use client";

import { useEffect, useState, use } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/context/user-context";
import type { Proposal } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft, Check, X, MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";
import type { VoteType } from "@/lib/types";

const COMMENT_VOTES: VoteType[] = ["approve_with_comments", "needs_discussion"];

export default function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { currentUser, isManager, isWorker } = useUser();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingVote, setPendingVote] = useState<VoteType | null>(null);
  const [voteComment, setVoteComment] = useState("");
  const [submittingVote, setSubmittingVote] = useState(false);
  const [acting, setActing] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const load = () =>
    fetch(`/api/proposals/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setProposal(d.proposal ?? null);
        setLoadFailed(false);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const submitVote = async (voteType: VoteType, comment?: string) => {
    setSubmittingVote(true);
    try {
      await fetch("/api/proposals", {
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
      await fetch("/api/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: id, action: "tally" }),
      });
      setPendingVote(null);
      setVoteComment("");
      load();
    } catch {
      alert("Failed to submit vote — is the backend running?");
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

  const managerAction = async (action: "accept" | "decline") => {
    setActing(true);
    try {
      await fetch("/api/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: id, action, userId: currentUser.id }),
      });
      await load();
    } catch {
      alert("Action failed — is the backend running?");
    } finally {
      setActing(false);
    }
  };

  if (loading) return <AppShell><div className="p-8">Loading...</div></AppShell>;
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

  const canVoteNow = isWorker && ["under_review", "consensus_pending", "ready_for_manager", "needs_discussion"].includes(proposal.status);
  const canManageNow = isManager && !["accepted", "rejected", "archived"].includes(proposal.status);
  const myVote = proposal.votes?.find((v) => v.userId === currentUser.id);

  return (
    <AppShell>
      <div className="p-8 space-y-6 max-w-4xl">
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

        {proposal.impact && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Impact Analysis</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p>{proposal.impact.summary}</p>
              <Badge variant={proposal.impact.riskLevel === "high" ? "destructive" : "warning"}>
                Risk: {proposal.impact.riskLevel}
              </Badge>
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
              <CardDescription>Workers vote on suggestions. Manager makes the final decision.</CardDescription>
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
            <CardContent className="flex gap-2">
              <Button onClick={() => managerAction("accept")} disabled={acting}>
                <Check className="mr-1 h-4 w-4" /> {acting ? "Working..." : "Accept"}
              </Button>
              <Button variant="destructive" onClick={() => managerAction("decline")} disabled={acting}>
                <X className="mr-1 h-4 w-4" /> Decline
              </Button>
            </CardContent>
          </Card>
        )}

        {proposal.status === "accepted" && (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-4 space-y-2">
              <p className="text-emerald-400 font-medium">✓ Accepted by manager.</p>
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
