import type { TeamMember } from "@/lib/types";

/** Demo team with three governance roles for judges */
export const TEAM_MEMBERS: TeamMember[] = [
  { id: "mgr-1", name: "Sarah", role: "manager", memoryRole: "manager" },
  { id: "wkr-1", name: "Alex", role: "worker", memoryRole: "developer" },
  { id: "wkr-2", name: "Jordan", role: "worker", memoryRole: "developer" },
  { id: "wkr-3", name: "Sam", role: "worker", memoryRole: "intern" },
  { id: "wkr-4", name: "Taylor", role: "worker", memoryRole: "intern" },
  { id: "wkr-5", name: "Riley", role: "worker", memoryRole: "developer" },
  { id: "wkr-6", name: "Casey", role: "worker", memoryRole: "intern" },
  { id: "wkr-7", name: "Joachim", role: "worker", memoryRole: "developer" },
];

export function getTeamMember(id: string): TeamMember | undefined {
  return TEAM_MEMBERS.find((m) => m.id === id);
}

export function getTeamMembers(): TeamMember[] {
  return TEAM_MEMBERS;
}

export function getManagers(): TeamMember[] {
  return TEAM_MEMBERS.filter((m) => m.role === "manager");
}

export function canVote(role: TeamMember["role"]): boolean {
  return role === "worker";
}

export function canManage(role: TeamMember["role"]): boolean {
  return role === "manager";
}

export function getWorkers(): TeamMember[] {
  return TEAM_MEMBERS.filter((m) => m.role === "worker");
}

export function getGovernanceDemoUsers(): TeamMember[] {
  return [
    TEAM_MEMBERS.find((m) => m.memoryRole === "manager")!,
    TEAM_MEMBERS.find((m) => m.memoryRole === "developer")!,
    TEAM_MEMBERS.find((m) => m.memoryRole === "intern")!,
  ];
}
