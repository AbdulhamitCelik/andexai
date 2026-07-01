import { NextResponse } from "next/server";
import { getTasks } from "@/lib/agents/orchestrator";

export async function GET() {
  return NextResponse.json({ tasks: getTasks() });
}
