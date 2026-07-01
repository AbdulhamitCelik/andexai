// Quick smoke test for configured LLM providers.
// Run: npm run test:llm   (loads .env.local via node --env-file)
// Zero dependencies — both providers expose OpenAI-compatible /chat/completions.

const PROMPT = "Say hello in exactly one short sentence.";

const providers = [
  {
    name: "OpenRouter",
    key: process.env.OPENROUTER_API_KEY,
    baseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    model: "openai/gpt-4o",
    extraHeaders: {
      ...(process.env.OPENROUTER_SITE_URL && { "HTTP-Referer": process.env.OPENROUTER_SITE_URL }),
      ...(process.env.OPENROUTER_SITE_NAME && { "X-Title": process.env.OPENROUTER_SITE_NAME }),
    },
  },
  {
    name: "NVIDIA NIM",
    key: process.env.NVIDIA_API_KEY,
    baseUrl: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
    model: "meta/llama-3.1-8b-instruct",
    extraHeaders: {},
  },
  {
    name: "Groq",
    key: process.env.GROQ_API_KEY,
    baseUrl: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    extraHeaders: {},
  },
  {
    name: "Cerebras",
    key: process.env.CEREBRAS_API_KEY,
    baseUrl: process.env.CEREBRAS_BASE_URL || "https://api.cerebras.ai/v1",
    model: "gpt-oss-120b",
    extraHeaders: {},
  },
  {
    name: "Mistral AI",
    key: process.env.MISTRAL_API_KEY,
    baseUrl: process.env.MISTRAL_BASE_URL || "https://api.mistral.ai/v1",
    model: "mistral-small-latest",
    extraHeaders: {},
  },
];

async function test({ name, key, baseUrl, model, extraHeaders }) {
  if (!key) {
    console.log(`⏭️  ${name}: no API key set, skipping`);
    return null;
  }

  const start = Date.now();
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: PROMPT }],
        max_tokens: 50,
      }),
    });

    const ms = Date.now() - start;
    const body = await res.json();

    if (!res.ok) {
      const msg = body?.error?.message || JSON.stringify(body);
      console.log(`❌ ${name} (${model}): HTTP ${res.status} — ${msg}`);
      return false;
    }

    const reply = body?.choices?.[0]?.message?.content?.trim() ?? "(no content)";
    console.log(`✅ ${name} (${model}, ${ms}ms): ${reply}`);
    return true;
  } catch (err) {
    console.log(`❌ ${name} (${model}): ${err.message}`);
    return false;
  }
}

const results = [];
for (const p of providers) {
  results.push(await test(p));
}

const failed = results.some((r) => r === false);
process.exit(failed ? 1 : 0);
