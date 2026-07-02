"use client";

import { SHORTCUTS } from "@/lib/shortcuts/registry";
import { useShortcuts } from "@/lib/context/shortcuts-context";
import { cn } from "@/lib/utils";
import { Keyboard, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const CATEGORIES = [
  { id: "help", label: "Help & discovery" },
  { id: "navigation", label: "Navigation (expert)" },
  { id: "actions", label: "Actions" },
  { id: "roles", label: "Demo roles" },
  { id: "view", label: "View" },
] as const;

export function ShortcutsModal() {
  const { shortcutsOpen, setShortcutsOpen } = useShortcuts();

  if (!shortcutsOpen) return null;

  const beginner = SHORTCUTS.filter((s) => s.tier === "beginner" || s.tier === "both");
  const expert = SHORTCUTS.filter((s) => s.tier === "expert" || s.tier === "both");

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShortcutsOpen(false)} />
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-xl border border-border glass sakura-border shadow-2xl flex flex-col animate-in">
        <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold">Keyboard shortcuts</h2>
              <p className="text-xs text-muted-foreground">Beginner-friendly defaults + expert vim-style navigation</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShortcutsOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-400/90 mb-3">Beginners — start here</h3>
            <ShortcutGrid shortcuts={beginner.filter((s) => s.tier === "beginner" || s.category === "help" || s.category === "roles")} />
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Everyone</h3>
            <ShortcutGrid shortcuts={SHORTCUTS.filter((s) => s.tier === "both" && s.category !== "navigation")} />
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-400/90 mb-3">Experts — vim-style (G then key)</h3>
            <ShortcutGrid shortcuts={expert.filter((s) => s.category === "navigation")} />
            <p className="text-xs text-muted-foreground mt-2">Press <Kbd>G</Kbd> then a letter within 1.2s — e.g. <Kbd>G</Kbd> <Kbd>L</Kbd> → Lifecycle OS</p>
          </section>

          {CATEGORIES.map((cat) => {
            const items = SHORTCUTS.filter((s) => s.category === cat.id && !["help", "navigation", "roles"].includes(cat.id));
            if (!items.length) return null;
            return (
              <section key={cat.id}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{cat.label}</h3>
                <ShortcutGrid shortcuts={items} />
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ShortcutGrid({ shortcuts }: { shortcuts: typeof SHORTCUTS }) {
  const unique = shortcuts.filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {unique.map((s) => (
        <div key={s.id} className="flex items-start justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-medium">{s.label}</p>
            <p className="text-[11px] text-muted-foreground">{s.description}</p>
          </div>
          <div className="flex flex-wrap gap-1 justify-end shrink-0">
            {s.keys.map((k, i) => (
              <span key={i}>
                {i > 0 && s.keys.length === 2 && s.id.startsWith("go-") ? (
                  <span className="text-muted-foreground text-[10px] mx-0.5">then</span>
                ) : i > 0 ? (
                  <span className="text-muted-foreground text-[10px] mx-0.5">+</span>
                ) : null}
                <Kbd>{k}</Kbd>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className={cn("inline-flex min-w-[1.5rem] items-center justify-center rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono shadow-sm")}>
      {children}
    </kbd>
  );
}

export { Kbd };
