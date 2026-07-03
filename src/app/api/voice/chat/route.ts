import { NextResponse } from "next/server";
import { logVoiceTurn, voiceChatTurn } from "@/lib/voice/voice-chat-service";

export async function GET() {
  return NextResponse.json({
    ok: true,
    mode: "realtime",
    voice: "browser",
    fallbacks: [
      "LLM → canned spoken responses",
      "Mic unavailable → type your message",
      "Speech synthesis unavailable → read transcript on screen",
    ],
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      userId?: string;
      projectId?: string;
      messages?: { role: "user" | "assistant"; content: string }[];
      userMessage?: string;
    };

    if (!body.userId?.trim()) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    if (!body.userMessage?.trim()) {
      return NextResponse.json({ error: "userMessage required" }, { status: 400 });
    }

    const result = await voiceChatTurn({
      userId: body.userId,
      projectId: body.projectId,
      messages: body.messages ?? [],
      userMessage: body.userMessage.trim(),
    });

    await logVoiceTurn(body.userId, body.userMessage, result);

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Voice chat failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
