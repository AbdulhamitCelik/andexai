"use client";

import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { ShortcutsProvider, useShortcuts } from "@/lib/context/shortcuts-context";
import { CommandPalette } from "@/components/shortcuts/command-palette";
import { ShortcutsModal } from "@/components/shortcuts/shortcuts-modal";
import { BeginnerGuide, BeginnerGuidePrompt } from "@/components/shortcuts/beginner-guide";
import { KeyboardHintsBar } from "@/components/shortcuts/keyboard-hints-bar";
import { GamifiedHud, GamifiedQuestBoard } from "@/components/gamification/gamified-hud";
import { useExperienceMode } from "@/lib/context/experience-mode-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ShortcutsProvider>
      <ShellInner>{children}</ShellInner>
    </ShortcutsProvider>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useShortcuts();
  const { isGamified } = useExperienceMode();

  return (
    <>
      <div className="flex h-screen min-h-screen overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} />
        <main className={cn("flex-1 overflow-auto pb-10 transition-all duration-300", sidebarCollapsed && "md:ml-0")}>
          {isGamified && <GamifiedHud />}
          {isGamified && <GamifiedQuestBoard />}
          {children}
        </main>
      </div>
      <CommandPalette />
      <ShortcutsModal />
      <BeginnerGuide />
      <BeginnerGuidePrompt />
      <KeyboardHintsBar />
    </>
  );
}
