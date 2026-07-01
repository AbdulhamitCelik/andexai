import { NextRequest, NextResponse } from "next/server";
import { askWithGovernedMemory } from "@/lib/governance/memory-retrieval";

/**
 * Permission-governed memory query → LLM.
 * Permissions enforced BEFORE any context reaches the LLM.
 */
export async function POST(req: NextRequest) {
  let body: { userId?: string; projectId?: string; prompt?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { userId, projectId, prompt } = body;
  if (!userId || !projectId || !prompt?.trim()) {
    return NextResponse.json({ error: "userId, projectId, and prompt required" }, { status: 400 });
  }

  try {
    const result = await askWithGovernedMemory(userId, projectId, prompt.trim());

    if (result.accessDenied) {
      return NextResponse.json(result, { status: 403 });
    }

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Query failed" }, { status: 500 });
  }
}
