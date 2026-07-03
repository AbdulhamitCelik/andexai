"use client";

import { AndexLogo } from "@/components/brand/andex-logo";
import { useExperienceMode } from "@/lib/context/experience-mode-context";
import { BookOpen, Gamepad2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function ExperienceModePicker() {
  const { confirmMode } = useExperienceMode();

  return (
    <div className="experience-picker-overlay fixed inset-0 z-[120] flex items-center justify-center p-6">
      <div className="experience-picker-ink absolute inset-0" />
      <div className="relative z-10 w-full max-w-3xl animate-in">
        <div className="mb-8 text-center">
          <AndexLogo layout="stacked" size="md" showAi className="mx-auto mb-4" />
          <p className="font-display text-xs tracking-[0.3em] uppercase text-rose-300/80">Team Andex</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Choose your <span className="text-gradient">experience</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground max-w-lg mx-auto">
            Same powerful product OS underneath — pick how you want to explore it.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => confirmMode("normal")}
            className={cn(
              "experience-card group rounded-2xl border border-border/80 bg-card/80 p-6 text-left backdrop-blur-md transition-all",
              "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
            )}
          >
            <div className="mb-4 inline-flex rounded-xl bg-primary/10 p-3">
              <BookOpen className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Classic Mode</h2>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">Text & professional</p>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              The standard Andex interface — clean dashboards, enterprise workflow, and decision intelligence for
              serious product work.
            </p>
            <div className="mt-5 flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Enter Classic Mode
            </div>
          </button>

          <button
            type="button"
            onClick={() => confirmMode("gamified", true)}
            className={cn(
              "experience-card group rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card/80 to-violet-500/10 p-6 text-left backdrop-blur-md transition-all",
              "hover:border-amber-400/60 hover:shadow-lg hover:shadow-amber-500/15 focus:outline-none focus:ring-2 focus:ring-amber-400"
            )}
          >
            <div className="mb-4 inline-flex rounded-xl bg-amber-500/20 p-3">
              <Gamepad2 className="h-7 w-7 text-amber-300" />
            </div>
            <h2 className="text-xl font-semibold text-amber-100">Quest Mode</h2>
            <p className="mt-1 text-xs uppercase tracking-wider text-amber-300/70">Gamified adventure</p>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Turn product work into a quest — earn XP, unlock achievements, and explore the same features with RPG
              flair. All logic stays the same underneath.
            </p>
            <div className="mt-5 flex items-center gap-2 text-sm font-medium text-amber-300">
              <Gamepad2 className="h-4 w-4" />
              Start Your Quest (+50 XP)
            </div>
          </button>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          You can switch modes anytime from the sidebar.
        </p>
      </div>
    </div>
  );
}

export function ExperienceGate({ children }: { children: React.ReactNode }) {
  const { mode, hydrated } = useExperienceMode();

  if (!hydrated) {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground animate-pulse">Loading Andex…</p>
      </div>
    );
  }

  if (!mode) return <ExperienceModePicker />;

  return <>{children}</>;
}
