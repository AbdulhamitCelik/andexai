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
