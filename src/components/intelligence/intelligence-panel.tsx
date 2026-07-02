"use client";

import { cn } from "@/lib/utils";
import type { PriorityScoreRecord } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  Brain,
  ChevronDown,
  ChevronUp,
  Gauge,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

export function PriorityBadge({ score, label = "Priority" }: { score: number; label?: string }) {
  const variant = score >= 75 ? "success" : score >= 50 ? "warning" : "secondary";
  return (
    <Badge variant={variant} className="gap-1 font-mono">
      <Gauge className="h-3 w-3" />
      {label} {score}
    </Badge>
  );
}

export function IntelligencePanel({
  priority,
  compact = false,
  className,
}: {
  priority?: PriorityScoreRecord | null;
  compact?: boolean;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(!compact);

  if (!priority) {
    return (
      <Card className={cn("glass border-dashed", className)}>
        <CardContent className="py-4 text-xs text-muted-foreground">
          Priority scores loading — run Discovery or refresh priorities.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("glass sakura-border overflow-hidden", className)}>
      <CardHeader
        className={cn("cursor-pointer pb-3", compact && "py-3")}
        onClick={() => compact && setExpanded((e) => !e)}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardDescription className="text-[10px] uppercase tracking-widest text-rose-300/70">
              Decision Intelligence
            </CardDescription>
            <CardTitle className="text-sm font-semibold">{priority.title}</CardTitle>
          </div>
          {compact && (expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <PriorityBadge score={priority.overallScore} />
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <Sparkles className="h-3 w-3" /> Conf. {priority.confidenceScore}
          </Badge>
          <Badge variant={priority.riskScore >= 60 ? "destructive" : "secondary"} className="gap-1 text-[10px]">
            <AlertTriangle className="h-3 w-3" /> Risk {priority.riskScore}
          </Badge>
          <Badge variant="secondary" className="gap-1 text-[10px]">
            <TrendingUp className="h-3 w-3" /> Value {priority.businessValue}
          </Badge>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3 border-t border-border/50 pt-3 text-xs">
          <p className="text-muted-foreground leading-relaxed">{priority.summary}</p>
          <div className="rounded-lg bg-muted/30 p-2">
            <p className="font-medium flex items-center gap-1 text-foreground mb-1">
              <Target className="h-3 w-3 text-primary" /> Recommended next action
            </p>
            <p className="text-muted-foreground">{priority.recommendedAction}</p>
          </div>
          {priority.reasoning.length > 0 && (
            <div>
              <p className="font-medium mb-1 flex items-center gap-1">
                <Brain className="h-3 w-3" /> Why this score
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground max-h-32 overflow-y-auto">
                {priority.reasoning.slice(0, 5).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
          {priority.supportingEvidence.length > 0 && (
            <div>
              <p className="font-medium mb-1 flex items-center gap-1">
                <Shield className="h-3 w-3" /> Evidence
              </p>
              {priority.supportingEvidence.slice(0, 2).map((e, i) => (
                <p key={i} className="text-muted-foreground italic line-clamp-2">&ldquo;{e}&rdquo;</p>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export function BrainRankingsPanel({
  rankings,
}: {
  rankings?: {
    whatMattersNow: string;
    why: string;
    nextAction: string;
    topPriorities: { title: string; score: number; reasoning: string }[];
  } | null;
}) {
  if (!rankings) return null;

  return (
    <Card className="glass sakura-border">
      <CardHeader>
        <CardDescription className="text-[10px] uppercase tracking-widest text-muted-foreground">Project Brain</CardDescription>
        <CardTitle className="text-base">What matters now</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <p className="font-semibold text-primary">{rankings.whatMattersNow}</p>
          <p className="text-xs text-muted-foreground mt-1">{rankings.why}</p>
        </div>
        <div className="rounded-lg border border-border/50 p-2 text-xs">
          <span className="font-medium">Next: </span>{rankings.nextAction}
        </div>
        <div className="space-y-1">
          {rankings.topPriorities.slice(0, 5).map((p, i) => (
            <div key={i} className="flex items-center justify-between text-xs border-b border-border/30 py-1 last:border-0">
              <span className="truncate pr-2">{i + 1}. {p.title}</span>
              <PriorityBadge score={p.score} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function DecisionIntelligencePanel({
  intelligence,
}: {
  intelligence?: {
    prioritize: { title: string; score: number; reasoning: string[]; delayImpact?: string; revenueImpact?: string };
    defer: { title: string; score: number; reasoning: string[] }[];
    summary: string;
  } | null;
}) {
  if (!intelligence) return null;

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="text-base">Decision Intelligence</CardTitle>
        <CardDescription>{intelligence.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
          <p className="font-semibold text-emerald-300">Prioritise: {intelligence.prioritize.title}</p>
          <PriorityBadge score={intelligence.prioritize.score} />
          <ul className="mt-2 list-disc pl-4 text-muted-foreground space-y-0.5">
            {intelligence.prioritize.reasoning.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
          {intelligence.prioritize.delayImpact && (
            <p className="mt-2 text-amber-400/90">If delayed: {intelligence.prioritize.delayImpact}</p>
          )}
          {intelligence.prioritize.revenueImpact && (
            <p className="text-muted-foreground">Revenue: {intelligence.prioritize.revenueImpact}</p>
          )}
        </div>
        {intelligence.defer.map((d, i) => (
          <div key={i} className="rounded-lg bg-muted/20 p-2">
            <p className="font-medium">Defer: {d.title} ({d.score})</p>
            <p className="text-muted-foreground mt-1">{d.reasoning[0]}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
