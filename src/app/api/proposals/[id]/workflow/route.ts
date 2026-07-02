import { NextRequest, NextResponse } from "next/server";
import {
  getProposalWorkflow,
  runProposalPreApprovalCouncils,
} from "@/lib/proposals/proposal-workflow";
import { dbGetProposal } from "@/lib/db/repository";
import { isDbConfigured } from "@/lib/db/mongodb";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { id } = await params;
  try {
    const workflow = await getProposalWorkflow(id);
    if (!workflow) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    return NextResponse.json({ workflow });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load workflow" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body.action ?? "run_councils";

  try {
    if (action === "run_councils") {
      const proposal = await dbGetProposal(id);
      if (!proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
      if (!proposal.impact) {
        return NextResponse.json({ error: "Impact analysis required before councils" }, { status: 400 });
      }
      await runProposalPreApprovalCouncils(id);
      const workflow = await getProposalWorkflow(id);
      return NextResponse.json({ workflow }, { status: 201 });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Workflow action failed" },
      { status: 400 }
    );
  }
}
