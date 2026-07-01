import { NextRequest, NextResponse } from "next/server";
import {
  getProposals,
  runProposalPipeline,
  castVote,
  tallyVotes,
  managerAcceptProposal,
  managerDeclineProposal,
  getSuggestionTargets,
} from "@/lib/agents/orchestrator";

export async function GET() {
  return NextResponse.json({
    proposals: await getProposals(),
    targets: await getSuggestionTargets(),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, authorId = "wkr-1", authorName = "Alex", target } = body;

  if (!title || !description || !target) {
    return NextResponse.json({ error: "title, description, and target required" }, { status: 400 });
  }

  const [targetType, targetId] = target.split(":") as ["project" | "branch", string];
  if (!targetId) return NextResponse.json({ error: "Invalid target" }, { status: 400 });

  try {
    const result = await runProposalPipeline(
      title,
      description,
      authorId,
      authorName,
      targetType === "project" ? "main" : "branch",
      targetType === "project" ? targetId : undefined,
      targetType === "branch" ? targetId : undefined
    );
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { proposalId, action, userId, userName, vote, comment, note } = body;

  if (!proposalId || !action) {
    return NextResponse.json({ error: "proposalId and action required" }, { status: 400 });
  }

  try {
    switch (action) {
      case "vote": {
        const proposal = await castVote(proposalId, userId, userName, vote, comment);
        return NextResponse.json({ proposal });
      }
      case "tally": {
        const proposal = await tallyVotes(proposalId);
        return NextResponse.json({ proposal });
      }
      case "accept": {
        const result = await managerAcceptProposal(proposalId, userId, note);
        return NextResponse.json(result);
      }
      case "decline": {
        const proposal = await managerDeclineProposal(proposalId, userId, note);
        return NextResponse.json({ proposal });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Action failed" }, { status: 400 });
  }
}
