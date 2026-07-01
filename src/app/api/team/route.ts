import { NextResponse } from "next/server";
import { getTeamMembers } from "@/lib/auth/team";

export async function GET() {
  return NextResponse.json({ members: getTeamMembers() });
}
