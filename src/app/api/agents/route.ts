import { NextResponse } from "next/server";
import { getAgentLogs } from "@/lib/agents/orchestrator";
import { AGENT_SKILLS } from "@/lib/agents/skills";
import { isDbConfigured } from "@/lib/db/mongodb";

export async function GET() {
  try {
    return NextResponse.json({
      logs: await getAgentLogs(),
      skills: AGENT_SKILLS,
      db: { configured: isDbConfigured(), provider: "mongodb" },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Failed to load agent data",
        skills: AGENT_SKILLS,
        db: { configured: isDbConfigured(), provider: "mongodb" },
      },
      { status: isDbConfigured() ? 500 : 503 }
    );
  }
}
