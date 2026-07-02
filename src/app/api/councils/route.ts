import { NextRequest, NextResponse } from "next/server";
import { getLifecycleDashboard, executeCouncil } from "@/lib/councils/council-service";
import type { CouncilId } from "@/lib/types";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  try {
    const dashboard = await getLifecycleDashboard(projectId);
    return NextResponse.json(dashboard);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { councilId, projectId, branchId } = body as {
    councilId: CouncilId;
    projectId: string;
    branchId?: string;
  };

  if (!councilId || !projectId) {
    return NextResponse.json({ error: "councilId and projectId required" }, { status: 400 });
  }

  try {
    const result = await executeCouncil(councilId, projectId, branchId);
    const run = "run" in result ? result.run : result;
    const dashboard = await getLifecycleDashboard(projectId);
    return NextResponse.json({ run, dashboard }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Council run failed" }, { status: 400 });
  }
}
