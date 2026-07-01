import { NextRequest, NextResponse } from "next/server";
import { getGovernanceDashboard, syncGovernedMemoryRegistry } from "@/lib/governance/memory-retrieval";
import { getProjects } from "@/lib/agents/orchestrator";
import { getGovernanceDemoUsers } from "@/lib/auth/team";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const projectId = req.nextUrl.searchParams.get("projectId") ?? undefined;

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const dashboard = await getGovernanceDashboard(userId, projectId);
    const projects = await getProjects();
    return NextResponse.json({
      ...dashboard,
      projects,
      demoUsers: getGovernanceDemoUsers(),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const records = await syncGovernedMemoryRegistry();
    return NextResponse.json({
      synced: records.length,
      message: "Governed memory registry synced from all project objects",
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Sync failed" }, { status: 500 });
  }
}
