# LLM API Usage

Andex AI ships with a **multi-provider LLM client** that speaks the OpenAI
Chat Completions protocol. You configure one or more free API keys, and the
client automatically uses the first available provider — falling back to the
next one if a request fails.

- Client: [`src/lib/llm/index.ts`](../src/lib/llm/index.ts)
- HTTP route: [`src/app/api/llm/route.ts`](../src/app/api/llm/route.ts)
- Smoke test: [`scripts/test-llm.mjs`](../scripts/test-llm.mjs)

---

## 1. Configure keys

Copy the template and fill in at least one key:

```bash
cp .env.example .env.local
```

| Provider   | Env var             | Get a free key                                            |
| ---------- | ------------------- | -------------------------------------------------------- |
| Groq       | `GROQ_API_KEY`      | <https://console.groq.com/keys>                          |
| Cerebras   | `CEREBRAS_API_KEY`  | <https://cloud.cerebras.ai>                              |
| Mistral    | `MISTRAL_API_KEY`   | <https://console.mistral.ai/api-keys>                    |
| SambaNova  | `SAMBANOVA_API_KEY` | <https://cloud.sambanova.ai>                             |
| Cohere     | `COHERE_API_KEY`    | <https://dashboard.cohere.com/api-keys>                  |
| OpenRouter | `OPENROUTER_API_KEY`| <https://openrouter.ai/keys>                             |
| NVIDIA NIM | `NVIDIA_API_KEY`    | <https://build.nvidia.com>                               |

`.env.local` is gitignored — real keys never get committed.

Verify everything works:

```bash
npm run test:llm
```

---

## 2. Use it from server code

The client is **server-only** (it reads `process.env` and your secret keys).
Import it in API routes, server components, or server actions — never in a
`"use client"` component.

```ts
import { chat } from "@/lib/llm";

// Simplest form — string in, text out. Uses the first configured provider.
const { text, provider, model } = await chat("Summarize microservices in one line.");

// With a system prompt and options:
const result = await chat("What are the risks of this migration?", {
  system: "You are a senior staff engineer. Be concise.",
  temperature: 0.3,
  maxTokens: 400,
});

// Full message history:
await chat([
  { role: "user", content: "Hi" },
  { role: "assistant", content: "Hello!" },
  { role: "user", content: "Explain event sourcing." },
]);

// Force a specific provider (still falls back if it fails):
await chat("Ping", { provider: "groq" });
```

### Options

| Option        | Type                  | Default        | Notes                              |
| ------------- | --------------------- | -------------- | ---------------------------------- |
| `provider`    | `string`              | first configured | Provider id: `groq`, `cerebras`, `mistral`, `sambanova`, `cohere`, `openrouter`, `nvidia` |
| `model`       | `string`              | provider default | Override the model                 |
| `system`      | `string`              | —              | Prepended system prompt            |
| `temperature` | `number`              | `0.7`          | 0–2                                |
| `maxTokens`   | `number`              | `1024`         | Max output tokens                  |
| `signal`      | `AbortSignal`         | —              | Timeout / cancellation             |

### Errors

`chat()` throws `LlmError` if no provider is configured, or if every
configured provider fails (inspect `.attempts` for the per-provider reason).

---

## 3. Use it over HTTP

### `GET /api/llm` — provider status

Returns which providers are configured. **Never returns keys.**

```bash
curl http://localhost:3000/api/llm
```

```json
{
  "providers": [
    { "id": "groq", "name": "Groq", "model": "llama-3.3-70b-versatile", "configured": true },
    { "id": "mistral", "name": "Mistral AI", "model": "mistral-small-latest", "configured": true }
  ],
  "configured": ["groq", "mistral"],
  "ready": true
}
```

### `POST /api/llm` — run a completion

```bash
curl -X POST http://localhost:3000/api/llm \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is mental model drift?", "maxTokens": 200}'
```

Body fields: `prompt` (string) **or** `messages` (array), plus optional
`provider`, `model`, `system`, `temperature`, `maxTokens`.

```json
{ "text": "Mental model drift is …", "provider": "groq", "model": "llama-3.3-70b-versatile" }
```

The dashboard's **"Ask the Project Brain"** widget
([`src/components/ask-brain.tsx`](../src/components/ask-brain.tsx)) is a live
example of this endpoint.

---

## 4. Adding a provider

Any OpenAI-compatible endpoint works. Add an entry to the `PROVIDERS` array in
[`src/lib/llm/index.ts`](../src/lib/llm/index.ts) with its `envKey`, `baseUrl`,
and `defaultModel`, then add the key to `.env.example` and `.env.local`.

---

## Security notes

- Keys live only in `.env` / `.env.local` (gitignored). Do not hardcode them.
- The client is server-side; keys are never sent to the browser.
- Rotate any key that has been shared or exposed.
