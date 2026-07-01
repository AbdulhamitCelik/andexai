// Multi-provider LLM client.
//
// Every provider here speaks the OpenAI Chat Completions protocol, so a single
// fetch path works for all of them — only the base URL, API key, and default
// model differ. Keys are read from the environment (see .env.example); a
// provider with no key set is simply skipped.
//
// Usage (server-side only — never import this into a client component):
//
//   import { chat } from "@/lib/llm";
//   const { text, provider } = await chat("Summarize this decision in one line.");
//
// See docs/LLM.md for the full guide.

export interface LlmProvider {
  /** Stable identifier used in requests and logs. */
  id: string;
  /** Human-readable name for the UI. */
  name: string;
  /** Env var holding the API key. */
  envKey: string;
  /** Optional env var overriding the base URL. */
  baseUrlEnv: string;
  /** Default OpenAI-compatible base URL. */
  baseUrl: string;
  /** Model used when the caller doesn't specify one. */
  defaultModel: string;
}

// Ordered by preference — chat() falls back down this list until one succeeds.
export const PROVIDERS: LlmProvider[] = [
  {
    id: "groq",
    name: "Groq",
    envKey: "GROQ_API_KEY",
    baseUrlEnv: "GROQ_BASE_URL",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
  },
  {
    id: "cerebras",
    name: "Cerebras",
    envKey: "CEREBRAS_API_KEY",
    baseUrlEnv: "CEREBRAS_BASE_URL",
    baseUrl: "https://api.cerebras.ai/v1",
    defaultModel: "gpt-oss-120b",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    envKey: "OPENROUTER_API_KEY",
    baseUrlEnv: "OPENROUTER_BASE_URL",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o",
  },
  {
    id: "nvidia",
    name: "NVIDIA NIM",
    envKey: "NVIDIA_API_KEY",
    baseUrlEnv: "NVIDIA_BASE_URL",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    defaultModel: "meta/llama-3.1-8b-instruct",
  },
  {
    id: "mistral",
    name: "Mistral AI",
    envKey: "MISTRAL_API_KEY",
    baseUrlEnv: "MISTRAL_BASE_URL",
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-small-latest",
  },
  {
    id: "sambanova",
    name: "SambaNova Cloud",
    envKey: "SAMBANOVA_API_KEY",
    baseUrlEnv: "SAMBANOVA_BASE_URL",
    baseUrl: "https://api.sambanova.ai/v1",
    defaultModel: "Meta-Llama-3.3-70B-Instruct",
  },
  {
    id: "cohere",
    name: "Cohere",
    envKey: "COHERE_API_KEY",
    baseUrlEnv: "COHERE_BASE_URL",
    baseUrl: "https://api.cohere.ai/compatibility/v1",
    defaultModel: "command-r-08-2024",
  },
];

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  /** Force a specific provider by id; otherwise the first configured one wins. */
  provider?: string;
  /** Override the provider's default model. */
  model?: string;
  /** Sampling temperature (0–2). Defaults to 0.7. */
  temperature?: number;
  /** Max tokens to generate. Defaults to 1024. */
  maxTokens?: number;
  /** Convenience system prompt, prepended to messages. */
  system?: string;
  /** Abort/timeout signal. */
  signal?: AbortSignal;
}

export interface ChatResult {
  text: string;
  provider: string;
  model: string;
}

export class LlmError extends Error {
  constructor(message: string, readonly attempts: { provider: string; error: string }[] = []) {
    super(message);
    this.name = "LlmError";
  }
}

function keyFor(p: LlmProvider): string | undefined {
  const v = process.env[p.envKey];
  return v && v.trim() ? v.trim() : undefined;
}

function baseUrlFor(p: LlmProvider): string {
  return process.env[p.baseUrlEnv]?.trim() || p.baseUrl;
}

/** Providers that have an API key configured, in preference order. */
export function configuredProviders(): LlmProvider[] {
  return PROVIDERS.filter((p) => keyFor(p));
}

/** Lightweight status for UI/health checks — never exposes keys. */
export function providerStatus(): { id: string; name: string; model: string; configured: boolean }[] {
  return PROVIDERS.map((p) => ({
    id: p.id,
    name: p.name,
    model: p.defaultModel,
    configured: Boolean(keyFor(p)),
  }));
}

async function callProvider(
  p: LlmProvider,
  messages: ChatMessage[],
  opts: ChatOptions
): Promise<ChatResult> {
  const key = keyFor(p);
  if (!key) throw new Error("no API key configured");

  const model = opts.model ?? p.defaultModel;
  const res = await fetch(`${baseUrlFor(p)}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1024,
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    const body = await res.text();
    let detail = body;
    try {
      detail = JSON.parse(body)?.error?.message ?? body;
    } catch {
      /* keep raw text */
    }
    throw new Error(`HTTP ${res.status}: ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content?.trim() ?? "";
  return { text, provider: p.id, model };
}

/**
 * Send a chat completion. Accepts either a plain string prompt or a full
 * message array. Tries the requested provider (or the first configured one)
 * and transparently falls back to the next provider on failure.
 */
export async function chat(
  input: string | ChatMessage[],
  opts: ChatOptions = {}
): Promise<ChatResult> {
  const messages: ChatMessage[] =
    typeof input === "string" ? [{ role: "user", content: input }] : [...input];
  if (opts.system) messages.unshift({ role: "system", content: opts.system });

  let candidates = configuredProviders();
  if (opts.provider) {
    const forced = candidates.filter((p) => p.id === opts.provider);
    // If a specific provider is requested, try it first but still allow fallback.
    candidates = [...forced, ...candidates.filter((p) => p.id !== opts.provider)];
  }

  if (candidates.length === 0) {
    throw new LlmError(
      "No LLM provider configured. Set at least one API key (e.g. GROQ_API_KEY) in .env.local — see docs/LLM.md."
    );
  }

  const attempts: { provider: string; error: string }[] = [];
  for (const p of candidates) {
    try {
      return await callProvider(p, messages, opts);
    } catch (err) {
      attempts.push({ provider: p.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  throw new LlmError(
    `All ${candidates.length} configured provider(s) failed.`,
    attempts
  );
}
