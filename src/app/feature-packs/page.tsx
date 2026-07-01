"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/context/user-context";
import type { FeaturePack, FeedbackItem, ProjectBrain } from "@/lib/types";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  MessageSquareQuote,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

interface SuggestionTarget {
  value: string;
  label: string;
}

const IMPACT_VARIANT: Record<string, "destructive" | "warning" | "secondary"> = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
};

export default function FeaturePacksPage() {
  return (
    <Suspense fallback={<AppShell><div className="p-8">Loading...</div></AppShell>}>
      <FeaturePacksContent />
    </Suspense>
  );
}

function FeaturePacksContent() {
  const { currentUser } = useUser();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectBrain[]>([]);
  const [projectId, setProjectId] = useState("");
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [packs, setPacks] = useState<FeaturePack[]>([]);
  const [targets, setTargets] = useState<SuggestionTarget[]>([]);
  const [showFeedback, setShowFeedback] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [promoteTarget, setPromoteTarget] = useState<Record<string, string>>({});

  const load = (pid?: string) => {
    const id = pid ?? projectId;
    if (!id) return;
    fetch(`/api/discovery?projectId=${id}`)
      .then((r) => r.json())
      .then((d) => {
        setFeedback(d.feedback ?? []);
        setPacks(d.featurePacks ?? []);
        setTargets(d.targets ?? []);
        if (!promoteTarget[id] && d.targets?.length) {
          const projectTarget = d.targets.find((t: SuggestionTarget) => t.value.startsWith("project:"));
          setPromoteTarget((prev) => ({ ...prev, [id]: projectTarget?.value ?? d.targets[0].value }));
        }
      });
  };

  useEffect(() => {
    fetch("/api/discovery")
      .then((r) => r.json())
      .then((d) => {
        const list: ProjectBrain[] = d.projects ?? [];
        setProjects(list);
        if (list.length && !projectId) {
          setProjectId(list[0].id);
          load(list[0].id);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (projectId) load(projectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const runDiscovery = async () => {
    if (!projectId) return;
    setDiscovering(true);
    const res = await fetch("/api/discovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    const data = await res.json();
    setDiscovering(false);
    if (!res.ok) {
      alert(data.error ?? "Discovery failed");
      return;
    }
    setPacks(data.featurePacks ?? []);
    load(projectId);
  };

  const promote = async (packId: string) => {
    const target = promoteTarget[projectId];
    if (!target) {
      alert("Select a proposal target first");
      return;
    }
    setPromotingId(packId);
    const res = await fetch("/api/discovery", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        featurePackId: packId,
        action: "promote",
        authorId: currentUser.id,
        authorName: currentUser.name,
        target,
      }),
    });
    const data = await res.json();
    setPromotingId(null);
    if (!res.ok) {
      alert(data.error ?? "Promote failed");
      return;
    }
    load(projectId);
    if (data.proposal?.id) router.push(`/proposals/${data.proposal.id}`);
  };

  const project = projects.find((p) => p.id === projectId);

  return (
    <AppShell>
      <div className="p-8 space-y-8 max-w-6xl">
        {/* Header + pipeline */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary/80 mb-2">
            <Sparkles className="h-4 w-4" />
            Product Discovery
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Feature Packs</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Raw user feedback is clustered by the ProductDiscoveryAgent into actionable Feature Packs.
            Promote a pack into the existing proposal workflow — humans always approve before implementation.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <PipelineStep n={1} label="Customer Feedback" active />
            <ArrowRight className="h-3 w-3" />
            <PipelineStep n={2} label="ProductDiscoveryAgent" active />
            <ArrowRight className="h-3 w-3" />
            <PipelineStep n={3} label="Feature Packs" active={packs.length > 0} />
            <ArrowRight className="h-3 w-3" />
            <PipelineStep n={4} label="Proposal → Branch → Tasks" />
          </div>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Create a project first (manager) on Main Ideas, then return here to run discovery.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-4">
              <div className="min-w-[220px]">
                <label className="text-xs text-muted-foreground block mb-1">Project</label>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <Button onClick={runDiscovery} disabled={discovering}>
                {discovering ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Clustering feedback…</>
                ) : (
                  <><Zap className="mr-2 h-4 w-4" /> Run Product Discovery</>
                )}
              </Button>
              {project && (
                <p className="text-xs text-muted-foreground pb-2">
                  {feedback.length} feedback signals available for &quot;{project.name}&quot;
                </p>
              )}
            </div>

            {/* Raw feedback */}
            <Card className="border-border/70">
              <CardHeader
                className="cursor-pointer select-none"
                onClick={() => setShowFeedback(!showFeedback)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquareQuote className="h-4 w-4 text-primary" />
                      Raw User Feedback ({feedback.length})
                    </CardTitle>
                    <CardDescription>Reviews, tickets, surveys — ingested before clustering</CardDescription>
                  </div>
                  {showFeedback ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </CardHeader>
              {showFeedback && (
                <CardContent>
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                    {feedback.slice(0, 12).map((f) => (
                      <div key={f.id} className="rounded border border-border/60 px-3 py-2 text-sm">
                        <div className="flex flex-wrap gap-2 mb-1">
                          <Badge variant="secondary" className="text-[10px]">{f.source.replace(/_/g, " ")}</Badge>
                          {f.geo && (
                            <Badge variant="secondary" className="text-[10px]">
                              <MapPin className="h-2.5 w-2.5 mr-0.5 inline" />{f.geo}
                            </Badge>
                          )}
                          <Badge
                            variant={f.sentiment === "negative" ? "destructive" : "secondary"}
                            className="text-[10px]"
                          >
                            {f.sentiment}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">{f.text}</p>
                      </div>
                    ))}
                    {feedback.length > 12 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        + {feedback.length - 12} more signals clustered by the agent
                      </p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Feature Packs */}
            {packs.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-10 text-center">
                  <Sparkles className="h-10 w-10 text-primary/40 mx-auto mb-3" />
                  <p className="font-medium">No Feature Packs yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Click &quot;Run Product Discovery&quot; to condense {feedback.length} feedback items into 3–5 packs.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">
                  Discovered Feature Packs ({packs.filter((p) => p.status === "discovered").length} actionable)
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {packs.map((pack) => (
                    <FeaturePackCard
                      key={pack.id}
                      pack={pack}
                      target={promoteTarget[projectId] ?? ""}
                      targets={targets}
                      onTargetChange={(v) => setPromoteTarget((prev) => ({ ...prev, [projectId]: v }))}
                      onPromote={() => promote(pack.id)}
                      promoting={promotingId === pack.id}
                    />
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground border-t border-border pt-4">
              Manual proposals still available on{" "}
              <Link href="/proposals" className="text-primary hover:underline">Suggestions</Link>
              {" "}— Feature Packs are a second entry point, not a replacement.
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}

function PipelineStep({ n, label, active }: { n: number; label: string; active?: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 border ${
        active ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground"
      }`}
    >
      {n}. {label}
    </span>
  );
}

function FeaturePackCard({
  pack,
  target,
  targets,
  onTargetChange,
  onPromote,
  promoting,
}: {
  pack: FeaturePack;
  target: string;
  targets: SuggestionTarget[];
  onTargetChange: (v: string) => void;
  onPromote: () => void;
  promoting: boolean;
}) {
  const promoted = pack.status === "promoted";

  return (
    <Card className={`h-full ${promoted ? "opacity-75 border-emerald-500/30" : "hover:border-primary/30 transition-colors"}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{pack.title}</CardTitle>
          <Badge variant={IMPACT_VARIANT[pack.estimatedImpact] ?? "secondary"}>
            {pack.estimatedImpact} impact
          </Badge>
        </div>
        <CardDescription className="line-clamp-2">{pack.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            <MessageSquareQuote className="h-3 w-3 mr-1" />
            {pack.evidenceCount} signals
          </Badge>
          <Badge variant="secondary">Priority {pack.priorityScore}</Badge>
          <Badge variant="secondary">Confidence {pack.confidenceScore}%</Badge>
        </div>

        {pack.geoInsights.length > 0 && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary/70" />
            <span>{pack.geoInsights.join(" · ")}</span>
          </div>
        )}

        {pack.affectedUserSegments.length > 0 && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary/70" />
            <span>{pack.affectedUserSegments.join(", ")}</span>
          </div>
        )}

        <div className="rounded-md bg-muted/30 p-3 text-xs space-y-2">
          <p><span className="font-medium text-emerald-400">Pros:</span> {pack.pros[0]}</p>
          <p><span className="font-medium text-red-400">Cons:</span> {pack.cons[0]}</p>
        </div>

        <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
          &quot;{pack.topEvidenceQuotes[0]}&quot;
        </p>

        {promoted ? (
          <div className="space-y-2">
            <Badge variant="success">Promoted to proposal</Badge>
            {pack.promotedProposalId && (
              <Link href={`/proposals/${pack.promotedProposalId}`}>
                <Button size="sm" variant="outline" className="w-full">
                  View proposal <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2 pt-1">
            <select
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              value={target}
              onChange={(e) => onTargetChange(e.target.value)}
            >
              {targets.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <Button size="sm" className="w-full" onClick={onPromote} disabled={promoting}>
              {promoting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Promote to Proposal <ArrowRight className="ml-1 h-3 w-3" /></>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
