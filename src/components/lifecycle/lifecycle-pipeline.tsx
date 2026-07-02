"use client";

import { cn } from "@/lib/utils";
import type { LifecyclePhaseState } from "@/lib/types";
import { CheckCircle2, Circle, Lock, Sparkles } from "lucide-react";

const STATUS_STYLE: Record<LifecyclePhaseState["status"], string> = {
  complete: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
  active: "border-rose-400/60 bg-rose-500/15 text-rose-200 sakura-glow",
  pending: "border-border/80 bg-card/60 text-muted-foreground",
  locked: "border-border/40 bg-muted/20 text-muted-foreground/50",
};

export function LifecyclePipeline({ phases }: { phases: LifecyclePhaseState[] }) {
  return (
    <div className="flex flex-col items-center gap-0 max-w-md mx-auto">
      {phases.map((phase, i) => (
        <div key={phase.id} className="flex flex-col items-center w-full">
          <div
            className={cn(
              "w-full rounded-xl border px-4 py-3 transition-all duration-500",
              STATUS_STYLE[phase.status]
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              {phase.status === "complete" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
              {phase.status === "active" && <Sparkles className="h-4 w-4 shrink-0 animate-pulse" />}
              {phase.status === "pending" && <Circle className="h-4 w-4 shrink-0" />}
              {phase.status === "locked" && <Lock className="h-4 w-4 shrink-0" />}
              <span className="text-sm font-semibold">{phase.label}</span>
              <span className="ml-auto text-[10px] uppercase tracking-wider opacity-60">{phase.status}</span>
            </div>
            {phase.summary && (
              <p className="text-[11px] opacity-60 pl-6">{phase.summary}</p>
            )}
          </div>
          {i < phases.length - 1 && (
            <div className="flex h-8 items-center justify-center text-muted-foreground/40 text-xl">↓</div>
          )}
        </div>
      ))}
    </div>
  );
}
