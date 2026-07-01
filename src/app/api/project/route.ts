import { NextResponse } from "next/server";
import {
  getProjectBrain,
  getProposals,
  getBranches,
  getTasks,
  getAgentLogs,
  getDriftAlerts,
  seedProject,
  detectDrift,
} from "@/lib/agents/orchestrator";

export async function GET() {
  let brain = getProjectBrain();
  if (!brain) brain = seedProject();

  return NextResponse.json({
    project: brain,
    proposals: getProposals(),
    branches: getBranches(),
    tasks: getTasks(),
    agentLogs: getAgentLogs().slice(0, 20),
    driftAlerts: getDriftAlerts(),
    stats: {
      openProposals: getProposals().filter((p) => !["merged", "rejected", "archived"].includes(p.status)).length,
      mergedDecisions: getBranches().filter((b) => b.merged).length,
      pendingTasks: getTasks().filter((t) => t.status === "pending").length,
      driftAlerts: getDriftAlerts().length,
    },
  });
}

export async function POST() {
  seedProject();
  detectDrift();
  return NextResponse.json({ success: true, message: "Demo project seeded" });
}
