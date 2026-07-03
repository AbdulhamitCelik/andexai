"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ACHIEVEMENTS,
  levelFromXp,
  questForPath,
  STORAGE_GAME,
  STORAGE_MODE,
  type ExperienceMode,
} from "@/lib/gamification/quests";

interface GamificationState {
  xp: number;
  visitedRoutes: string[];
  achievements: string[];
}

interface XpToast {
  amount: number;
  label: string;
}

interface ExperienceContextValue {
  mode: ExperienceMode | null;
  hydrated: boolean;
  isGamified: boolean;
  setMode: (mode: ExperienceMode) => void;
  confirmMode: (mode: ExperienceMode, welcomeBonus?: boolean) => void;
  resetMode: () => void;
  xp: number;
  level: number;
  visitedCount: number;
  achievements: string[];
  xpToast: XpToast | null;
  trackRoute: (pathname: string) => void;
  dismissToast: () => void;
}

const defaultGame: GamificationState = { xp: 0, visitedRoutes: [], achievements: [] };

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

function loadGame(): GamificationState {
  if (typeof window === "undefined") return defaultGame;
  try {
    const raw = localStorage.getItem(STORAGE_GAME);
    if (!raw) return defaultGame;
    const parsed = JSON.parse(raw) as GamificationState;
    return {
      xp: parsed.xp ?? 0,
      visitedRoutes: Array.isArray(parsed.visitedRoutes) ? parsed.visitedRoutes : [],
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
    };
  } catch {
    return defaultGame;
  }
}

function saveGame(state: GamificationState) {
  try {
    localStorage.setItem(STORAGE_GAME, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function ExperienceModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ExperienceMode | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [game, setGame] = useState<GamificationState>(defaultGame);
  const [xpToast, setXpToast] = useState<XpToast | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_MODE) as ExperienceMode | null;
    if (stored === "normal" || stored === "gamified") setModeState(stored);
    setGame(loadGame());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    if (mode === "gamified") root.classList.add("gamified-mode");
    else root.classList.remove("gamified-mode");
  }, [mode, hydrated]);

  const setMode = useCallback((next: ExperienceMode) => {
    setModeState(next);
    localStorage.setItem(STORAGE_MODE, next);
  }, []);

  const confirmMode = useCallback((next: ExperienceMode, welcomeBonus = false) => {
    setModeState(next);
    localStorage.setItem(STORAGE_MODE, next);
    if (welcomeBonus && next === "gamified") {
      setGame((g) => {
        const bonus = { ...g, xp: g.xp + 50 };
        saveGame(bonus);
        return bonus;
      });
      setXpToast({ amount: 50, label: "Quest Mode unlocked!" });
    }
  }, []);

  const resetMode = useCallback(() => {
    localStorage.removeItem(STORAGE_MODE);
    setModeState(null);
  }, []);

  const dismissToast = useCallback(() => setXpToast(null), []);

  const unlockAchievements = useCallback((state: GamificationState): GamificationState => {
    let next = { ...state };
    const level = levelFromXp(next.xp);

    for (const ach of ACHIEVEMENTS) {
      if (next.achievements.includes(ach.id)) continue;
      let earned = false;
      if ("route" in ach && ach.route && next.visitedRoutes.includes(ach.route)) earned = true;
      if ("minRoutes" in ach && ach.minRoutes && next.visitedRoutes.length >= ach.minRoutes) earned = true;
      if ("minLevel" in ach && ach.minLevel && level >= ach.minLevel) earned = true;
      if (earned) {
        next = {
          ...next,
          achievements: [...next.achievements, ach.id],
          xp: next.xp + ach.xpBonus,
        };
        setXpToast({ amount: ach.xpBonus, label: `Achievement: ${ach.title}` });
      }
    }
    return next;
  }, []);

  const trackRoute = useCallback(
    (pathname: string) => {
      if (mode !== "gamified") return;

      const quest = questForPath(pathname);
      const routeKey = quest?.route ?? pathname;

      setGame((prev) => {
        if (prev.visitedRoutes.includes(routeKey)) return prev;

        const xpGain = quest?.xp ?? 15;
        let next: GamificationState = {
          xp: prev.xp + xpGain,
          visitedRoutes: [...prev.visitedRoutes, routeKey],
          achievements: prev.achievements,
        };
        next = unlockAchievements(next);
        saveGame(next);
        setXpToast({ amount: xpGain, label: quest ? `Quest: ${quest.title}` : "New area explored" });
        return next;
      });
    },
    [mode, unlockAchievements]
  );

  const value = useMemo<ExperienceContextValue>(
    () => ({
      mode,
      hydrated,
      isGamified: mode === "gamified",
      setMode,
      confirmMode,
      resetMode,
      xp: game.xp,
      level: levelFromXp(game.xp),
      visitedCount: game.visitedRoutes.length,
      achievements: game.achievements,
      xpToast,
      trackRoute,
      dismissToast,
    }),
    [mode, hydrated, setMode, confirmMode, resetMode, game, xpToast, trackRoute, dismissToast]
  );

  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
}

export function useExperienceMode() {
  const ctx = useContext(ExperienceContext);
  if (!ctx) throw new Error("useExperienceMode must be used within ExperienceModeProvider");
  return ctx;
}
