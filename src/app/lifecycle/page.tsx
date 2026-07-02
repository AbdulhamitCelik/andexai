"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { LifecyclePipeline } from "@/components/lifecycle/lifecycle-pipeline";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/context/user-context";
import type {
  CouncilRun,
  EvaluationReport,
  LearningReport,
  LifecyclePhaseState,
  PlanningReport,
  ProjectBrain,
  TestingReport,
} from "@/lib/types";
import { COUNCILS } from "@/lib/councils/registry";
import { useShortcuts } from "@/lib/context/shortcuts-context";
import { BrainRankingsPanel, DecisionIntelligencePanel } from "@/components/intelligence/intelligence-panel";
import { EnterpriseReportView } from "@/components/intelligence/enterprise-report-view";
import { PageLoader } from "@/components/ui/loading-state";
import {
  ArrowRight,
  Brain,
  ChevronDown,
  ChevronUp,
  Loader2,
  Play,
  Scroll,
} from "lucide-react";

interface Dashboard {
  projectId: string;
  phases: LifecyclePhaseState[];
  runs: CouncilRun[];
  activeBranch?: { id: string; name: string; status: string };
}

export default function LifecyclePage() {
  return (
    <AppShell>
      <Suspense fallback={<PageLoader message="Loading lifecycle…" />}>
        <LifecycleContent />
      </Suspense>
    </AppShell>
  );
}

