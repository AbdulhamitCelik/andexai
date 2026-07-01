import { NextResponse } from "next/server";
import { getBranches, rollbackToBranch } from "@/lib/agents/orchestrator";

export async function GET() {
  return NextResponse.json({ branches: getBranches() });
}

export async function POST(req: Request) {
  const { branchId } = await req.json();
  if (!branchId) return NextResponse.json({ error: "branchId required" }, { status: 400 });
  const brain = rollbackToBranch(branchId);
  return NextResponse.json({ success: true, project: brain });
}
