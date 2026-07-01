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
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy to Vercel

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set environment variables (optional for demo mode):

```env
DATABASE_URL=postgresql://...   # Optional — uses in-memory store without it
OPENAI_API_KEY=sk-...           # For live LLM integration
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
