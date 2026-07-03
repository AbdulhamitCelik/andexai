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
  User,
  ClipboardList,
  Lightbulb,
  Shield,
  Workflow,
  Moon,
  Sun,
  Command,
  BookOpen,
  PanelLeftClose,
  PanelLeft,
  PhoneCall,
  Gamepad2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AndexLogo } from "@/components/brand/andex-logo";
import { useTheme } from "@/lib/context/theme-context";
import { useShortcuts } from "@/lib/context/shortcuts-context";
import { Button } from "@/components/ui/button";
import { useExperienceMode } from "@/lib/context/experience-mode-context";
import { gamifiedLabel, gamifiedSection, xpProgressInLevel } from "@/lib/gamification/quests";

const nav = [
  {
    section: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/lifecycle", label: "Lifecycle OS", icon: Workflow },
      { href: "/call", label: "Voice Assistant", icon: PhoneCall },
    ],
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

export function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
  const pathname = usePathname();
  const { currentUser, setCurrentUser, isManager } = useUser();
  const { setCommandOpen, setShortcutsOpen, setGuideOpen, toggleSidebar, mobileNavOpen, closeMobileNav } =
    useShortcuts();
  const { isGamified, level, xp, setMode, mode } = useExperienceMode();

  const managers = TEAM_MEMBERS.filter((m) => m.role === "manager");
  const workers = TEAM_MEMBERS.filter((m) => m.role === "worker");
  const xpBar = xpProgressInLevel(xp);
  const compact = collapsed && !mobileNavOpen;

  useEffect(() => {
    closeMobileNav();
  }, [pathname, closeMobileNav]);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[min(18rem,88vw)] flex-col border-r border-border/70 glass transition-transform duration-300 ease-in-out",
        "md:relative md:z-auto md:h-screen md:translate-x-0 md:shrink-0",
        mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        collapsed ? "md:w-[4.5rem]" : "md:w-64",
        isGamified && "gamified-sidebar border-amber-500/20"
      )}
    >
      <div className={cn("border-b border-border/70", compact ? "p-3" : "p-4 md:p-5")}>
        <div className="flex items-start justify-between gap-2">
          <div className={cn(compact ? "flex justify-center w-full" : "min-w-0 flex-1")}>
            <AndexLogo
              href="/"
              iconOnly={compact}
              size="sm"
              showAi
              tagline={
                compact
                  ? undefined
                  : isGamified
                    ? "Quest Mode — earn XP as you build"
                    : "AI councils for product development"
              }
              priority
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 p-0 md:hidden"
            onClick={closeMobileNav}
            aria-label="Close navigation menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        {!compact && (
          <div className="mt-3 flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-[10px] gap-1 px-2"
              onClick={() => {
                setCommandOpen(true);
                closeMobileNav();
              }}
            >
              <Command className="h-3 w-3" /> <span className="hidden sm:inline">Ctrl+K</span><span className="sm:hidden">Search</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Quick start" onClick={() => setGuideOpen(true)}>
              <BookOpen className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Shortcuts" onClick={() => setShortcutsOpen(true)}>
              <span className="text-[10px] font-mono">?</span>
            </Button>
          </div>
        )}
      </div>

      {!compact && (
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
          {isGamified ? (isManager ? "Guild Master" : "Adventurer") : isManager ? "Manager" : "Worker"}
        </Badge>
        {isGamified && !compact && (
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-2 space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-amber-300/90">Level {level}</span>
              <span className="text-muted-foreground">{xpBar.current}/{xpBar.max} XP</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-violet-400"
                style={{ width: `${xpBar.percent}%` }}
              />
            </div>
          </div>
        )}
        <Badge variant="secondary" className="text-[10px] capitalize">
          Memory: {currentUser.memoryRole}
        </Badge>
      </div>
      )}

      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        {nav.map((group) => (
          <div key={group.section}>
            {!compact && (
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              {isGamified ? gamifiedSection(group.section) : group.section}
            </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const label = isGamified ? gamifiedLabel(item.label, item.href) : item.label;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={compact ? label : undefined}
                    onClick={closeMobileNav}
                    className={cn(
                      "group relative flex items-center rounded-lg text-sm transition-colors min-h-[44px]",
                      compact ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
                      active
                        ? isGamified
                          ? "bg-amber-500/15 text-amber-200"
                          : "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    )}
                  >
                    {active && !compact && (
                      <span
                        className={cn(
                          "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full",
                          isGamified ? "bg-amber-400" : "bg-primary"
                        )}
                      />
                    )}
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!compact && label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {!compact && <LlmStatus />}
      <div className="border-t border-border/70 p-4 space-y-2">
        {!compact && (
          <Button
            variant="outline"
            size="sm"
            className={cn("w-full gap-2 text-[11px]", isGamified && "border-amber-500/30 text-amber-200")}
            onClick={() => (mode === "gamified" ? setMode("normal") : setMode("gamified"))}
          >
            {mode === "gamified" ? (
              <>
                <BookOpen className="h-4 w-4" /> Switch to Classic
              </>
            ) : (
              <>
                <Gamepad2 className="h-4 w-4" /> Switch to Quest Mode
              </>
            )}
          </Button>
        )}
        <ThemeToggle collapsed={compact} />
        <Button
          variant="ghost"
          size="sm"
          className={cn("hidden md:flex w-full gap-2", collapsed && "px-0")}
          onClick={toggleSidebar}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && "Collapse sidebar"}
        </Button>
      </div>
    </aside>
  );
}

function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button variant="outline" size="sm" className={cn("w-full gap-2", collapsed && "px-2")} onClick={toggleTheme}>
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {!collapsed && (theme === "dark" ? "Light mode" : "Dark mode")}
    </Button>
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
