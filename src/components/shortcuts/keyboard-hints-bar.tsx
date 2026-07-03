"use client";

import { useShortcuts } from "@/lib/context/shortcuts-context";
import { Kbd } from "@/components/shortcuts/shortcuts-modal";
import { cn } from "@/lib/utils";
import { Command, Keyboard } from "lucide-react";

export function KeyboardHintsBar() {
  const { setCommandOpen, setShortcutsOpen, pendingGoKey, sidebarCollapsed } = useShortcuts();

  return (
    <div
      className={cn(
        "fixed bottom-0 right-0 z-[80] flex items-center gap-2 sm:gap-3 border-t border-l border-border/50 bg-card/90 backdrop-blur-md px-3 sm:px-4 py-1.5 text-[10px] text-muted-foreground transition-all",
        "left-0 md:left-auto",
        sidebarCollapsed ? "md:left-[4.5rem]" : "md:left-64"
      )}
    >
      {pendingGoKey && (
        <span className="text-primary animate-pulse font-medium">Go to… (G pressed)</span>
      )}
      <button
        type="button"
        className="hidden sm:flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => setCommandOpen(true)}
      >
        <Command className="h-3 w-3" />
        <Kbd>Ctrl</Kbd>+<Kbd>K</Kbd> command
      </button>
      <button
        type="button"
        className="hidden md:flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => setShortcutsOpen(true)}
      >
        <Keyboard className="h-3 w-3" />
        <Kbd>Shift</Kbd>+<Kbd>?</Kbd> shortcuts
      </button>
      <span className="hidden lg:inline opacity-60">G then D/L/F — quick nav</span>
    </div>
  );
}
