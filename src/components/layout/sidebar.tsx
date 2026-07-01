"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Brain,
  GitBranch,
  LayoutDashboard,
  ListTodo,
  FileText,
  Activity,
  AlertTriangle,
} from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/proposals", label: "Proposals", icon: FileText },
  { href: "/brain", label: "Project Brain", icon: Brain },
  { href: "/branches", label: "Decision Branches", icon: GitBranch },
  { href: "/tasks", label: "Implementation", icon: ListTodo },
  { href: "/agents", label: "Agent Activity", icon: Activity },
  { href: "/drift", label: "Drift Detection", icon: AlertTriangle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-6">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-primary">Andex</span> AI
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          GitHub for Engineering Decisions
        </p>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4">
        <p className="text-xs text-muted-foreground">
          Solving <span className="text-foreground font-medium">Mental Model Drift</span>
        </p>
      </div>
    </aside>
  );
}
