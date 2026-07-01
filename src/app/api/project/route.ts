import { NextRequest, NextResponse } from "next/server";
import {
  getProjects,
  createProject,
  updateProject,
  getProposals,
  getBranches,
  getTasks,
  getAgentLogs,
  getDriftAlerts,
  seedProject,
  seedUniversity,
  detectDrift,
} from "@/lib/agents/orchestrator";
import { canManage, getTeamMember } from "@/lib/auth/team";
import { isDbConfigured } from "@/lib/db/mongodb";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { error: "MONGODB_URI is not configured. Add it to .env.local and run POST /api/db/init" },
      { status: 503 }
    );
  }

  try {
    const projects = await getProjects();
    const proposals = await getProposals();
    const branches = await getBranches();
    const tasks = await getTasks();

    return NextResponse.json({
      projects,
      project: projects[0] ?? null,
      mainIdea: projects[0] ?? null,
      proposals,
      branches,
      tasks,
      agentLogs: (await getAgentLogs()).slice(0, 20),
      driftAlerts: await getDriftAlerts(),
      stats: {
        projects: projects.length,
        openProposals: proposals.filter((p) => !["accepted", "rejected", "archived"].includes(p.status)).length,
        openBranches: branches.filter((b) => b.status === "open").length,
        implementing: branches.filter((b) => b.status === "implementing").length,
        pendingTasks: tasks.filter((t) => t.status === "pending").length,
        driftAlerts: (await getDriftAlerts()).length,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Database error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* empty body — default to ecommerce seed (remote behaviour) */
  }

  // Manager project creation (local MongoDB flow)
  if (body.managerId && body.name && body.vision) {
    const { managerId, name, vision, goals, functionalRequirements, nonFunctionalRequirements } = body as {
      managerId: string;
      name: string;
      vision: string;
      goals?: string[];
      functionalRequirements?: string[];
      nonFunctionalRequirements?: string[];
    };

    const manager = getTeamMember(managerId);
    if (!manager || !canManage(manager.role)) {
      return NextResponse.json({ error: "Only managers can create projects" }, { status: 403 });
    }

    try {
      const project = await createProject(
        managerId,
        name,
        vision,
        goals,
        functionalRequirements ?? [],
        nonFunctionalRequirements ?? []
      );
      await detectDrift();
      return NextResponse.json({ project }, { status: 201 });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
    }
  }

  // Demo seed scenarios (remote flow): { scenario?: "ecommerce" | "university" }
  const scenario = String(body.scenario ?? "ecommerce");
  try {
    if (scenario === "university") {
      const project = await seedUniversity();
      return NextResponse.json({
        success: true,
        scenario,
        project,
        message: "Metropolitan University test data seeded",
      });
    }

    const project = await seedProject();
    await detectDrift();
    return NextResponse.json({
      success: true,
      scenario: "ecommerce",
      project,
      message: "E-Commerce demo seeded",
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Seed failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { managerId, projectId, name, vision, goals, functionalRequirements, nonFunctionalRequirements } = body;

  const manager = getTeamMember(managerId);
  if (!manager || !canManage(manager.role)) {
    return NextResponse.json({ error: "Only managers can edit projects" }, { status: 403 });
  }

  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  try {
    const project = await updateProject(managerId, projectId, {
      name,
      vision,
      goals,
      functionalRequirements,
      nonFunctionalRequirements,
    });
    return NextResponse.json({ project });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Update failed" }, { status: 400 });
  }
}
