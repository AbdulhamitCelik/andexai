# Andex AI

> **GitHub version controls code. Andex version controls engineering decisions.**

Andex AI solves **Mental Model Drift** — the phenomenon where engineering teams lose shared understanding as projects evolve rapidly with different AI tools, prompts, and schedules.

## Core Problem

The bottleneck is no longer writing code. It's maintaining a **shared understanding** of the project.

## What We Build

- **NOT** an AI coding assistant, GitHub clone, or documentation generator
- **IS** GitHub for Engineering Decisions — version-controlled institutional knowledge with human-in-the-loop governance

## Architecture: Specialist Agents

**Core decision workflow agents** — the main proposal flow:

| Agent | Role |
|-------|------|
| Project Brain | Architecture, vision, institutional memory |
| Proposal | Accept proposals, retrieve context, detect duplicates |
| Impact | Dependency, architecture, API, task, cost analysis |
| Review | Pros, cons, risks, trade-offs, questions |
| Consensus | Tally votes — a tie or any needs-discussion vote never auto-approves |
| Branch | Decision branches: create, merge to project, discard, history |
| Implementation | Generate/update affected tasks only |
| Communication | Slack, Discord, GitHub, email notifications |

**Additional product & governance agents:**

| Agent | Role |
|-------|------|
| Product Discovery | Cluster raw user feedback into Feature Packs, promote to proposals |
| Drift Detection | Pending suggestions on implementing branches, phantom task components, backlog build-up |
| Permission / Governance | Permission-filtered memory retrieval, access audit log (BasedAI model) |

The `/agents` page documents the full skill catalog (16 skill sets — see
[`src/lib/agents/skills.ts`](src/lib/agents/skills.ts)); the agent names that
appear in the activity log are defined in
[`src/lib/types/index.ts`](src/lib/types/index.ts).

## Workflow

```
Suggestion → Context → Impact → Review → Team Votes → Manager Accepts
  → Decision Branch → Implementation Tasks → Merge to Project (version bump) → History Preserved
```

## Tech Stack

- **Frontend:** Next.js 15, React, TailwindCSS, shadcn/ui
- **Backend:** Next.js API Routes
- **Database:** MongoDB Atlas via Mongoose (`MONGODB_URI` in `.env.local`)
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

| Provider   | Env var              | Free key                                  |
| ---------- | -------------------- | ----------------------------------------- |
| Groq       | `GROQ_API_KEY`       | <https://console.groq.com/keys>           |
| Cerebras   | `CEREBRAS_API_KEY`   | <https://cloud.cerebras.ai>               |
| OpenRouter | `OPENROUTER_API_KEY` | <https://openrouter.ai/keys>              |
| NVIDIA NIM | `NVIDIA_API_KEY`     | <https://build.nvidia.com>                |
| Mistral    | `MISTRAL_API_KEY`    | <https://console.mistral.ai/api-keys>     |
| SambaNova  | `SAMBANOVA_API_KEY`  | <https://cloud.sambanova.ai>              |
| Cohere     | `COHERE_API_KEY`     | <https://dashboard.cohere.com/api-keys>   |

Note the split between the two AI endpoints: `/api/llm` is **raw** provider
status/completion, while the dashboard's *Ask the Project Brain* widget goes
through `POST /api/memory/ask` — **permission-governed** memory retrieval where
memory is filtered by the user's role *before* any LLM context is sent.

Verify your keys:

```bash
npm run test:llm
```

Full usage guide (client API, HTTP routes, adding providers): **[docs/LLM.md](docs/LLM.md)**.

## API Reference

All endpoints live under `/api` (Next.js route handlers). State is persisted in
**MongoDB** — set `MONGODB_URI` in `.env.local`, then run `POST /api/db/init`
to create indexes.

