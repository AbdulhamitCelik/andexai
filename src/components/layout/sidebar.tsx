"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useUser } from "@/lib/context/user-context";
import { TEAM_MEMBERS } from "@/lib/auth/team";
import {
  Brain,
  GitBranch,
  LayoutDashboard,
  ListTodo,
  FileText,
  Activity,
  AlertTriangle,
  Sparkles,
  User,
  ClipboardList,
  Lightbulb,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const nav = [
  {
    section: "Overview",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    section: "Governance",
    items: [{ href: "/memory-governance", label: "Memory Governance", icon: Shield }],
  },
  {
    section: "Discovery",
    items: [{ href: "/feature-packs", label: "Feature Packs", icon: Lightbulb }],
  },
  {
    section: "Decisions",
    items: [
      { href: "/proposals", label: "Suggestions", icon: FileText },
      { href: "/branches", label: "Branches", icon: GitBranch },
      { href: "/tasks", label: "Implementation", icon: ListTodo },
    ],
  },
  {
    section: "Knowledge",
    items: [
      { href: "/brain", label: "Main Ideas", icon: Brain },
      { href: "/requirements", label: "Requirements", icon: ClipboardList },
      { href: "/agents", label: "Agent Activity", icon: Activity },
      { href: "/drift", label: "Drift Detection", icon: AlertTriangle },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { currentUser, setCurrentUser, isManager } = useUser();

  const managers = TEAM_MEMBERS.filter((m) => m.role === "manager");
  const workers = TEAM_MEMBERS.filter((m) => m.role === "worker");

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
            <p className="mt-1 text-[11px] text-muted-foreground">Decisions, version-controlled</p>
          </div>
        </Link>
      </div>

      <div className="border-b border-border/70 p-4 space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <User className="h-3 w-3" /> Team member
        </p>
        <select
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs"
          value={currentUser.id}
          onChange={(e) => {
            const m = TEAM_MEMBERS.find((x) => x.id === e.target.value);
            if (m) setCurrentUser(m);
          }}
        >
          <optgroup label="Manager">
            {managers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </optgroup>
          <optgroup label="Workers">
            {workers.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </optgroup>
        </select>
        <Badge variant={isManager ? "success" : "secondary"} className="text-[10px]">
          {isManager ? "Manager" : "Worker"}
        </Badge>
        <Badge variant="secondary" className="text-[10px] capitalize">
          Memory: {currentUser.memoryRole}
        </Badge>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        {nav.map((group) => (
          <div key={group.section}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {group.section}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
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
