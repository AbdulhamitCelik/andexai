"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProjectBrain, Proposal, AgentLog, DriftAlert } from "@/lib/types";
import { GitBranch, FileText, AlertTriangle, ArrowRight, FolderOpen, Workflow } from "lucide-react";
import { AskBrain } from "@/components/ask-brain";
import { AndexLogo } from "@/components/brand/andex-logo";
import { BrainRankingsPanel, DecisionIntelligencePanel } from "@/components/intelligence/intelligence-panel";
import { PageLoader } from "@/components/ui/loading-state";
import { useShortcuts } from "@/lib/context/shortcuts-context";
import Link from "next/link";

interface DashboardData {
  projects: ProjectBrain[];
  proposals: Proposal[];
  stats: {
    projects: number;
    openProposals: number;
    openBranches: number;
    implementing: number;
    pendingTasks: number;
    driftAlerts: number;
  };
  agentLogs: AgentLog[];
  driftAlerts: DriftAlert[];
  error?: string;
}

function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [intel, setIntel] = useState<{ rankings?: unknown; intelligence?: unknown } | null>(null);
  const { refreshKey } = useShortcuts();

  const load = () => {
    setLoading(true);
    fetch("/api/project")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setData({
            projects: [],
            proposals: [],
            stats: {
              projects: 0,
              openProposals: 0,
              openBranches: 0,
              implementing: 0,
              pendingTasks: 0,
              driftAlerts: 0,
            },
            agentLogs: [],
            driftAlerts: [],
            error: d.error,
          });
          return;
        }
        setData(d);
        const pid = d.projects?.[0]?.id;
        if (pid) {
          fetch(`/api/priority?projectId=${pid}`)
            .then((r) => r.json())
            .then(setIntel);
        }
      })
      .catch(() => {
        setData({
          projects: [],
          proposals: [],
          stats: {
            projects: 0,
            openProposals: 0,
            openBranches: 0,
            implementing: 0,
            pendingTasks: 0,
            driftAlerts: 0,
          },
          agentLogs: [],
          driftAlerts: [],
          error: "Failed to load dashboard data",
        });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [refreshKey]);

  if (loading) {
    return <PageLoader message="Loading Decision Intelligence OS…" />;
  }

  if (!data) return null;

  const projects = data.projects ?? [];
  const proposals = data.proposals ?? [];
  const agentLogs = data.agentLogs ?? [];
  const driftAlerts = data.driftAlerts ?? [];
  const stats = data.stats ?? {
    projects: projects.length,
    openProposals: 0,
    openBranches: 0,
    implementing: 0,
    pendingTasks: 0,
    driftAlerts: driftAlerts.length,
  };
  const primaryProject = projects[0];

  return (
    <div className="animate-in space-y-8 p-8">
      {data.error && (
        <Card className="border-amber-500/30">
          <CardContent className="p-4 text-sm text-amber-200">
            {data.error}
          </CardContent>
        </Card>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary/80">
            Dashboard
          </p>
          <AndexLogo size="md" showAi />
          <p className="max-w-2xl text-sm text-muted-foreground">
            {stats.projects > 0
              ? `${stats.projects} project(s) — team adds suggestions, workers vote, manager decides.`
              : "Manager creates the project brief. Team adds suggestions from there."}
          </p>
        </div>
        {stats.projects > 0 ? (
          <Link href="/proposals">
            <Button>
              Add Suggestion <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <Button disabled>
            Add Suggestion <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>

      {primaryProject && (
        <div className="grid gap-6 lg:grid-cols-2">
          <BrainRankingsPanel rankings={intel?.rankings as Parameters<typeof BrainRankingsPanel>[0]["rankings"]} />
          <DecisionIntelligencePanel intelligence={intel?.intelligence as Parameters<typeof DecisionIntelligencePanel>[0]["intelligence"]} />
        </div>
      )}

      {primaryProject && (
        <AskBrain projectId={primaryProject.id} />
      )}

      <Link href="/lifecycle">
        <Card className="glass sakura-border hover:glow-primary transition-all cursor-pointer overflow-hidden">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-rose-500/15 p-3">
                <Workflow className="h-6 w-6 text-rose-300" />
              </div>
              <div>
                <p className="font-display text-[11px] text-rose-300/70 tracking-widest uppercase">Product lifecycle</p>
                <p className="font-semibold">Product Operating System</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Discovery → Proposal → Approval → Planning → Implementation → Testing → Evaluation → Learning
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FolderOpen} label="Projects" value={stats.projects} />
        <StatCard icon={FileText} label="Open Suggestions" value={stats.openProposals} />
        <StatCard icon={GitBranch} label="Open Branches" value={stats.openBranches} />
        <StatCard
          icon={AlertTriangle}
          label="Drift Alerts"
          value={stats.driftAlerts}
          variant={stats.driftAlerts > 0 ? "warning" : "default"}
        />
      </div>

      {projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Main Ideas</CardTitle>
            <CardDescription>Original project briefs — view only for workers</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/brain/${p.id}`}
                className="rounded-md border border-border p-3 hover:bg-accent/30 transition-colors"
              >
                <p className="font-medium text-sm">{p.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.vision}</p>
                <div className="mt-2 flex gap-2">
                  <Badge variant="secondary" className="text-[10px]">v{p.currentVersion}</Badge>
                  {(p.functionalRequirements?.length ?? 0) + (p.nonFunctionalRequirements?.length ?? 0) > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {(p.functionalRequirements?.length ?? 0) + (p.nonFunctionalRequirements?.length ?? 0)} reqs
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Suggestions</CardTitle>
            <CardDescription>Engineering decisions awaiting team alignment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {proposals.slice(0, 5).map((p) => (
              <Link
                key={p.id}
                href={`/proposals/${p.id}`}
                className="block rounded-md border border-border p-3 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 flex-1 font-medium text-sm break-words line-clamp-2">{p.title}</span>
                  <Badge variant="secondary" className="shrink-0">{p.status.replace(/_/g, " ")}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2 break-words">{p.description}</p>
              </Link>
            ))}
            {proposals.length === 0 && (
              <p className="text-sm text-muted-foreground">No suggestions yet.</p>
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
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  {log.agent.replace(/_/g, " ")}
                </Badge>
                <div>
                  <p className="font-medium">{log.action}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{log.output}</p>
                </div>
              </div>
            ))}
            {agentLogs.length === 0 && (
              <p className="text-sm text-muted-foreground">No agent activity yet.</p>
            )}
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
            <CardDescription>
              Discrepancies between project brain, implementation, and team understanding
            </CardDescription>
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
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  variant = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  variant?: "default" | "warning";
}) {
  return (
    <Card className="hover:glow-primary">
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`shrink-0 rounded-lg p-3 ${variant === "warning" ? "bg-amber-500/10" : "bg-primary/10"}`}>
          <Icon className={`h-5 w-5 ${variant === "warning" ? "text-amber-400" : "text-primary"}`} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
