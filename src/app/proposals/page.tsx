"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Proposal } from "@/lib/types";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => fetch("/api/proposals").then((r) => r.json()).then((d) => setProposals(d.proposals));

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    const data = await res.json();
    setSubmitting(false);
    setShowForm(false);
    setTitle("");
    setDescription("");
    if (data.proposal) window.location.href = `/proposals/${data.proposal.id}`;
  };

  return (
    <AppShell>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Proposals</h1>
            <p className="text-sm text-muted-foreground">Submit and track engineering decisions</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" /> New Proposal
          </Button>
        </div>

        {showForm && (
          <Card>
            <CardHeader><CardTitle>Submit Engineering Proposal</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Proposal title (e.g. Migrate Auth to OAuth 2.0)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <textarea
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[120px]"
                  placeholder="Describe the engineering decision, rationale, and expected impact..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Running AI Pipeline..." : "Submit & Analyze"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  AI will gather context, analyze impact, and generate pros/cons. Humans always decide.
                </p>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {proposals.map((p) => (
            <Link key={p.id} href={`/proposals/${p.id}`}>
              <Card className="hover:bg-accent/30 transition-colors cursor-pointer">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-medium">{p.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">{p.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">by {p.authorName}</p>
                  </div>
                  <Badge>{p.status.replace(/_/g, " ")}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
