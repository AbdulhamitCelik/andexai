"use client";

import { Menu, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AndexLogo } from "@/components/brand/andex-logo";
import { useShortcuts } from "@/lib/context/shortcuts-context";
import { useUser } from "@/lib/context/user-context";
import { Badge } from "@/components/ui/badge";

export function MobileHeader() {
  const { setMobileNavOpen, setCommandOpen } = useShortcuts();
  const { currentUser, isManager } = useUser();

  return (
    <header className="sticky top-0 z-30 flex md:hidden items-center justify-between gap-3 border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur-md">
      <div className="flex items-center gap-2 min-w-0">
        <Button
          variant="outline"
          size="sm"
          className="h-9 w-9 shrink-0 p-0"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <AndexLogo size="sm" showAi href="/" className="min-w-0" />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="secondary" className="text-[10px] max-w-[5rem] truncate hidden sm:inline-flex">
          {currentUser.name}
        </Badge>
        <Badge variant={isManager ? "success" : "secondary"} className="text-[10px]">
          {isManager ? "Mgr" : "Wkr"}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0"
          onClick={() => setCommandOpen(true)}
          aria-label="Open command palette"
        >
          <Command className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
