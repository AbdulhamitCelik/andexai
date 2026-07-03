"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { useExperienceMode } from "@/lib/context/experience-mode-context";
import { ACHIEVEMENTS, questForPath, xpProgressInLevel } from "@/lib/gamification/quests";
import { cn } from "@/lib/utils";
import { Sparkles, Star, Trophy, X } from "lucide-react";

export function GamifiedHud() {
  const pathname = usePathname();
  const { isGamified, level, xp, xpToast, dismissToast, trackRoute } = useExperienceMode();

  useEffect(() => {
    if (isGamified) trackRoute(pathname);
  }, [pathname, isGamified, trackRoute]);

  useEffect(() => {
    if (!xpToast) return;
    const t = setTimeout(dismissToast, 3200);
    return () => clearTimeout(t);
  }, [xpToast, dismissToast]);

  if (!isGamified) return null;

  const progress = xpProgressInLevel(xp);
  const quest = questForPath(pathname);

  return (
    <>
      <div className="gamified-hud sticky top-0 z-30 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-background/95 to-violet-500/10 px-4 py-2 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/20 font-bold text-amber-200 text-sm">
              {level}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-amber-300/80">Adventurer Level {level}</p>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-2 w-32 md:w-48 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-violet-400 transition-all duration-500"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {progress.current}/{progress.max} XP
                </span>
              </div>
            </div>
          </div>

          {quest && (
            <div className="flex items-center gap-2 min-w-0">
              <Star className="h-4 w-4 shrink-0 text-amber-400" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Active quest</p>
                <p className="text-sm font-medium truncate">{quest.title}</p>
              </div>
              <Badge variant="secondary" className="shrink-0 text-[10px] bg-amber-500/20 text-amber-200 border-amber-500/30">
                +{quest.xp} XP
              </Badge>
            </div>
          )}
        </div>
      </div>

      {xpToast && (
        <div className="fixed bottom-20 right-6 z-50 animate-in">
          <div className="flex items-center gap-3 rounded-xl border border-amber-400/40 bg-card/95 px-4 py-3 shadow-xl backdrop-blur-md">
            <Sparkles className="h-5 w-5 text-amber-400" />
            <div>
              <p className="text-sm font-medium">{xpToast.label}</p>
              <p className="text-xs text-amber-300">+{xpToast.amount} XP</p>
            </div>
            <button type="button" onClick={dismissToast} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function GamifiedQuestBoard() {
  const { isGamified, visitedCount, achievements } = useExperienceMode();
  const pathname = usePathname();

  if (!isGamified || pathname !== "/") return null;

  const unlocked = new Set(achievements);

  return (
    <div className="border-b border-amber-500/15 bg-gradient-to-b from-amber-500/5 to-transparent px-8 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-amber-300/80">Quest Mode</p>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            Your Campaign Map
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Explore each area to earn XP. {visitedCount} locations discovered — same features, adventure skin.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ACHIEVEMENTS.map((ach) => {
          const done = unlocked.has(ach.id);
          return (
            <div
              key={ach.id}
              className={cn(
                "rounded-xl border p-4 transition-all",
                done
                  ? "border-amber-400/40 bg-amber-500/10"
                  : "border-border/60 bg-card/40 opacity-70"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm">{ach.title}</p>
                {done && <Badge className="text-[10px] bg-amber-500/30 text-amber-100">Unlocked</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{ach.description}</p>
              <p className="text-[10px] text-amber-300/80 mt-2">+{ach.xpBonus} XP bonus</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
