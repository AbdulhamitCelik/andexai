"use client";

import type { WorkflowStep, WorkflowStepStatus } from "@/lib/proposals/proposal-workflow";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, Loader2, Lock, Workflow } from "lucide-react";

const STATUS_STYLES: Record<WorkflowStepStatus, { icon: typeof Circle; className: string }> = {
  complete: { icon: CheckCircle2, className: "text-emerald-400" },
  active: { icon: Loader2, className: "text-primary animate-spin" },
  pending: { icon: Circle, className: "text-muted-foreground" },
  blocked: { icon: Lock, className: "text-amber-400" },
};

export function DecisionTimeline({ steps }: { steps: WorkflowStep[] }) {
  return (
    <Card className="glass border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Workflow className="h-4 w-4 text-primary" />
          Decision Timeline
        </CardTitle>
        <CardDescription>
          Engineering decision workflow — like a pull request for product choices
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="relative space-y-0">
          {steps.map((step, i) => {
            const meta = STATUS_STYLES[step.status];
            const Icon = meta.icon;
            const isLast = i === steps.length - 1;

            return (
              <li key={step.id} className="relative flex gap-3 pb-6 last:pb-0">
                {!isLast && (
                  <span
                    className={cn(
                      "absolute left-[11px] top-6 h-[calc(100%-12px)] w-px",
                      step.status === "complete" ? "bg-emerald-500/40" : "bg-border"
                    )}
                  />
                )}
                <div className={cn("relative z-10 mt-0.5 shrink-0", meta.className)}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{step.label}</p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        step.status === "complete" && "bg-emerald-500/15 text-emerald-300",
                        step.status === "active" && "bg-primary/15 text-primary",
                        step.status === "pending" && "bg-muted text-muted-foreground",
                        step.status === "blocked" && "bg-amber-500/15 text-amber-300"
                      )}
                    >
                      {step.status}
                    </span>
                  </div>
                  {step.detail && (
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{step.detail}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
