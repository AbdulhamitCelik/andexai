"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/context/user-context";
import type { DecisionBranch, ProjectBrain } from "@/lib/types";
import Link from "next/link";
import { GitBranch, Trash2, Merge, Play, Plus } from "lucide-react";

export default function BranchesPage() {
  const { currentUser, isManager } = useUser();
  const [branches, setBranches] = useState<DecisionBranch[]>([]);
  const [projects, setProjects] = useState<ProjectBrain[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = () =>
    fetch("/api/branches")
      .then((r) => r.json())
      .then((d) => {
        setBranches(d.branches ?? []);
        setProjects(d.projects ?? []);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));

  useEffect(() => {
    load();
  }, []);

  const act = async (branchId: string, action: string) => {
    setActingId(branchId);
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId, action, managerId: currentUser.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Action failed");
        return;
      }
      await load();
    } catch {
      alert("Action failed — is the backend running?");
    } finally {
      setActingId(null);
    }
  };

  const active = branches.filter((b) => ["open", "implementing"].includes(b.status));
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? "Project";

  return (
    <AppShell>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Branches</h1>
          <p className="text-sm text-muted-foreground">
            When a manager accepts a suggestion on a project, a branch is created (project + suggestion). The original project is unchanged.
          </p>
        </div>

        {active.map((b) => (
          <Card key={b.id}>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base font-mono">{b.name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {projectName(b.projectId)} · from: {b.proposalTitle}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={b.status === "implementing" ? "warning" : "secondary"}>{b.status}</Badge>
                  <Badge>v{b.version}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Project still at v{b.mainVersionAtCreation} · {b.acceptedProposalIds.length} accepted suggestion(s)
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/proposals">
                  <Button size="sm" variant="outline"><Plus className="mr-1 h-3 w-3" /> Add suggestion</Button>
                </Link>
                {isManager && b.status === "open" && (
                  <Button size="sm" onClick={() => act(b.id, "start_implementation")} disabled={actingId === b.id}>
                    <Play className="mr-1 h-3 w-3" /> Start Implementation
                  </Button>
                )}
                {isManager && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => act(b.id, "merge_to_main")} disabled={actingId === b.id}>
                      <Merge className="mr-1 h-3 w-3" /> Merge to Project
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => act(b.id, "discard")} disabled={actingId === b.id}>
                      <Trash2 className="mr-1 h-3 w-3" /> Discard
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {loadError && (
          <Card className="border-red-500/30">
            <CardContent className="p-4 text-sm text-red-400">
              Failed to load branches — check that the backend is running, then refresh.
            </CardContent>
          </Card>
        )}

        {!loadError && active.length === 0 && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              No branches yet. Add a suggestion to a project and have the manager accept it.
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
