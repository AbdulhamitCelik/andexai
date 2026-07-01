import { NextRequest, NextResponse } from "next/server";
import {
  runProductDiscovery,
  getFeaturePacks,
  getProjectFeedback,
  promoteFeaturePackToProposal,
  getProjects,
  getSuggestionTargets,
} from "@/lib/agents/orchestrator";
import type { FeedbackItem } from "@/lib/types";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId") ?? undefined;

  try {
    const projects = await getProjects();
    const feedback = projectId ? await getProjectFeedback(projectId) : [];
    const featurePacks = await getFeaturePacks(projectId);

    return NextResponse.json({
      projects,
      feedback,
      featurePacks,
      targets: await getSuggestionTargets(),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}

/** Run ProductDiscoveryAgent — cluster feedback into Feature Packs */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { projectId, feedback } = body as { projectId: string; feedback?: FeedbackItem[] };

  if (!projectId) {
    return NextResponse.json({ error: "projectId required" }, { status: 400 });
  }

  try {
    const result = await runProductDiscovery(projectId, feedback);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Discovery failed" }, { status: 400 });
  }
}

/** Promote a Feature Pack into the existing proposal workflow */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { featurePackId, action, authorId, authorName, target } = body;

  if (!featurePackId || action !== "promote") {
    return NextResponse.json({ error: "featurePackId and action=promote required" }, { status: 400 });
  }

  if (!target || !authorId || !authorName) {
    return NextResponse.json({ error: "target, authorId, and authorName required" }, { status: 400 });
  }

  try {
    const result = await promoteFeaturePackToProposal(featurePackId, authorId, authorName, target);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Promote failed" }, { status: 400 });
  }
}
