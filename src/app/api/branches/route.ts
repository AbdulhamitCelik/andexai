import { NextResponse } from "next/server";
import {
  getBranches,
  getBranch,
  getProjects,
  mergeBranchToMain,
  discardBranch,
  startBranchImplementation,
} from "@/lib/agents/orchestrator";
import { canManage, getTeamMember } from "@/lib/auth/team";

export async function GET() {
  const branches = await getBranches();
  const projects = await getProjects();
  return NextResponse.json({
    branches,
    projects,
    mainIdea: projects[0] ?? null,
    openBranches: branches.filter((b) => ["open", "implementing"].includes(b.status)),
  });
}

export async function POST(req: Request) {
  const { branchId, action, managerId = "mgr-1" } = await req.json();
  if (!branchId || !action) {
    return NextResponse.json({ error: "branchId and action required" }, { status: 400 });
  }

  const manager = getTeamMember(managerId);
  if (!manager || !canManage(manager.role)) {
    return NextResponse.json({ error: "Only managers can perform this action" }, { status: 403 });
  }

  try {
    switch (action) {
      case "discard": {
        const branch = await discardBranch(branchId, managerId);
        return NextResponse.json({ success: true, branch, projects: await getProjects(), message: "Branch discarded." });
      }
      case "merge_to_main": {
        const branch = await mergeBranchToMain(branchId, managerId);
        return NextResponse.json({ success: true, branch, projects: await getProjects(), message: `Project updated to v${branch.version}` });
      }
      case "start_implementation": {
        const tasks = await startBranchImplementation(branchId, managerId);
        const branch = await getBranch(branchId);
        return NextResponse.json({ success: true, branch, tasks, message: `Implementation started — ${tasks.length} sub-tasks` });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Action failed" }, { status: 400 });
  }
}
