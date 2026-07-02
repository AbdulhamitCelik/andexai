import { TEAM_MEMBERS } from "@/lib/auth/team";
import type { ImplementationTask, ResourceEngineOutput, SprintPlan } from "@/lib/types";

const ROLE_SKILLS: Record<string, string[]> = {
  "wkr-2": ["Architecture", "Tech Lead", "Backend"],
  "wkr-1": ["Backend", "Frontend", "API"],
  "wkr-5": ["QA", "Testing", "Accessibility"],
  "wkr-4": ["Frontend", "UI", "Mobile"],
  "wkr-6": ["DevOps", "Deployment", "Monitoring"],
  "wkr-3": ["Documentation", "Support"],
};

const ROLE_LABELS: Record<string, string> = {
  "wkr-2": "Tech Lead",
  "wkr-1": "Backend Engineer",
  "wkr-5": "QA Engineer",
  "wkr-4": "Frontend Engineer",
  "wkr-6": "DevOps Engineer",
  "wkr-3": "Documentation",
};

export function buildResourcePlan(input: {
  requiredSkills: string[];
  sprints: SprintPlan[];
  tasks: ImplementationTask[];
}): ResourceEngineOutput {
  const workers = TEAM_MEMBERS.filter((m) => m.role === "worker");
  const taskCount = input.tasks.length;
  const pending = input.tasks.filter((t) => t.status === "pending").length;

  const allocations = input.requiredSkills.map((skill) => {
    const match = workers.find((w) => ROLE_SKILLS[w.id]?.some((s) => skill.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(skill.toLowerCase())));
    const assignee = match ?? workers[0];
    const workload = Math.min(95, 40 + taskCount * 8 + pending * 5);
    return {
      role: skill,
      assignee: assignee.name,
      assigneeId: assignee.id,
      workloadPercent: workload,
      skills: ROLE_SKILLS[assignee.id] ?? [skill],
      rationale: `${assignee.name} matched for ${skill} based on skills and current capacity`,
    };
  });

  const bottlenecks: string[] = [];
  const overloaded = allocations.filter((a) => a.workloadPercent > 85);
  if (overloaded.length) bottlenecks.push(`${overloaded.map((a) => a.assignee).join(", ")} above 85% capacity`);
  if (pending > taskCount / 2) bottlenecks.push(`${pending} pending tasks — QA bottleneck likely in Sprint 4`);

  const sprintAdjustments =
    bottlenecks.length > 0
      ? ["Move non-critical Sprint 3 items to Sprint 4", "Add pair programming on blocked backend tasks"]
      : ["Current sprint allocation balanced — no moves required"];

  return {
    allocations,
    bottlenecks,
    velocityEstimate: `${Math.max(1, taskCount - pending)} tasks/sprint at current velocity`,
    completionForecast: pending === 0 ? "On track for release" : `${pending} tasks remaining — est. 1–2 sprints`,
    sprintAdjustments,
    summary: `Resource Engine analysed ${workers.length} engineers across ${input.requiredSkills.length} skill areas. ${bottlenecks.length ? bottlenecks.length + " bottleneck(s) detected." : "Capacity adequate."}`,
  };
}

export function assignTasksFromResources(
  tasks: ImplementationTask[],
  resources: ResourceEngineOutput
): ImplementationTask[] {
  const devs = resources.allocations.filter((a) => !a.role.toLowerCase().includes("qa"));
  const qa = resources.allocations.find((a) => a.role.toLowerCase().includes("qa"));

  return tasks.map((task, i) => {
    const isQa = task.title.toLowerCase().includes("valid") || task.title.toLowerCase().includes("test");
    const pool = isQa && qa ? [qa] : devs;
    const alloc = pool[i % pool.length];
    return { ...task, assignee: alloc?.assignee ?? task.assignee };
  });
}

export function getOwnerRecommendations(resources: ResourceEngineOutput) {
  return resources.allocations.map((a) => ({
    role: ROLE_LABELS[a.assigneeId] ?? a.role,
    assignee: a.assignee,
    rationale: a.rationale,
  }));
}
