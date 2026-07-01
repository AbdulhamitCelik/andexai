# Andex AI

> **GitHub version controls code. Andex version controls engineering decisions.**

Andex AI solves **Mental Model Drift** — the phenomenon where engineering teams lose shared understanding as projects evolve rapidly with different AI tools, prompts, and schedules.

## Core Problem

The bottleneck is no longer writing code. It's maintaining a **shared understanding** of the project.

## What We Build

- **NOT** an AI coding assistant, GitHub clone, or documentation generator
- **IS** GitHub for Engineering Decisions — version-controlled institutional knowledge with human-in-the-loop governance

## Architecture: 8 Specialist Agents

| Agent | Role |
|-------|------|
| Project Brain | Architecture, vision, institutional memory |
| Proposal | Accept proposals, retrieve context, detect duplicates |
| Impact | Dependency, architecture, API, task, cost analysis |
| Review | Pros, cons, risks, trade-offs, questions |
| Consensus | Collect votes — never auto-approves |
| Branch | Decision branches, merge, rollback, history |
| Implementation | Generate/update affected tasks only |
| Communication | Slack, Discord, GitHub, email notifications |
| Drift Detection | Compare brain vs implementation vs docs |

## Workflow

```
Proposal → Context → Impact → Review → Consensus → Manager Approval
  → Decision Branch → Implementation Tasks → Project Brain Updated → History Archived
```

## Tech Stack

- **Frontend:** Next.js 15, React, TailwindCSS, shadcn/ui
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL + Prisma (optional — in-memory store for demo)
- **Deployment:** Vercel

## Quick Start

```bash
npm install
cp .env.example .env.local   # optional — add a free LLM key to enable AI features
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## LLM Providers

Andex AI includes a multi-provider LLM client with automatic fallback. Add any
**one** free API key to `.env.local` and the AI features light up (the sidebar
shows a live "providers online" status, and the dashboard's *Ask the Project
Brain* widget starts answering).

| Provider   | Env var             | Free key                              |
| ---------- | ------------------- | ------------------------------------- |
| Groq       | `GROQ_API_KEY`      | <https://console.groq.com/keys>       |
| Cerebras   | `CEREBRAS_API_KEY`  | <https://cloud.cerebras.ai>          |
| OpenRouter | `OPENROUTER_API_KEY`| <https://openrouter.ai/keys>          |
| NVIDIA NIM | `NVIDIA_API_KEY`    | <https://build.nvidia.com>            |
| Mistral    | `MISTRAL_API_KEY`   | <https://console.mistral.ai/api-keys> |

Verify your keys:

```bash
npm run test:llm
```

Full usage guide (client API, HTTP routes, adding providers): **[docs/LLM.md](docs/LLM.md)**.

## API Reference

All endpoints live under `/api` (Next.js route handlers). State is held in an
in-memory store that **auto-seeds a demo project** on first read, so every
endpoint works with zero setup.

| Endpoint | Method | What it does |
| --- | --- | --- |
| `/api/project` | `GET` | Full dashboard snapshot: project brain, proposals, branches, tasks, agent logs, drift alerts, and stats. Seeds the demo on first call. |
| `/api/project` | `POST` | Re-seed the demo project and run a drift scan. |
| `/api/proposals` | `GET` | List all proposals (newest first). |
| `/api/proposals` | `POST` | Create a proposal and run the pipeline: **context → impact → review**. Body: `{ title, description }`. |
| `/api/proposals` | `PATCH` | Act on a proposal. Body: `{ proposalId, action, ... }` where `action` is `vote` \| `check_consensus` \| `approve` \| `update_tasks`. `approve` runs the approval pipeline (branch + tasks + merge). |
| `/api/proposals/[id]` | `GET` | Fetch a single proposal by id. |
| `/api/branches` | `GET` | List decision branches (version history). |
| `/api/branches` | `POST` | Roll the project brain back to a branch snapshot. Body: `{ branchId }`. |
| `/api/tasks` | `GET` | List implementation tasks. |
| `/api/agents` | `GET` | Full agent activity log (auditable trail of every agent action). |
| `/api/drift` | `GET` | Current mental-model drift alerts. |
| `/api/drift` | `POST` | Run a drift scan and return new alerts. |
| `/api/llm` | `GET` | LLM provider status (which keys are configured — never returns keys). |
| `/api/llm` | `POST` | Run an LLM completion. Body: `{ prompt }` or `{ messages }` + options. See [docs/LLM.md](docs/LLM.md). |

## Testing the APIs

### From the frontend (UI)

Run `npm run dev`, open <http://localhost:3000>, and each page exercises the
matching endpoint:

| Page | Calls |
| --- | --- |
| **Dashboard** (`/`) | `GET /api/project`, `GET /api/llm`, `POST /api/llm` (Ask the Project Brain) |
| **Proposals** (`/proposals`) | `GET`/`POST`/`PATCH /api/proposals` — submit one to watch the agent pipeline run |
| **Decision Branches** (`/branches`) | `GET /api/branches`, `POST` to roll back |
| **Implementation** (`/tasks`) | `GET /api/tasks` |
| **Agent Activity** (`/agents`) | `GET /api/agents` |
| **Drift Detection** (`/drift`) | `GET`/`POST /api/drift` |

### From the terminal (curl)

With the dev server running:

```bash
# Dashboard snapshot (auto-seeds the demo)
curl http://localhost:3000/api/project

