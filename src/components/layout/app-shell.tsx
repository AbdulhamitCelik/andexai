"use client";

import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
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
  const { sidebarCollapsed, mobileNavOpen, closeMobileNav } = useShortcuts();
  const { isGamified } = useExperienceMode();

  return (
    <>
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] md:hidden"
          onClick={closeMobileNav}
        />
      )}

      <div className="flex h-[100dvh] min-h-[100dvh] overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <MobileHeader />
          <main
            className={cn(
              "flex-1 overflow-x-hidden overflow-y-auto pb-14 md:pb-10 transition-all duration-300",
              sidebarCollapsed && "md:ml-0"
            )}
          >
            {isGamified && <GamifiedHud />}
            {isGamified && <GamifiedQuestBoard />}
            {children}
          </main>
        </div>
      </div>
      <CommandPalette />
      <ShortcutsModal />
      <BeginnerGuide />
      <BeginnerGuidePrompt />
      <KeyboardHintsBar />
    </>
  );
}
