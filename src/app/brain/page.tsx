"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProjectBrain } from "@/lib/types";

export default function BrainPage() {
  const [brain, setBrain] = useState<ProjectBrain | null>(null);

  useEffect(() => {
    fetch("/api/project").then((r) => r.json()).then((d) => setBrain(d.project));
  }, []);

  if (!brain) return <AppShell><div className="p-8">Loading...</div></AppShell>;

  return (
    <AppShell>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Project Brain</h1>
          <p className="text-sm text-muted-foreground">Agent 1 — Institutional memory, architecture, and vision</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Vision</CardTitle>
            <CardDescription>v{brain.currentVersion}</CardDescription>
          </CardHeader>
          <CardContent><p className="text-sm">{brain.vision}</p></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Goals</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-sm space-y-1">{brain.goals.map((g) => <li key={g}>{g}</li>)}</ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Architecture ({brain.architecture.length} components)</CardTitle></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {brain.architecture.map((node) => (
              <div key={node.id} className="rounded-md border border-border p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{node.name}</span>
                  <Badge variant="secondary">{node.type}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{node.description}</p>
                {node.dependencies.length > 0 && (
                  <p className="mt-2 text-xs">deps: {node.dependencies.join(", ")}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Institutional Memory</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {brain.institutionalMemory.map((m) => (
              <div key={m.id} className="rounded-md border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{m.title}</span>
                  <Badge variant="secondary">{m.source}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{m.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
