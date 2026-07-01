import { NextRequest, NextResponse } from "next/server";
import { parseProjectBrief } from "@/lib/parse-project-brief";
import { canManage, getTeamMember } from "@/lib/auth/team";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const managerId = formData.get("managerId") as string | null;

  const manager = managerId ? getTeamMember(managerId) : undefined;
  if (!manager || !canManage(manager.role)) {
    return NextResponse.json({ error: "Only managers can upload project briefs" }, { status: 403 });
  }

  if (!file) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const allowed = [".txt", ".md", ".json", ".csv"];
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!allowed.includes(ext)) {
    return NextResponse.json({ error: "Supported: .txt, .md, .json, .csv" }, { status: 400 });
  }

  const text = await file.text();
  const parsed = parseProjectBrief(text);

  return NextResponse.json({
    parsed,
    fileName: file.name,
    message: "Fields auto-filled from uploaded brief. Review and edit before creating.",
  });
}
