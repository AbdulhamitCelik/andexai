"use client";

import { useEffect, useState, use } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Proposal } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft, Check, X, MessageSquare } from "lucide-react";

export default function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () =>
    fetch(`/api/proposals/${id}`)
      .then((r) => r.json())
      .then((d) => setProposal(d.proposal))
      .finally(() => setLoading(false));

  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const vote = async (voteType: string) => {
    await fetch("/api/proposals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId: id, action: "vote", vote: voteType, userId: "user-1", userName: "Demo User" }),
    });
    await fetch("/api/proposals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId: id, action: "check_consensus" }),
    });
    load();
  };

  const approve = async () => {
    await fetch("/api/proposals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proposalId: id, action: "approve" }),
    });
    load();
  };

  if (loading) return <AppShell><div className="p-8">Loading...</div></AppShell>;
  if (!proposal) return <AppShell><div className="p-8">Proposal not found</div></AppShell>;

  return (
    <AppShell>
      <div className="p-8 space-y-6 max-w-4xl">
        <Link href="/proposals" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to proposals
        </Link>

        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{proposal.title}</h1>
            <Badge>{proposal.status.replace(/_/g, " ")}</Badge>
          </div>
          <p className="mt-2 text-muted-foreground">{proposal.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">by {proposal.authorName}</p>
        </div>

        {proposal.context && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Context Gathered</CardTitle>
              <CardDescription>Proposal Agent — retrieved institutional knowledge</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{proposal.context.summary}</p>
              {proposal.context.relatedDecisions.length > 0 && (
                <div>
                  <p className="font-medium text-muted-foreground">Related Decisions:</p>
                  <ul className="list-disc pl-5">{proposal.context.relatedDecisions.map((d) => <li key={d}>{d}</li>)}</ul>
                </div>
              )}
              {proposal.context.duplicates.length > 0 && (
                <p className="text-amber-400">⚠ Possible duplicates: {proposal.context.duplicates.join(", ")}</p>
              )}
            </CardContent>
          </Card>
        )}

        {proposal.impact && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Impact Analysis</CardTitle>
              <CardDescription>Impact Agent — dependency & architecture analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{proposal.impact.summary}</p>
              <div className="flex gap-2">
                <Badge variant={proposal.impact.riskLevel === "high" ? "destructive" : proposal.impact.riskLevel === "medium" ? "warning" : "success"}>
                  Risk: {proposal.impact.riskLevel}
                </Badge>
                <Badge variant="secondary">Est: {proposal.impact.costEstimate}</Badge>
              </div>
              {proposal.impact.architectureImpact.map((i) => (
                <div key={i.target} className="rounded border border-border p-2">
                  <span className="font-medium">{i.target}</span> — {i.description}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {proposal.review && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base text-emerald-400">Pros</CardTitle></CardHeader>
              <CardContent><ul className="list-disc pl-5 text-sm space-y-1">{proposal.review.pros.map((p) => <li key={p}>{p}</li>)}</ul></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base text-red-400">Cons</CardTitle></CardHeader>
              <CardContent><ul className="list-disc pl-5 text-sm space-y-1">{proposal.review.cons.map((c) => <li key={c}>{c}</li>)}</ul></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Risks & Trade-offs</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                {proposal.review.risks.map((r) => <p key={r}>⚠ {r}</p>)}
                {proposal.review.tradeoffs.map((t) => <p key={t} className="text-muted-foreground">↔ {t}</p>)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Questions for Reviewers</CardTitle></CardHeader>
              <CardContent><ul className="list-disc pl-5 text-sm space-y-1">{proposal.review.questions.map((q) => <li key={q}>{q}</li>)}</ul></CardContent>
            </Card>
          </div>
        )}

        {proposal.votes && proposal.votes.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Team Votes</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {proposal.votes.map((v) => (
                <div key={v.userId} className="flex items-center gap-2 text-sm">
                  <Badge variant="secondary">{v.vote}</Badge>
                  <span>{v.userName}</span>
                  {v.comment && <span className="text-muted-foreground">— {v.comment}</span>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!["merged", "rejected", "approved"].includes(proposal.status) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Human Review — You Decide</CardTitle>
              <CardDescription>AI recommends. Humans approve. Never automatic.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => vote("approve")}><Check className="mr-1 h-4 w-4" /> Approve</Button>
              <Button size="sm" variant="outline" onClick={() => vote("approve_with_comments")}><MessageSquare className="mr-1 h-4 w-4" /> Approve with Comments</Button>
              <Button size="sm" variant="outline" onClick={() => vote("needs_discussion")}><MessageSquare className="mr-1 h-4 w-4" /> Needs Discussion</Button>
              <Button size="sm" variant="destructive" onClick={() => vote("reject")}><X className="mr-1 h-4 w-4" /> Reject</Button>
            </CardContent>
          </Card>
        )}

        {["approved", "consensus_pending"].includes(proposal.status) && !proposal.managerApproved && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-base">Manager Approval</CardTitle>
              <CardDescription>Final human gate before decision branch is created</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={approve}>Approve & Create Decision Branch</Button>
            </CardContent>
          </Card>
        )}

        {proposal.status === "merged" && (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-4">
              <p className="text-emerald-400 font-medium">✓ Decision merged. Implementation tasks generated. Project brain updated.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
