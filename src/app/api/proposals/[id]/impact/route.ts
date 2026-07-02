import { NextRequest, NextResponse } from "next/server";
import { getProposal, rerunImpactAnalysis } from "@/lib/agents/orchestrator";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { userId?: string; proposalText?: string; projectId?: string } = {};

  try {
    body = await req.json();
  } catch {
    /* optional body */
  }

  const proposal = await getProposal(id);
  if (!proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });

  if (body.projectId && body.projectId !== proposal.projectId) {
    return NextResponse.json({ error: "projectId mismatch" }, { status: 400 });
  }

  try {
    const impact = await rerunImpactAnalysis(id, body.userId);
    const updated = await getProposal(id);
    return NextResponse.json({ impact, proposal: updated }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Impact analysis failed";
    const status = message.includes("requires LLM") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
