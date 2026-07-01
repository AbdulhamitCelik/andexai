import { NextRequest, NextResponse } from "next/server";
import { getProject, getBranchesForProject, getProposals } from "@/lib/agents/orchestrator";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  return NextResponse.json({
    project,
    branches: await getBranchesForProject(id),
    proposals: await getProposals(id),
  });
}
