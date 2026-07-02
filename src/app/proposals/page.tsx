"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/context/user-context";
import type { Proposal } from "@/lib/types";
import Link from "next/link";
import { Plus } from "lucide-react";

interface SuggestionTarget {
  value: string;
  label: string;
  type: "project" | "branch";
}

export default function ProposalsPage() {
  return (
    <Suspense fallback={<AppShell><div className="p-8">Loading...</div></AppShell>}>
      <ProposalsContent />
    </Suspense>
  );
}

function ProposalsContent() {
  const { currentUser } = useUser();
  const searchParams = useSearchParams();
  const preselect = searchParams.get("project");
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [targets, setTargets] = useState<SuggestionTarget[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () =>
    fetch("/api/proposals")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          setProposals([]);
          setTargets([]);
          return;
        }
        setError(null);
        setProposals(d.proposals ?? []);
        setTargets(d.targets ?? []);
        if (!target && d.targets?.length) {
          const pre = preselect ? d.targets.find((t: SuggestionTarget) => t.value === `project:${preselect}`) : null;
          setTarget(pre?.value ?? d.targets[0].value);
        }
      })
      .catch(() => {
        setError("Failed to load suggestions. Check your database connection.");
        setProposals([]);
        setTargets([]);
      });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) {
      alert("Create a project first (manager) before adding suggestions.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, authorId: currentUser.id, authorName: currentUser.name, target }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      alert(data.error ?? "Failed to submit");
      return;
    }
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
            <h1 className="text-2xl font-bold">Suggestions</h1>
            <p className="text-sm text-muted-foreground">
              Add ideas to any project or branch. AI generates a pros/cons summary for the whole team.
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} disabled={targets.length === 0}>
            <Plus className="mr-2 h-4 w-4" /> Add Suggestion
          </Button>
        </div>

        {error && (
          <Card className="border-amber-500/30">
            <CardContent className="p-4 text-sm text-amber-200">{error}</CardContent>
          </Card>
        )}

        {targets.length === 0 && !error && (
          <Card className="border-amber-500/30">
            <CardContent className="p-4 text-sm text-muted-foreground">
              No projects yet. The manager must create a project in Main Ideas first.
            </CardContent>
          </Card>
        )}

        {showForm && (
          <Card>
            <CardHeader><CardTitle>Add a Suggestion</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Add suggestion to</label>
                  <select
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    required
                  >
                    {targets.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Project names shown first. Branches appear as Project → branch.
                  </p>
                </div>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Suggestion title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <textarea
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[120px]"
                  placeholder="Describe your idea..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Analysing..." : "Submit & Get Pros/Cons"}
                </Button>
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
                    <p className="text-xs text-muted-foreground">{p.context?.targetLabel ?? p.targetType}</p>
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
