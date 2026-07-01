import { NextRequest, NextResponse } from "next/server";
import {
  getProjectBrain,
  getProposals,
  getBranches,
  getTasks,
  getAgentLogs,
  getDriftAlerts,
  seedProject,
  seedUniversity,
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

export async function POST(req: NextRequest) {
  // Body: { scenario?: "ecommerce" | "university" }. Defaults to ecommerce.
  let scenario = "ecommerce";
  try {
    const body = await req.json();
    if (body?.scenario) scenario = String(body.scenario);
  } catch {
    /* no body — use default */
  }

  if (scenario === "university") {
    seedUniversity();
    return NextResponse.json({ success: true, scenario, message: "Metropolitan University test data seeded" });
  }

  seedProject();
  detectDrift();
  return NextResponse.json({ success: true, scenario: "ecommerce", message: "E-Commerce demo seeded" });
}
