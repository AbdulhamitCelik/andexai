export type ExperienceMode = "normal" | "gamified";

export interface QuestDefinition {
  id: string;
  route: string;
  title: string;
  classicLabel: string;
  description: string;
  xp: number;
  section: string;
  gamifiedSection: string;
}

export const GAMIFIED_SECTIONS: Record<string, string> = {
  Overview: "Campaign",
  Governance: "Royal Decree",
  Discovery: "Exploration",
  Decisions: "Battle Plans",
  Knowledge: "Ancient Lore",
};

export const QUESTS: QuestDefinition[] = [
  {
    id: "dashboard",
    route: "/",
    title: "Command Center",
    classicLabel: "Dashboard",
    description: "Survey your product kingdom and plan the next move.",
    xp: 25,
    section: "Overview",
    gamifiedSection: "Campaign",
  },
  {
    id: "lifecycle",
    route: "/lifecycle",
    title: "Quest Map",
    classicLabel: "Lifecycle OS",
    description: "Follow the eight-council journey from discovery to learning.",
    xp: 40,
    section: "Overview",
    gamifiedSection: "Campaign",
  },
  {
    id: "voice",
    route: "/call",
    title: "Oracle's Call",
    classicLabel: "Voice Assistant",
    description: "Speak with the Andex AI guide in real time.",
    xp: 30,
    section: "Overview",
    gamifiedSection: "Campaign",
  },
  {
    id: "governance",
    route: "/memory-governance",
    title: "Memory Vault",
    classicLabel: "Memory Governance",
    description: "Master who can see what before AI retrieves anything.",
    xp: 35,
    section: "Governance",
    gamifiedSection: "Royal Decree",
  },
  {
    id: "discovery",
    route: "/feature-packs",
    title: "Discovery Dungeon",
    classicLabel: "Feature Packs",
    description: "Mine customer feedback and forge priority packs.",
    xp: 45,
    section: "Discovery",
    gamifiedSection: "Exploration",
  },
  {
    id: "proposals",
    route: "/proposals",
    title: "Decision Arena",
    classicLabel: "Suggestions",
    description: "Propose changes and rally the team to vote.",
    xp: 50,
    section: "Decisions",
    gamifiedSection: "Battle Plans",
  },
  {
    id: "branches",
    route: "/branches",
    title: "Branch Forge",
    classicLabel: "Branches",
    description: "Track approved decisions as living branches.",
    xp: 35,
    section: "Decisions",
    gamifiedSection: "Battle Plans",
  },
  {
    id: "tasks",
    route: "/tasks",
    title: "Build Quests",
    classicLabel: "Implementation",
    description: "Complete implementation tasks and ship the win.",
    xp: 40,
    section: "Decisions",
    gamifiedSection: "Battle Plans",
  },
  {
    id: "brain",
    route: "/brain",
    title: "Project Brain Shrine",
    classicLabel: "Main Ideas",
    description: "Consult the sacred project vision and main ideas.",
    xp: 30,
    section: "Knowledge",
    gamifiedSection: "Ancient Lore",
  },
  {
    id: "requirements",
    route: "/requirements",
    title: "Scroll of Requirements",
    classicLabel: "Requirements",
    description: "Study the formal requirements your guild must honour.",
    xp: 25,
    section: "Knowledge",
    gamifiedSection: "Ancient Lore",
  },
  {
    id: "agents",
    route: "/agents",
    title: "Agent Observatory",
    classicLabel: "Agent Activity",
    description: "Watch AI agents work — every action logged.",
    xp: 25,
    section: "Knowledge",
    gamifiedSection: "Ancient Lore",
  },
  {
    id: "drift",
    route: "/drift",
    title: "Drift Watchtower",
    classicLabel: "Drift Detection",
    description: "Spot when reality diverges from the shared mental model.",
    xp: 35,
    section: "Knowledge",
    gamifiedSection: "Ancient Lore",
  },
];

export const ACHIEVEMENTS = [
  { id: "first_steps", title: "First Steps", description: "Enter the Command Center", xpBonus: 20, route: "/" },
  { id: "explorer", title: "Realm Explorer", description: "Visit 5 different areas", xpBonus: 50, minRoutes: 5 },
  { id: "council", title: "Council Seeker", description: "Open the Quest Map", xpBonus: 30, route: "/lifecycle" },
  { id: "democracy", title: "Democracy Champion", description: "Enter the Decision Arena", xpBonus: 30, route: "/proposals" },
  { id: "level_5", title: "Seasoned Adventurer", description: "Reach Level 5", xpBonus: 75, minLevel: 5 },
] as const;

export function questForPath(pathname: string): QuestDefinition | undefined {
  const exact = QUESTS.find((q) => q.route === pathname);
  if (exact) return exact;
  if (pathname.startsWith("/proposals/")) return QUESTS.find((q) => q.id === "proposals");
  if (pathname.startsWith("/brain/")) return QUESTS.find((q) => q.id === "brain");
  return QUESTS.find((q) => pathname.startsWith(q.route + "/") || pathname === q.route);
}

export function gamifiedLabel(classicLabel: string, href: string): string {
  const quest = QUESTS.find((q) => q.route === href);
  return quest?.title ?? classicLabel;
}

export function gamifiedSection(section: string): string {
  return GAMIFIED_SECTIONS[section] ?? section;
}

export function levelFromXp(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

export function xpProgressInLevel(xp: number): { current: number; max: number; percent: number } {
  const level = levelFromXp(xp);
  const levelStart = (level - 1) * 100;
  const current = xp - levelStart;
  return { current, max: 100, percent: Math.min(100, (current / 100) * 100) };
}

export const STORAGE_MODE = "andex-experience-mode";
export const STORAGE_GAME = "andex-gamification";
