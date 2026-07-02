import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Workflow,
  Lightbulb,
  FileText,
  GitBranch,
  ListTodo,
  Brain,
  Shield,
  Moon,
  User,
  Keyboard,
  Sparkles,
  RefreshCw,
} from "lucide-react";

export type ShortcutTier = "beginner" | "expert" | "both";

export interface ShortcutDefinition {
  id: string;
  keys: string[];
  label: string;
  description: string;
  tier: ShortcutTier;
  category: "navigation" | "actions" | "roles" | "view" | "help";
}

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  href?: string;
  action?: string;
  icon: LucideIcon;
  keywords?: string[];
  tier?: ShortcutTier;
}

export const SHORTCUTS: ShortcutDefinition[] = [
  { id: "command-palette", keys: ["Ctrl", "K"], label: "Command palette", description: "Search pages and run actions", tier: "both", category: "help" },
  { id: "shortcuts-help", keys: ["Shift", "?"], label: "Keyboard shortcuts", description: "Show all shortcuts", tier: "beginner", category: "help" },
  { id: "beginner-guide", keys: ["Ctrl", "/"], label: "Quick start guide", description: "Open beginner walkthrough", tier: "beginner", category: "help" },
  { id: "toggle-theme", keys: ["Ctrl", "Shift", "T"], label: "Toggle theme", description: "Switch dark / light mode", tier: "both", category: "view" },
  { id: "toggle-sidebar", keys: ["Ctrl", "B"], label: "Toggle sidebar", description: "Collapse or expand navigation", tier: "expert", category: "view" },
  { id: "refresh-data", keys: ["Ctrl", "Shift", "R"], label: "Refresh data", description: "Reload current page data", tier: "both", category: "actions" },
  { id: "go-dashboard", keys: ["G", "D"], label: "Go to Dashboard", description: "Press G then D (vim-style)", tier: "expert", category: "navigation" },
  { id: "go-lifecycle", keys: ["G", "L"], label: "Go to Lifecycle OS", description: "Press G then L", tier: "expert", category: "navigation" },
  { id: "go-discovery", keys: ["G", "F"], label: "Go to Feature Packs", description: "Press G then F", tier: "expert", category: "navigation" },
  { id: "go-proposals", keys: ["G", "P"], label: "Go to Suggestions", description: "Press G then P", tier: "expert", category: "navigation" },
  { id: "go-tasks", keys: ["G", "T"], label: "Go to Tasks", description: "Press G then T", tier: "expert", category: "navigation" },
  { id: "go-governance", keys: ["G", "M"], label: "Go to Memory Governance", description: "Press G then M", tier: "expert", category: "navigation" },
  { id: "role-manager", keys: ["Ctrl", "Shift", "1"], label: "Switch to Manager", description: "Demo as Sarah (manager)", tier: "both", category: "roles" },
  { id: "role-developer", keys: ["Ctrl", "Shift", "2"], label: "Switch to Developer", description: "Demo as Alex (developer)", tier: "both", category: "roles" },
  { id: "role-intern", keys: ["Ctrl", "Shift", "3"], label: "Switch to Intern", description: "Demo as Sam (intern) — restricted memory", tier: "both", category: "roles" },
  { id: "close-modal", keys: ["Esc"], label: "Close panel", description: "Close palette, modal, or guide", tier: "beginner", category: "help" },
];

export const COMMAND_ITEMS: CommandItem[] = [
  { id: "nav-dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard, keywords: ["home", "overview"], tier: "both" },
  { id: "nav-lifecycle", label: "Lifecycle OS", href: "/lifecycle", icon: Workflow, keywords: ["council", "pipeline"], tier: "both" },
  { id: "nav-feature-packs", label: "Feature Packs", href: "/feature-packs", icon: Lightbulb, keywords: ["discovery", "feedback"], tier: "both" },
  { id: "nav-proposals", label: "Suggestions", href: "/proposals", icon: FileText, keywords: ["proposal", "vote"], tier: "both" },
  { id: "nav-branches", label: "Branches", href: "/branches", icon: GitBranch, keywords: ["decision", "branch"], tier: "both" },
  { id: "nav-tasks", label: "Implementation Tasks", href: "/tasks", icon: ListTodo, keywords: ["tasks", "implementation"], tier: "both" },
  { id: "nav-brain", label: "Main Ideas / Project Brain", href: "/brain", icon: Brain, keywords: ["brain", "memory", "vision"], tier: "both" },
  { id: "nav-governance", label: "Memory Governance", href: "/memory-governance", icon: Shield, keywords: ["permissions", "governance"], tier: "both" },
  { id: "action-theme", label: "Toggle dark / light mode", action: "toggle-theme", icon: Moon, keywords: ["theme", "dark", "light"], tier: "both" },
  { id: "action-shortcuts", label: "Show keyboard shortcuts", action: "show-shortcuts", icon: Keyboard, keywords: ["help", "keys"], tier: "beginner" },
  { id: "action-guide", label: "Open quick start guide", action: "show-guide", icon: Sparkles, keywords: ["beginner", "tutorial", "start"], tier: "beginner" },
  { id: "action-refresh", label: "Refresh page data", action: "refresh", icon: RefreshCw, keywords: ["reload", "sync"], tier: "both" },
  { id: "action-manager", label: "Switch to Manager (Sarah)", action: "role-manager", icon: User, keywords: ["role", "demo"], tier: "both" },
  { id: "action-developer", label: "Switch to Developer (Alex)", action: "role-developer", icon: User, tier: "both" },
  { id: "action-intern", label: "Switch to Intern (Sam)", action: "role-intern", icon: User, tier: "both" },
];

export const VIM_NAV_MAP: Record<string, string> = {
  d: "/",
  l: "/lifecycle",
  f: "/feature-packs",
  p: "/proposals",
  b: "/branches",
  t: "/tasks",
  m: "/memory-governance",
  g: "/brain",
};

export const BEGINNER_STEPS = [
  { step: 1, title: "Seed or select a project", detail: "Dashboard → use API seed or existing project", href: "/" },
  { step: 2, title: "Run Discovery", detail: "Feature Packs → cluster feedback into priority-scored packs", href: "/feature-packs" },
  { step: 3, title: "Promote & vote", detail: "Promote a pack → workers vote on the suggestion", href: "/proposals" },
  { step: 4, title: "Manager approves", detail: "Switch to Manager (Ctrl+Shift+1) → Accept proposal", href: "/proposals" },
  { step: 5, title: "Follow the lifecycle", detail: "Lifecycle OS → Planning → Implementation → Testing → Evaluation", href: "/lifecycle" },
  { step: 6, title: "Try Memory Governance", detail: "Switch to Intern (Ctrl+Shift+3) → see permission filtering", href: "/memory-governance" },
];

export function formatKeys(keys: string[]): string {
  return keys.join(" + ");
}
