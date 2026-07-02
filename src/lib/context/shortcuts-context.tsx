"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/context/user-context";
import { useTheme } from "@/lib/context/theme-context";
import { TEAM_MEMBERS } from "@/lib/auth/team";
import { VIM_NAV_MAP } from "@/lib/shortcuts/registry";

interface ShortcutsContextValue {
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  guideOpen: boolean;
  setGuideOpen: (open: boolean) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
  refreshKey: number;
  triggerRefresh: () => void;
  pendingGoKey: boolean;
}

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function ShortcutsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setCurrentUser } = useUser();
  const { toggleTheme } = useTheme();

  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingGoKey, setPendingGoKey] = useState(false);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);
  const toggleSidebar = useCallback(() => setSidebarCollapsed((c) => !c), []);

  const closeAll = useCallback(() => {
    setCommandOpen(false);
    setShortcutsOpen(false);
    setGuideOpen(false);
  }, []);

  useEffect(() => {
    let goTimeout: ReturnType<typeof setTimeout> | null = null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) && !commandOpen) {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }

      const mod = e.ctrlKey || e.metaKey;

      if (e.key === "Escape") {
        closeAll();
        return;
      }

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((o) => !o);
        return;
      }

      if (mod && e.key === "/") {
        e.preventDefault();
        setGuideOpen((o) => !o);
        return;
      }

      if (e.shiftKey && e.key === "?") {
        e.preventDefault();
        setShortcutsOpen((o) => !o);
        return;
      }

      if (mod && e.shiftKey && e.key.toLowerCase() === "t") {
        e.preventDefault();
        toggleTheme();
        return;
      }

      if (mod && e.key.toLowerCase() === "b" && !e.shiftKey) {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      if (mod && e.shiftKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        triggerRefresh();
        return;
      }

      if (mod && e.shiftKey && e.key === "1") {
        e.preventDefault();
        const m = TEAM_MEMBERS.find((x) => x.memoryRole === "manager");
        if (m) setCurrentUser(m);
        return;
      }
      if (mod && e.shiftKey && e.key === "2") {
        e.preventDefault();
        const m = TEAM_MEMBERS.find((x) => x.id === "wkr-1");
        if (m) setCurrentUser(m);
        return;
      }
      if (mod && e.shiftKey && e.key === "3") {
        e.preventDefault();
        const m = TEAM_MEMBERS.find((x) => x.memoryRole === "intern");
        if (m) setCurrentUser(m);
        return;
      }

      if (!mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "g" && !commandOpen) {
        e.preventDefault();
        setPendingGoKey(true);
        if (goTimeout) clearTimeout(goTimeout);
        goTimeout = setTimeout(() => setPendingGoKey(false), 1200);
        return;
      }

      if (pendingGoKey && !mod && VIM_NAV_MAP[e.key.toLowerCase()]) {
        e.preventDefault();
        setPendingGoKey(false);
        if (goTimeout) clearTimeout(goTimeout);
        router.push(VIM_NAV_MAP[e.key.toLowerCase()]);
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (goTimeout) clearTimeout(goTimeout);
    };
  }, [
    commandOpen,
    pendingGoKey,
    closeAll,
    toggleTheme,
    toggleSidebar,
    triggerRefresh,
    setCurrentUser,
    router,
  ]);

  return (
    <ShortcutsContext.Provider
      value={{
        commandOpen,
        setCommandOpen,
        shortcutsOpen,
        setShortcutsOpen,
        guideOpen,
        setGuideOpen,
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebar,
        refreshKey,
        triggerRefresh,
        pendingGoKey,
      }}
    >
      {children}
    </ShortcutsContext.Provider>
  );
}

export function useShortcuts() {
  const ctx = useContext(ShortcutsContext);
  if (!ctx) throw new Error("useShortcuts must be used within ShortcutsProvider");
  return ctx;
}
