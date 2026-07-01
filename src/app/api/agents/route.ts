import { NextResponse } from "next/server";
import { getAgentLogs } from "@/lib/agents/orchestrator";

export async function GET() {
  return NextResponse.json({ logs: getAgentLogs() });
}