function LifecycleContent() {
  const { isManager } = useUser();
  const [projects, setProjects] = useState<ProjectBrain[]>([]);
  const [projectId, setProjectId] = useState("");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningCouncil, setRunningCouncil] = useState<string | null>(null);
  const [expandedCouncil, setExpandedCouncil] = useState<string | null>("planning");
  const [intel, setIntel] = useState<{ rankings?: unknown; intelligence?: unknown } | null>(null);
  const { refreshKey } = useShortcuts();

  const loadDashboard = useCallback((pid: string) => {
    if (!pid) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/councils?projectId=${pid}`).then((r) => r.json()),
      fetch(`/api/priority?projectId=${pid}`).then((r) => r.json()),
    ])
      .then(([dash, pri]) => {
        setDashboard(dash);
        setIntel(pri);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/project")
      .then((r) => r.json())
      .then((d) => {
        const list: ProjectBrain[] = d.projects ?? [];
        setProjects(list);
        if (list.length) {
          setProjectId(list[0].id);
          loadDashboard(list[0].id);
        } else {
          setLoading(false);
        }
      });
  }, [loadDashboard]);

  useEffect(() => {
    if (projectId) loadDashboard(projectId);
  }, [refreshKey, projectId, loadDashboard]);

  const runCouncil = async (councilId: string) => {
    if (!projectId || !dashboard?.activeBranch?.id) return;
    setRunningCouncil(councilId);
    try {
      const res = await fetch("/api/councils", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          councilId,
          projectId,
          branchId: dashboard.activeBranch.id,
        }),
      });
      const data = await res.json();
      if (data.dashboard) setDashboard(data.dashboard);
    } finally {
      setRunningCouncil(null);
    }
  };

  const latestRun = (id: string) => dashboard?.runs.find((r) => r.councilId === id);

  return (
    <div className="animate-in space-y-8 p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-display mb-2 text-xs font-light tracking-[0.25em] uppercase text-rose-300/70">Product lifecycle</p>
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="text-gradient">Product</span> Operating System
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Eight AI Councils coordinate discovery through learning. Humans approve every important decision.
          </p>
        </div>
        {projects.length > 0 && (
          <select
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              loadDashboard(e.target.value);
            }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </header>

      {loading ? (
        <PageLoader message="Loading council intelligence…" />
      ) : !dashboard ? (
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No project yet. Seed a demo project from the Dashboard.</p>
            <Link href="/">
              <Button>Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="glass sakura-border overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scroll className="h-5 w-5 text-rose-300" />
                Lifecycle Pipeline
              </CardTitle>
              <CardDescription>
                Discovery → Proposal → Approval → Planning → Implementation → Testing → Evaluation → Learning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LifecyclePipeline phases={dashboard.phases} />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <BrainRankingsPanel rankings={intel?.rankings as Parameters<typeof BrainRankingsPanel>[0]["rankings"]} />
            <DecisionIntelligencePanel intelligence={intel?.intelligence as Parameters<typeof DecisionIntelligencePanel>[0]["intelligence"]} />
          </div>

          {dashboard.activeBranch && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Active branch: <Badge variant="secondary">{dashboard.activeBranch.name}</Badge>
              <Badge>{dashboard.activeBranch.status}</Badge>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {COUNCILS.map((council) => {
              const phase = dashboard.phases.find((p) => p.id === council.id);
              const run = latestRun(council.id);
              const expanded = expandedCouncil === council.id;
              const canRun =
                isManager &&
                ["planning", "testing", "evaluation", "learning"].includes(council.id) &&
                dashboard.activeBranch;

              return (
                <Card key={council.id} className="glass overflow-hidden">
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => setExpandedCouncil(expanded ? null : council.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{council.label}</CardTitle>
                        <CardDescription className="mt-1">{council.purpose}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {phase && (
                          <Badge
                            variant={
                              phase.status === "complete"
                                ? "success"
                                : phase.status === "active"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {phase.status}
                          </Badge>
                        )}
                        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </CardHeader>

                  {expanded && (
                    <CardContent className="space-y-4 border-t border-border/50 pt-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Agents</p>
                        <div className="flex flex-wrap gap-1.5">
                          {council.agents.map((a) => (
                            <Badge key={a.id} variant="secondary" className="text-[10px]">
                              {a.name}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {run && (
                        <CouncilReport councilId={council.id} run={run} />
                      )}

                      <div className="flex flex-wrap gap-2">
                        {council.id === "discovery" && (
                          <Link href="/feature-packs">
                            <Button size="sm" variant="outline">
                              Open Feature Packs <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                        {council.id === "proposal" && (
                          <Link href="/proposals">
                            <Button size="sm" variant="outline">
                              Open Suggestions <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                        {council.id === "implementation" && (
                          <Link href="/tasks">
                            <Button size="sm" variant="outline">
                              Open Tasks <ArrowRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                        {council.id === "learning" && (
                          <Link href="/brain">
                            <Button size="sm" variant="outline">
                              Project Brain <Brain className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        )}
                        {canRun && (
                          <Button
                            size="sm"
                            disabled={runningCouncil === council.id}
                            onClick={() => runCouncil(council.id)}
                          >
                            {runningCouncil === council.id ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="mr-1 h-3 w-3" />
                            )}
                            Run {council.label}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function CouncilReport({ councilId, run }: { councilId: string; run: CouncilRun }) {
  const report = run.report;

  if (councilId === "planning") {
    const r = report as PlanningReport;
    return (
      <div className="space-y-3">
        {r.enterprise && <EnterpriseReportView report={r.enterprise} />}
        <div className="rounded-lg bg-muted/30 p-3 text-xs space-y-2">
          <p className="font-medium text-foreground">{r.summary}</p>
          {r.priorityScore != null && (
            <Badge variant="success">Priority {r.priorityScore} · Confidence {r.confidenceScore}</Badge>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {r.sprints.map((s) => (
              <div key={s.name} className="rounded border border-border/50 p-2">
                <p className="font-semibold text-primary">{s.name}</p>
                <p className="text-muted-foreground">{s.focus}</p>
                <ul className="mt-1 list-disc pl-4 text-muted-foreground">
                  {s.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (councilId === "testing") {
    const r = report as TestingReport;
    return (
      <div className="space-y-3">
        {r.enterprise && <EnterpriseReportView report={r.enterprise} />}
        <div className="rounded-lg bg-muted/30 p-3 text-xs space-y-2">
        <p>{r.summary}</p>
        <p className="font-medium">A/B winner: {r.abTesting.winner}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-muted-foreground">
                <th className="pr-2">Variant</th>
                <th>Conv.</th>
                <th>Ret.</th>
                <th>Sat.</th>
              </tr>
            </thead>
            <tbody>
              {r.abTesting.variants.map((v) => (
                <tr key={v.variant}>
                  <td className="pr-2">{v.variant}</td>
                  <td>{v.conversion}%</td>
                  <td>{v.retention}%</td>
                  <td>{v.satisfaction}/5</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    );
  }

  if (councilId === "evaluation") {
    const r = report as EvaluationReport;
    return (
      <div className="space-y-3">
        {r.enterprise && <EnterpriseReportView report={r.enterprise} />}
        <div className="rounded-lg bg-muted/30 p-3 text-xs space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge>Health: {r.overallHealth ?? r.overallScore}/100</Badge>
            <Badge variant={r.recommendation === "ship" ? "success" : "warning"}>
              {r.recommendation.toUpperCase()}
            </Badge>
            {r.approvalConfidence != null && <Badge variant="secondary">Confidence {r.approvalConfidence}%</Badge>}
          </div>
          <p>{r.executiveSummary}</p>
        </div>
      </div>
    );
  }

  if (councilId === "learning") {
    const r = report as LearningReport;
    return (
      <div className="rounded-lg bg-muted/30 p-3 text-xs space-y-2">
        <p>{r.summary}</p>
        <ul className="list-disc pl-4 text-muted-foreground">
          {r.insights.map((i) => (
            <li key={i.pattern}><strong>{i.pattern}:</strong> {i.lesson}</li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
}
