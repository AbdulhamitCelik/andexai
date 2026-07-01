"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DecisionBranch } from "@/lib/types";

export default function BranchesPage() {
  const [branches, setBranches] = useState<DecisionBranch[]>([]);

  const load = () => fetch("/api/branches").then((r) => r.json()).then((d) => setBranches(d.branches));

  useEffect(() => { load(); }, []);

  const rollback = async (branchId: string) => {
    if (!confirm("Rollback project brain to this decision branch?")) return;
    await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId }),
    });
    alert("Rollback complete. Project brain restored.");
    load();
  };

  return (
    <AppShell>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Decision Branches</h1>
          <p className="text-sm text-muted-foreground">Agent 6 — Version-controlled engineering decisions (like Git branches)</p>
        </div>

        {branches.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">No decision branches yet. Approve a proposal to create one.</CardContent></Card>
        ) : (
          branches.map((b) => (
            <Card key={b.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-mono">{b.name}</CardTitle>
                  <div className="flex gap-2">
                    <Badge>v{b.version}</Badge>
                    <Badge variant={b.merged ? "success" : "warning"}>{b.merged ? "merged" : "open"}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Created {new Date(b.createdAt).toLocaleString()}
                  {b.mergedAt && ` · Merged ${new Date(b.mergedAt).toLocaleString()}`}
                </p>
                {b.merged && (
                  <Button size="sm" variant="outline" onClick={() => rollback(b.id)}>Rollback to this version</Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppShell>
  );
}
