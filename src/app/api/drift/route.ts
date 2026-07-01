import { NextResponse } from "next/server";
import { detectDrift, getDriftAlerts } from "@/lib/agents/orchestrator";

export async function GET() {
  return NextResponse.json({ alerts: getDriftAlerts() });
}

export async function POST() {
  const alerts = detectDrift();
  return NextResponse.json({ alerts });
}
