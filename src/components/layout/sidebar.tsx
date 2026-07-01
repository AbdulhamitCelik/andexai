"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Brain,
  GitBranch,
  LayoutDashboard,
  ListTodo,
  FileText,
  Activity,
  AlertTriangle,
  Sparkles,
} from "lucide-react";

const nav = [
  {
    section: "Overview",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    section: "Decisions",
    items: [
      { href: "/proposals", label: "Proposals", icon: FileText },
      { href: "/branches", label: "Decision Branches", icon: GitBranch },
      { href: "/tasks", label: "Implementation", icon: ListTodo },
    ],
  },
  {
    section: "Knowledge",
    items: [
      { href: "/brain", label: "Project Brain", icon: Brain },
      { href: "/agents", label: "Agent Activity", icon: Activity },
      { href: "/drift", label: "Drift Detection", icon: AlertTriangle },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border/70 glass">
      <div className="border-b border-border/70 p-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-500 shadow-lg shadow-primary/30">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none tracking-tight">
              <span className="text-gradient">Andex</span> AI
            </h1>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Decisions, version-controlled
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        {nav.map((group) => (
          <div key={group.section}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {group.section}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
                    )}
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <LlmStatus />
    </aside>
  );
}

function LlmStatus() {
  const [ready, setReady] = useState<boolean | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch("/api/llm")
      .then((r) => r.json())
      .then((d) => {
        setReady(Boolean(d.ready));
        setCount(Array.isArray(d.configured) ? d.configured.length : 0);
      })
      .catch(() => setReady(false));
  }, []);

  return (
    <div className="border-t border-border/70 p-4">
      <div className="flex items-center gap-2 text-xs">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            ready == null
              ? "bg-muted-foreground/40"
              : ready
                ? "bg-emerald-400 animate-pulse-dot"
                : "bg-amber-400"
          )}
        />
        <span className="text-muted-foreground">
          {ready == null
            ? "Checking LLM…"
            : ready
              ? `${count} LLM provider${count === 1 ? "" : "s"} online`
              : "No LLM configured"}
        </span>
      </div>
    </div>
  );
}
