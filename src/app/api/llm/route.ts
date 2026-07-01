import { NextRequest, NextResponse } from "next/server";
import { chat, providerStatus, LlmError, type ChatMessage } from "@/lib/llm";

// GET /api/llm — provider health/status (no keys ever returned).
export async function GET() {
  const providers = providerStatus();
  return NextResponse.json({
    providers,
    configured: providers.filter((p) => p.configured).map((p) => p.id),
    ready: providers.some((p) => p.configured),
  });
}

// POST /api/llm — run a chat completion.
// Body: { prompt?: string, messages?: ChatMessage[], provider?, model?, system?, temperature?, maxTokens? }
export async function POST(req: NextRequest) {
  let body: {
    prompt?: string;
    messages?: ChatMessage[];
    provider?: string;
    model?: string;
    system?: string;
    temperature?: number;
    maxTokens?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const input = body.messages ?? body.prompt;
  if (!input || (Array.isArray(input) && input.length === 0)) {
    return NextResponse.json(
      { error: "Provide `prompt` (string) or `messages` (array)." },
      { status: 400 }
    );
  }

  try {
    const result = await chat(input, {
      provider: body.provider,
      model: body.model,
      system: body.system,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof LlmError) {
      const status = err.attempts.length ? 502 : 503;
      return NextResponse.json({ error: err.message, attempts: err.attempts }, { status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