| Endpoint | Method | What it does |
| --- | --- | --- |
| `/api/db/init` | `GET` \| `POST` | MongoDB collection/index setup and status hint. |
| `/api/project/parse` | `POST` | Parse uploaded project brief (manager only). FormData: `file`, `managerId`. |
| `/api/team` | `GET` | List demo team members (manager + workers). |
| `/api/project` | `GET` | Dashboard snapshot: projects, proposals, branches, tasks, logs, stats. |
| `/api/project` | `POST` | Create project (manager): `{ managerId, name, vision, goals?, functionalRequirements?, nonFunctionalRequirements? }` — or seed a demo: `{ "scenario": "ecommerce" \| "university" }` (empty body seeds e-commerce). |
| `/api/project` | `PATCH` | Update project (manager). Body: `{ managerId, projectId, ...fields }`. |
| `/api/project/[id]` | `GET` | Single project with related branches and proposals. |
| `/api/proposals` | `GET` | List all proposals (newest first) plus valid suggestion `targets`. |
| `/api/proposals` | `POST` | Create a proposal and run the pipeline: **context → impact → review**. Body: `{ title, description, target, authorId?, authorName? }` — `target` is `"project:<id>"` or `"branch:<id>"` (pick one from `GET /api/proposals` → `targets`). |
| `/api/proposals` | `PATCH` | Act on a proposal. Body: `{ proposalId, action, ... }` where `action` is `vote` (needs `userId`, `userName`, `vote`, optional `comment`) \| `tally` \| `accept` (manager `userId`; creates/updates the decision branch) \| `decline` (manager `userId`). |
| `/api/proposals/[id]` | `GET` | Fetch a single proposal by id. |
| `/api/branches` | `GET` | List decision branches (version history). |
| `/api/branches` | `POST` | Manager branch action. Body: `{ branchId, action, managerId }` where `action` is `discard` \| `merge_to_main` \| `start_implementation`. There is no rollback endpoint — discarding a branch leaves the project untouched. |
| `/api/tasks` | `GET` | List implementation tasks. |
| `/api/agents` | `GET` | Agent activity log plus full skill catalog (`skills` in JSON). |
| `/api/drift` | `GET` | Current mental-model drift alerts. |
| `/api/drift` | `POST` | Run a drift scan and return new alerts. |
| `/api/discovery` | `GET` | Projects, raw feedback, and Feature Packs (`?projectId=` to scope). |
| `/api/discovery` | `POST` | Run the ProductDiscoveryAgent: cluster feedback into Feature Packs. Body: `{ projectId, feedback? }`. |
| `/api/discovery` | `PATCH` | Promote a Feature Pack into the proposal workflow. Body: `{ featurePackId, action: "promote", authorId, authorName, target }`. |
| `/api/governance` | `GET` | Governance dashboard for a user: accessible vs restricted memories, decisions, audit log. Query: `?userId=<id>&projectId=<id>`. |
| `/api/governance` | `POST` | Sync the governed-memory registry from all project objects. |
| `/api/memory/ask` | `POST` | **Ask the Project Brain** — permission-governed memory retrieval, then LLM. Body: `{ userId, projectId, prompt }`. Memory is filtered by role *before* the LLM sees any context; returns `403` with an explanation when access is denied. |
| `/api/llm` | `GET` | Raw LLM provider status (which keys are configured — never returns keys). |
| `/api/llm` | `POST` | Raw LLM completion (no memory governance). Body: `{ prompt }` or `{ messages }` + options. See [docs/LLM.md](docs/LLM.md). |

## Testing the APIs

### From the frontend (UI)

Run `npm run dev`, open <http://localhost:3000>, and each page exercises the
matching endpoint:

| Page | Calls |
| --- | --- |
| **Dashboard** (`/`) | `GET /api/project`, `POST /api/memory/ask` (Ask the Project Brain — permission-governed) |
| **Memory Governance** (`/memory-governance`) | `GET`/`POST /api/governance` |
| **Feature Packs** (`/feature-packs`) | `GET`/`POST`/`PATCH /api/discovery` |
| **Suggestions** (`/proposals`) | `GET`/`POST`/`PATCH /api/proposals` — submit one to watch the agent pipeline run |
| **Branches** (`/branches`) | `GET /api/branches`, `POST` with `discard` \| `merge_to_main` \| `start_implementation` |
| **Implementation** (`/tasks`) | `GET /api/tasks` |
| **Agent Activity** (`/agents`) | `GET /api/agents` |
| **Drift Detection** (`/drift`) | `GET`/`POST /api/drift` |

(The sidebar also polls `GET /api/llm` for the provider status dot.)

### From the terminal (curl)

With the dev server running:

