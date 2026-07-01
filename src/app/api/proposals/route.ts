import { NextRequest, NextResponse } from "next/server";
import {
  getProposals,
  getProposal,
  runProposalPipeline,
  runApprovalPipeline,
  castVote,
  checkConsensus,
  updateAffectedTasks,
} from "@/lib/agents/orchestrator";

export async function GET() {
  return NextResponse.json({ proposals: getProposals() });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, authorId = "user-1", authorName = "Demo User" } = body;

  if (!title || !description) {
    return NextResponse.json({ error: "title and description required" }, { status: 400 });
  }

  const result = runProposalPipeline(title, description, authorId, authorName);
  return NextResponse.json(result, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { proposalId, action, userId, userName, vote, comment } = body;

  if (!proposalId || !action) {
    return NextResponse.json({ error: "proposalId and action required" }, { status: 400 });
  }

  switch (action) {
    case "vote": {
      const proposal = castVote(proposalId, userId ?? "user-1", userName ?? "Demo User", vote, comment);
      return NextResponse.json({ proposal });
    }
    case "check_consensus": {
      const proposal = checkConsensus(proposalId);
      return NextResponse.json({ proposal });
    }
    case "approve": {
      const proposal = getProposal(proposalId);
      if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });
      proposal.status = "approved";
      proposal.managerApproved = true;
      const result = runApprovalPipeline(proposalId);
      return NextResponse.json(result);
    }
    case "update_tasks": {
      const proposal = getProposal(proposalId);
      if (!proposal) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const tasks = updateAffectedTasks(proposal);
      return NextResponse.json({ tasks });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
