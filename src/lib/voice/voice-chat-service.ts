import { v4 as uuid } from "uuid";
import { chat } from "@/lib/llm";
import { askWithGovernedMemory } from "@/lib/governance/memory-retrieval";
import { dbSaveAgentLog } from "@/lib/db/repository";

const ANDEX_VOICE_SYSTEM = [
  "You are the Andex AI voice assistant (Team Andex).",
  "Help users with discovery, feature packs, suggestions, impact analysis, councils, enterprise reports, voting, manager approval, tasks, branches, and project memory.",
  "Keep every reply short and natural for spoken conversation — usually 2-4 sentences.",
  "No markdown, bullet lists, or special formatting.",
  "Humans always make final decisions; AI only advises.",
].join(" ");

export interface VoiceChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface VoiceChatResult {
  reply: string;
  source: "llm" | "governed" | "fallback";
  provider?: string;
  model?: string;
  llmFallback?: boolean;
  accessDenied?: boolean;
  fallbacks: string[];
}

function fallbackReply(userMessage: string): string {
  const q = userMessage.toLowerCase();
  if (q.includes("vote") || q.includes("consensus")) {
    return "Workers vote after impact analysis and councils finish. The manager can only approve when the team reaches consensus.";
  }
  if (q.includes("council") || q.includes("enterprise")) {
    return "Planning, Testing, and Evaluation councils run on each suggestion and feed the Enterprise Report with risks, timeline, and resources.";
  }
  if (q.includes("discovery") || q.includes("feature pack")) {
    return "Discovery groups customer feedback into Feature Packs with priority scores. Promote a pack to start a formal suggestion.";
  }
  if (q.includes("manager") || q.includes("approve")) {
    return "Managers make the final call. Accept stays locked until impact analysis, councils, and team consensus are all complete.";
  }
  if (q.includes("help") || q.includes("how") || q.includes("start")) {
    return "I can walk you through suggestions, voting, councils, feature packs, and your project brain. What would you like to do next?";
  }
  return "I'm having trouble reaching the AI right now. Try the Suggestions page for decisions, Feature Packs for discovery, or the Project Brain on the dashboard.";
}

function formatHistoryForPrompt(messages: VoiceChatMessage[], userMessage: string): string {
  if (messages.length === 0) return userMessage;
  const lines = messages
    .slice(-8)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`);
  lines.push(`User: ${userMessage}`);
  return `Recent conversation:\n${lines.join("\n")}\n\nRespond to the user's latest message. Keep the answer brief for speech.`;
}

export async function voiceChatTurn(input: {
  userId: string;
  projectId?: string;
  messages: VoiceChatMessage[];
  userMessage: string;
}): Promise<VoiceChatResult> {
  const fallbacks: string[] = [];
  const { userId, projectId, messages, userMessage } = input;
  const contextualPrompt = formatHistoryForPrompt(messages, userMessage);

  if (projectId) {
    const result = await askWithGovernedMemory(userId, projectId, contextualPrompt);
    if (result.accessDenied) {
      return {
        reply: result.message ?? "Access denied for this memory.",
        source: "governed",
        accessDenied: true,
        fallbacks,
      };
    }
    if (result.llmFallback) {
      fallbacks.push("LLM unavailable — answered from authorised memory only");
    }
    return {
      reply: result.answer,
      source: result.llmFallback ? "fallback" : "governed",
      provider: result.provider,
      model: result.model,
      llmFallback: result.llmFallback,
      fallbacks,
    };
  }

  try {
    const history = messages.slice(-10).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    const result = await chat([...history, { role: "user", content: userMessage }], {
      system: ANDEX_VOICE_SYSTEM,
      maxTokens: 350,
      temperature: 0.65,
    });
    return {
      reply: result.text,
      source: "llm",
      provider: result.provider,
      model: result.model,
      fallbacks,
    };
  } catch (e) {
    fallbacks.push(`LLM unavailable (${e instanceof Error ? e.message : "error"})`);
    return { reply: fallbackReply(userMessage), source: "fallback", fallbacks };
  }
}

export async function logVoiceTurn(userId: string, userMessage: string, result: VoiceChatResult) {
  await dbSaveAgentLog({
    id: uuid(),
    agent: "communication",
    action: "voice_chat",
    input: userMessage.slice(0, 200),
    output: `${result.source} | ${result.fallbacks.length} fallback(s)`,
    timestamp: new Date().toISOString(),
  });
}
