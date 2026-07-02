"use client";

import type { ImpactAnalysis } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Clock, Shield, Wrench } from "lucide-react";

export function ImpactAnalysisPanel({ impact }: { impact: ImpactAnalysis }) {
  const s = impact.structured;
  if (!s) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          No LLM-generated impact analysis. Re-run the Impact Agent to analyze this proposal.
        </CardContent>
      </Card>
    );
  }

  const riskVariant =
    impact.riskLevel === "high" ? "destructive" : impact.riskLevel === "medium" ? "warning" : "secondary";

  return (
    <Card className="border-orange-500/20">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-4 w-4 text-orange-400" />
          Impact Analysis
          <Badge variant="secondary" className="text-[10px] ml-auto">LLM-generated</Badge>
        </CardTitle>
        <CardDescription>
          Evidence-based analysis from Project Brain + decision history
          {s.llmProvider && (
            <span className="block mt-1 text-[10px]">
              via {s.llmProvider}/{s.llmModel} · {s.generatedAt ? new Date(s.generatedAt).toLocaleString() : ""}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        <div>
          <p className="leading-relaxed">{s.summary}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant={riskVariant}>Overall: {s.overallImpact}</Badge>
            <Badge variant="secondary">Recommendation: {s.recommendation.replace(/_/g, " ")}</Badge>
            <Badge variant="secondary">{impact.costEstimate}</Badge>
          </div>
        </div>

        <section>
          <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Reasoning</h4>
          <p className="text-muted-foreground leading-relaxed">{s.reasoning}</p>
        </section>

        <section>
          <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Affected Components</h4>
          <div className="space-y-2">
            {s.affectedComponents.map((c) => (
              <div key={c.component} className="rounded-lg border border-border/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.component}</span>
                  <Badge variant={c.impactType === "critical" || c.impactType === "high" ? "destructive" : "secondary"}>
                    {c.impactType}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-xs">{c.reason}</p>
                {c.requiredChanges.length > 0 && (
                  <ul className="mt-2 list-disc pl-4 text-xs text-muted-foreground">
                    {c.requiredChanges.map((ch) => (
                      <li key={ch}>{ch}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
            <Shield className="h-3 w-3" /> Risks
          </h4>
          <div className="space-y-2">
            {s.risks.map((r) => (
              <div key={r.risk} className="rounded border border-border/40 p-2 text-xs">
                <p className="font-medium">{r.risk}</p>
                <p className="text-muted-foreground mt-1">
                  {r.severity} severity · {r.likelihood} likelihood · Mitigation: {r.mitigation}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Trade-offs</h4>
          {s.tradeOffs.map((t, i) => (
            <div key={i} className="grid md:grid-cols-2 gap-2 mb-2 text-xs">
              <div className="rounded bg-emerald-500/10 p-2"><span className="text-emerald-400 font-medium">Benefit:</span> {t.benefit}</div>
              <div className="rounded bg-red-500/10 p-2"><span className="text-red-400 font-medium">Cost:</span> {t.cost}</div>
            </div>
          ))}
        </section>

        <section>
          <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Dependencies</h4>
          <ul className="space-y-1 text-xs">
            {s.dependencies.map((d) => (
              <li key={d.dependency} className="flex gap-2">
                <Badge variant="secondary" className="text-[10px]">{d.type}</Badge>
                <span>{d.dependency}{d.blocking ? " (blocking)" : ""}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Effort
            </h4>
            <p className="text-xs text-muted-foreground">{s.effortEstimate.reasoning}</p>
            <p className="text-xs mt-1">{s.effortEstimate.tShirtSize} · {s.effortEstimate.storyPoints} pts · {s.effortEstimate.estimatedDays} days</p>
          </div>
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <Wrench className="h-3 w-3" /> Testing & Rollback
            </h4>
            <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-0.5">
              {s.testingRecommendations.slice(0, 3).map((t) => <li key={t}>{t}</li>)}
              {s.rollbackConsiderations.slice(0, 2).map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
