import { NextResponse } from "next/server";
import { dbInitCollections } from "@/lib/db/repository";

/** Initialize MongoDB collections and indexes */
export async function POST() {
  try {
    const result = await dbInitCollections();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "DB init failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    collections: ["projects", "proposals", "branches", "tasks", "agent_logs", "drift_alerts", "feedback_items", "feature_packs", "governed_memories", "permission_audit_logs"],
    hint: "POST to this endpoint to create indexes",
  });
}
