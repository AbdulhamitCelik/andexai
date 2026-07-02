"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { COMMAND_ITEMS } from "@/lib/shortcuts/registry";
import { useShortcuts } from "@/lib/context/shortcuts-context";
import { useUser } from "@/lib/context/user-context";
import { useTheme } from "@/lib/context/theme-context";
import { TEAM_MEMBERS } from "@/lib/auth/team";
import { Search } from "lucide-react";

export function CommandPalette() {
  const { commandOpen, setCommandOpen, setShortcutsOpen, setGuideOpen, triggerRefresh } = useShortcuts();
  const { setCurrentUser } = useUser();
  const { toggleTheme } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return COMMAND_ITEMS;
    return COMMAND_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.keywords?.some((k) => k.includes(q))
    );
  }, [query]);

  useEffect(() => {
    if (!commandOpen) {
      setQuery("");
      setSelected(0);
    }
  }, [commandOpen]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const runItem = (item: (typeof COMMAND_ITEMS)[0]) => {
    setCommandOpen(false);
    if (item.href) {
      router.push(item.href);
      return;
    }
    switch (item.action) {
      case "toggle-theme":
        toggleTheme();
        break;
      case "show-shortcuts":
        setShortcutsOpen(true);
        break;
      case "show-guide":
        setGuideOpen(true);
        break;
      case "refresh":
        triggerRefresh();
        break;
      case "role-manager":
        setCurrentUser(TEAM_MEMBERS.find((m) => m.memoryRole === "manager")!);
        break;
      case "role-developer":
        setCurrentUser(TEAM_MEMBERS.find((m) => m.id === "wkr-1")!);
        break;
      case "role-intern":
        setCurrentUser(TEAM_MEMBERS.find((m) => m.memoryRole === "intern")!);
        break;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter" && filtered[selected]) {
      e.preventDefault();
      runItem(filtered[selected]);
    }
  };

  if (!commandOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setCommandOpen(false)} />
      <div className="relative w-full max-w-lg rounded-xl border border-border glass sakura-border shadow-2xl overflow-hidden animate-in">
        <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search pages, actions, roles…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd className="hidden sm:inline text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">Esc</kbd>
        </div>
        <ul className="max-h-72 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">No matches</li>
          ) : (
            filtered.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                    i === selected ? "bg-primary/15 text-primary" : "hover:bg-accent/50"
                  )}
                  onClick={() => runItem(item)}
                  onMouseEnter={() => setSelected(i)}
                >
                  <item.icon className="h-4 w-4 shrink-0 opacity-70" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{item.label}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                    )}
                  </div>
                  {item.tier === "beginner" && (
                    <span className="text-[9px] uppercase tracking-wider text-rose-400/80 shrink-0">Start here</span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="border-t border-border/70 px-4 py-2 flex justify-between text-[10px] text-muted-foreground">
          <span>↑↓ navigate · Enter select</span>
          <span>Ctrl+K anytime</span>
        </div>
      </div>
    </div>
  );
}