```bash
# Dashboard snapshot
curl http://localhost:3000/api/project

# Seed the e-commerce demo (or {"scenario":"university"} for the test org)
curl -X POST http://localhost:3000/api/project

# List proposals + valid suggestion targets (project:<id> / branch:<id>)
curl http://localhost:3000/api/proposals

# Submit a proposal — runs context → impact → review
# (target: pick a value from the "targets" array above)
curl -X POST http://localhost:3000/api/proposals \
  -H "Content-Type: application/json" \
  -d '{"title":"Migrate Auth to OAuth 2.0","description":"Replace session auth with OAuth 2.0 across services","authorId":"wkr-1","authorName":"Alex","target":"project:<PROJECT_ID>"}'

# Vote on it as a worker (use the proposal id from the response above)
curl -X PATCH http://localhost:3000/api/proposals \
  -H "Content-Type: application/json" \
  -d '{"proposalId":"<ID>","action":"vote","userId":"wkr-1","userName":"Alex","vote":"approve"}'

# Tally the votes (tie → consensus_pending; any needs_discussion blocks)
curl -X PATCH http://localhost:3000/api/proposals \
  -H "Content-Type: application/json" \
  -d '{"proposalId":"<ID>","action":"tally"}'

# Manager accepts — creates a decision branch (or "decline" to reject)
curl -X PATCH http://localhost:3000/api/proposals \
  -H "Content-Type: application/json" \
  -d '{"proposalId":"<ID>","action":"accept","userId":"mgr-1"}'

# Branch actions (manager): start_implementation | merge_to_main | discard
curl -X POST http://localhost:3000/api/branches \
  -H "Content-Type: application/json" \
  -d '{"branchId":"<BRANCH_ID>","action":"start_implementation","managerId":"mgr-1"}'

# Run a drift scan
curl -X POST http://localhost:3000/api/drift

# Ask the Project Brain (permission-governed memory → LLM)
curl -X POST http://localhost:3000/api/memory/ask \
  -H "Content-Type: application/json" \
  -d '{"userId":"wkr-1","projectId":"<PROJECT_ID>","prompt":"What are the current goals?"}'

# Raw LLM: provider status, then a completion (no memory governance)
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
bad input, error paths). Full guide: **[docs/TESTING.md](docs/TESTING.md)**.

```bash
npm run test:scenarios   # 15 pipeline + edge-case assertions
```

The suite drives the orchestrator directly (no dev server needed) but **does
require `MONGODB_URI`** — it seeds and reads the same MongoDB the app uses, and
loads `.env.local` automatically via the npm script.

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
| Consensus | tied 2–2 vote stays `consensus_pending`; a single `needs_discussion` blocks approval; a rejection majority is only `rejected` once the manager declines |
| Versioning | version bumps on the decision branch only — the project is untouched until merge; no branch on rejection |
| Drift | phantom component in a task; >3 open suggestions trip the backlog alert |
| Duplicates | near-duplicate proposal flagged against the original |
| Bad input | empty/whitespace proposal stored without crashing |
| Error paths | vote on missing proposal, tally with zero votes, manager trying to vote — all throw |

**How testing is carried out** — three layers, each one command:
`npm run test:scenarios` (orchestrator logic + edge cases),
`npm run test:llm` (provider keys), and curl-based API integration against
`npm run dev` (see [Testing the APIs](#testing-the-apis) above).

## Deploy to Vercel

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set environment variables:

```env
MONGODB_URI=mongodb+srv://...   # Required — MongoDB Atlas connection string (the app has no in-memory fallback)
GROQ_API_KEY=gsk_...            # Optional — any one LLM key enables AI features (see table above)
```

4. Deploy — `vercel.json` is preconfigured, then hit `POST /api/db/init` once to create indexes

> The repo still contains a Prisma/PostgreSQL scaffold (`prisma/`,
> `DATABASE_URL`) from an earlier iteration. It is **legacy** — the app reads
> and writes MongoDB via Mongoose only.

## Demo Flow (Hackathon)

1. **Dashboard** — See project brain, stats, agent activity, Ask the Project Brain
2. **Submit Suggestion** — e.g. "Migrate Auth Service to OAuth 2.0"
3. **AI Pipeline** — Context gathered, impact analyzed, pros/cons generated
4. **Team Votes** — Approve / reject / needs discussion (ties and discussion votes never auto-approve)
5. **Manager Accepts** — Decision branch created; the project itself is untouched
6. **Start Implementation** — Tasks generated; a second accepted suggestion updates only affected tasks
7. **Merge or Discard** — Merge the branch to update the project (version bump), or discard it with no side effects
8. **Drift Detection** — Scan for mental model divergence

## Sponsor Alignment

| Sponsor | Natural Fit |
|---------|-------------|
| **Conduct** (primary) | Enterprise change workflow, institutional knowledge, human-in-the-loop |
| **CoralOS** | Multi-agent specialist orchestration with governance |
| **Fetch.ai** | Multi-agent collaboration pipeline |
| **BasedAI** | Permission-aware organizational memory, auditable agents |

## Hackathon

UK AI Agent Hackathon EP5 — Imperial College London

Team: 7 Computer Science students | Duration: 7 days