# Submit a proposal — runs context → impact → review
curl -X POST http://localhost:3000/api/proposals \
  -H "Content-Type: application/json" \
  -d '{"title":"Migrate Auth to OAuth 2.0","description":"Replace session auth with OAuth 2.0 across services"}'

# Vote on it (use an id from the response above)
curl -X PATCH http://localhost:3000/api/proposals \
  -H "Content-Type: application/json" \
  -d '{"proposalId":"<ID>","action":"vote","vote":"approve"}'

# Approve — creates a decision branch, generates tasks, merges
curl -X PATCH http://localhost:3000/api/proposals \
  -H "Content-Type: application/json" \
  -d '{"proposalId":"<ID>","action":"approve"}'

# Run a drift scan
curl -X POST http://localhost:3000/api/drift

# LLM: provider status, then a completion
curl http://localhost:3000/api/llm
curl -X POST http://localhost:3000/api/llm \
  -H "Content-Type: application/json" \
  -d '{"prompt":"What is mental model drift?","maxTokens":120}'
```

### LLM keys

Verify your provider keys independently of the app:

```bash
npm run test:llm
```

## Test Data & Testing

The project ships with a **test organisation** — *Metropolitan University —
Digital Campus* — and an automated suite that exercises the full pipeline
including exceptions and edge cases (rejections, tied votes, duplicates, drift,
unicode/injection inputs, error paths). Full guide: **[docs/TESTING.md](docs/TESTING.md)**.

```bash
npm run test:scenarios   # 21 pipeline + edge-case assertions (no server needed)
```

Load the university dataset into the running app to click through it:

```bash
curl -X POST http://localhost:3000/api/project \
  -H "Content-Type: application/json" \
  -d '{"scenario":"university"}'
# reset to the original demo:  -d '{"scenario":"ecommerce"}'
```

**Edge cases covered** (see the docs for the full matrix):

| Area | Examples |
| --- | --- |
| Consensus | tied 2–2 vote never auto-approves; a single `needs_discussion` blocks approval; rejections win |
| Versioning | version bumps only on merge; no branch on rejection |
| Drift | phantom component in a task; >3 open proposals trip the backlog alert |
| Duplicates | near-duplicate proposal flagged against the original |
| Bad input | empty/whitespace, 20k-char, unicode/emoji, `<script>` / SQL-injection strings — no crash |
| Error paths | vote on missing proposal, consensus with no votes, approve a rejected proposal, rollback a missing branch — all throw |
| Rollback | merge twice, roll back, verify version + architecture restored from snapshot |

**How testing is carried out** — three layers, each one command:
`npm run test:scenarios` (orchestrator logic + edge cases),
`npm run test:llm` (provider keys), and curl-based API integration against
`npm run dev` (see [Testing the APIs](#testing-the-apis) above).

## Deploy to Vercel

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set environment variables (all optional for demo mode):

```env
DATABASE_URL=postgresql://...   # Optional — uses in-memory store without it
GROQ_API_KEY=gsk_...            # Any one LLM key enables AI features (see table above)
```

4. Deploy — `vercel.json` is preconfigured

## Demo Flow (Hackathon)

1. **Dashboard** — See project brain, stats, agent activity
2. **Submit Proposal** — e.g. "Migrate Auth Service to OAuth 2.0"
3. **AI Pipeline** — Context gathered, impact analyzed, pros/cons generated
4. **Team Votes** — Approve / reject / needs discussion
5. **Manager Approves** — Decision branch created, tasks generated
6. **Second Proposal** — Only affected tasks updated (Git-like behavior)
7. **Rollback** — Restore project brain to any decision branch
8. **Drift Detection** — Scan for mental model divergence

## Sponsor Alignment

| Sponsor | Natural Fit |
|---------|-------------|
| **Conduct** (primary) | Enterprise change workflow, institutional knowledge, human-in-the-loop |
| **CoralOS** | 8-agent specialist orchestration with governance |
| **Fetch.ai** | Multi-agent collaboration pipeline |
| **BasedAI** | Permission-aware organizational memory, auditable agents |

## Hackathon

UK AI Agent Hackathon EP5 — Imperial College London

Team: 7 Computer Science students | Duration: 7 days
