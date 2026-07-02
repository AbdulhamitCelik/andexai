import { NextRequest, NextResponse } from "next/server";
import {
  refreshProjectPriorities,
  getProjectBrainRankings,
  getDecisionIntelligence,
  getPriorityForEntity,
} from "@/lib/engines/priority-service";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  const entityId = req.nextUrl.searchParams.get("entityId");
  const view = req.nextUrl.searchParams.get("view") ?? "scores";

  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  try {
    if (entityId) {
      const score = await getPriorityForEntity(entityId, projectId);
      return NextResponse.json({ score });
    }

    if (view === "brain") {
      const rankings = await getProjectBrainRankings(projectId);
      return NextResponse.json({ rankings });
    }

    if (view === "decisions") {
      const intelligence = await getDecisionIntelligence(projectId);
      return NextResponse.json({ intelligence });
    }

    const scores = await refreshProjectPriorities(projectId);
    const rankings = await getProjectBrainRankings(projectId);
    const intelligence = await getDecisionIntelligence(projectId);
    return NextResponse.json({ scores, rankings, intelligence });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectId } = body as { projectId: string };
  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  try {
    const scores = await refreshProjectPriorities(projectId);
    const rankings = await getProjectBrainRankings(projectId);
    const intelligence = await getDecisionIntelligence(projectId);
    return NextResponse.json({ scores, rankings, intelligence }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Refresh failed" }, { status: 400 });
  }
}
