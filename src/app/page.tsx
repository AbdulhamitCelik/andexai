"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProjectBrain, Proposal, AgentLog, DriftAlert } from "@/lib/types";
import { GitBranch, Brain, FileText, AlertTriangle, ArrowRight } from "lucide-react";
import { AskBrain } from "@/components/ask-brain";
import Link from "next/link";

interface DashboardData {
  project: ProjectBrain;
  proposals: Proposal[];
  stats: {
    openProposals: number;
    mergedDecisions: number;
    pendingTasks: number;
    driftAlerts: number;
  };
  agentLogs: AgentLog[];
  driftAlerts: DriftAlert[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/project")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center p-8">
          <p className="text-muted-foreground">Loading Andex AI...</p>
        </div>
      </AppShell>
    );
  }

  if (!data) return null;

  const { project, proposals, stats, agentLogs, driftAlerts } = data;

  return (
    <AppShell>
      <div className="animate-in space-y-8 p-8">
        <div className="flex items-start justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary/80">
              Project Brain
            </p>
            <h1 className="text-4xl font-bold tracking-tight">
              <span className="text-gradient">{project.name}</span>
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">{project.vision}</p>
            <div className="mt-3 flex items-center gap-2">
              <Badge>v{project.currentVersion}</Badge>
              <Badge variant="secondary">{project.architecture.length} components</Badge>
            </div>
          </div>
          <Link href="/proposals">
            <Button>
              New Proposal <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <AskBrain projectName={project.name} vision={project.vision} />

        <div className="grid gap-4 md:grid-cols-4">
          <StatCard icon={FileText} label="Open Proposals" value={stats.openProposals} />
          <StatCard icon={GitBranch} label="Merged Decisions" value={stats.mergedDecisions} />
          <StatCard icon={Brain} label="Pending Tasks" value={stats.pendingTasks} />
          <StatCard icon={AlertTriangle} label="Drift Alerts" value={stats.driftAlerts} variant={stats.driftAlerts > 0 ? "warning" : "default"} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Proposals</CardTitle>
              <CardDescription>Engineering decisions awaiting team alignment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {proposals.slice(0, 5).map((p) => (
                <Link key={p.id} href={`/proposals/${p.id}`} className="block rounded-md border border-border p-3 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{p.title}</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{p.description}</p>
                </Link>
              ))}
              {proposals.length === 0 && (
                <p className="text-sm text-muted-foreground">No proposals yet. Submit your first engineering decision.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Agent Activity</CardTitle>
              <CardDescription>Transparent, auditable AI agent actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {agentLogs.slice(0, 6).map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-sm border-b border-border/50 pb-2 last:border-0">
                  <Badge variant="secondary" className="shrink-0 text-[10px]">{log.agent.replace("_", " ")}</Badge>
                  <div>
                    <p className="font-medium">{log.action}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{log.output}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {driftAlerts.length > 0 && (
          <Card className="border-amber-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                Mental Model Drift Detected
              </CardTitle>
              <CardDescription>Discrepancies between project brain, implementation, and team understanding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {driftAlerts.map((a) => (
                <div key={a.id} className="rounded-md bg-amber-500/5 border border-amber-500/20 p-3">
                  <p className="text-sm">{a.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">→ {a.recommendation}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>The Workflow</CardTitle>
            <CardDescription>Every proposal follows the decision version control pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {["Proposal", "Context", "Impact", "Review", "Consensus", "Approval", "Branch", "Tasks", "Memory"].map((step, i) => (
                <span key={step} className="flex items-center gap-2">
                  <span className="rounded bg-primary/10 px-2 py-1 text-primary font-medium">{step}</span>
                  {i < 8 && <ArrowRight className="h-3 w-3" />}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value, variant = "default" }: { icon: React.ElementType; label: string; value: number; variant?: "default" | "warning" }) {
  return (
    <Card className="hover:glow-primary">
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`rounded-lg p-3 ${variant === "warning" ? "bg-amber-500/10" : "bg-primary/10"}`}>
          <Icon className={`h-5 w-5 ${variant === "warning" ? "text-amber-400" : "text-primary"}`} />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
    draft: "secondary",
    context_gathered: "default",
    impact_analyzed: "default",
    under_review: "warning",
    consensus_pending: "warning",
    approved: "success",
    merged: "success",
    rejected: "destructive",
    needs_discussion: "warning",
  };
  return <Badge variant={map[status] ?? "secondary"}>{status.replace(/_/g, " ")}</Badge>;
}
