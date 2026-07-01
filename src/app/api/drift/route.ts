import { NextResponse } from "next/server";
import { detectDrift, getDriftAlerts } from "@/lib/agents/orchestrator";

export async function GET() {
  return NextResponse.json({ alerts: await getDriftAlerts() });
}

export async function POST() {
  const alerts = await detectDrift();
  return NextResponse.json({ alerts });
}
