# Andex AI — Product Lifecycle Testing Guide

This guide walks judges and demo operators through the full **AI Product Operating System** flow.

## Prerequisites

1. **MongoDB** — set `MONGODB_URI` in `.env.local`
2. **Optional LLM** — `OPENROUTER_API_KEY` or `NVIDIA_API_KEY` for Ask Brain (governance demo works without LLM)
3. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

4. Initialise DB (first run):

```bash
curl -X POST http://localhost:3000/api/db/init
```

---

## Demo Flow (15 minutes)

### 1. Opening experience

- Refresh the browser (or open a new tab/session).
- A **splash intro** plays once per session: sakura petals, ink-wash background, elegant serif typography.
- Navigate via sidebar → **Lifecycle OS** (`/lifecycle`).

### 2. Seed a project

**Option A — Dashboard**

- Go to **Dashboard** → use seed controls if available, or create via API:

```bash
curl -X POST http://localhost:3000/api/project -H "Content-Type: application/json" -d "{\"scenario\":\"ecommerce\"}"
```

**Option B — University scenario**

```bash
curl -X POST http://localhost:3000/api/project -H "Content-Type: application/json" -d "{\"scenario\":\"university\"}"
```

### 3. Discovery Council

1. Sidebar → **Feature Packs**
2. Select project
3. Click **Run Discovery** — agents cluster mock feedback into **Feature Packs**
4. Expand a pack — verify evidence, geo, sentiment, priority
5. **Promote to Suggestion** — enters Proposal Council workflow

**Expected:** Lifecycle page shows **Discovery** phase complete.

### 4. Proposal Council

1. Sidebar → **Suggestions** → open promoted proposal
2. Pipeline runs automatically (context → impact → review)
3. Review pros, cons, risks, alternatives

**Expected:** **Proposal** phase complete on Lifecycle OS.

### 5. Approval Council

1. Switch sidebar user to a **Worker** → vote (approve / needs discussion)
2. Switch to **Manager** (Jordan)
3. **Accept** the proposal

**Expected:**

- **Approval** phase complete
- **Decision Branch** created
- **Planning Council runs automatically** — roadmap stored in `council_runs`

### 6. Planning Council

1. **Lifecycle OS** → expand **Planning Council**
2. View sprint roadmap (Sprint 1–4), milestones, critical path
3. Optional: click **Run Planning Council** again to regenerate (manager only)

### 7. Implementation Council

1. Sidebar → **Branches** → **Start Implementation** on the open branch
2. Sidebar → **Tasks** — verify generated tasks with owners, status, lineage

**Expected:** **Implementation** phase active/complete on Lifecycle OS.

### 8. Testing Council

1. **Lifecycle OS** → **Testing Council** → **Run Testing Council**
2. Review structured report:
   - Customer simulation (6 personas)
   - Technical QA / security / performance
   - **A/B table** — Variant A vs B vs C

### 9. Evaluation Council

1. **Run Evaluation Council** (requires Testing run first for best scores)
2. Review executive summary, overall score, **Ship / Revise / Rollback** recommendation

> AI recommends only — humans decide whether to ship.

### 10. Learning Loop

1. **Run Learning Loop**
2. Sidebar → **Main Ideas (Project Brain)** — new institutional memory entry from lessons learned

**Expected:** Full pipeline green/complete on Lifecycle OS.

### 11. Memory Governance (BasedAI)

1. Sidebar → **Memory Governance**
2. Switch user to **Intern** — confidential memories hidden
3. Switch to **Manager** — full access
4. Dashboard → **Ask Brain** — answers use permission-filtered retrieval only

---

## API Testing

### Lifecycle state

```bash
curl "http://localhost:3000/api/councils?projectId=YOUR_PROJECT_ID"
```

Returns: `phases`, `runs`, `activeBranch`, council catalog.

### Run a council

```bash
curl -X POST http://localhost:3000/api/councils \
  -H "Content-Type: application/json" \
  -d '{"councilId":"testing","projectId":"YOUR_PROJECT_ID","branchId":"YOUR_BRANCH_ID"}'
```

Valid manual councils: `planning`, `testing`, `evaluation`, `learning`.

Discovery / Proposal / Approval / Implementation run through existing pages.

---

## Architecture Checklist (for judges)

| Layer | Location |
|-------|----------|
| Council registry | `src/lib/councils/registry.ts` |
| Council services | `src/lib/councils/*-council.ts`, `council-service.ts` |
| Lifecycle resolution | `src/lib/councils/lifecycle.ts` |
| API | `src/app/api/councils/route.ts` |
| UI | `src/app/lifecycle/page.tsx` |
| DB | `council_runs` collection |
| Permissions | `src/lib/governance/*` — filter **before** LLM |
| Orchestrator hooks | Planning auto-runs on manager accept |

---

## Core Principles (verify during demo)

- AI **never** silently updates project state without human approval path
- Every council produces **structured reports with evidence**
- Permission checks happen **before** memory reaches the LLM
- Humans approve proposals; managers start implementation

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Empty lifecycle | Seed project via `/api/project` |
| No branch for Testing | Manager must accept a main-target proposal first |
| Planning already exists | Normal — auto-runs on approval; re-run is optional |
| Splash doesn't show | Clear `sessionStorage` key `andex-splash-seen` |
| MongoDB errors | Check `MONGODB_URI`, run `/api/db/init` |

---

## Automated scenario script

```bash
npx tsx scripts/test-scenarios.ts
```

Runs end-to-end proposal workflow against MongoDB (useful for CI/smoke tests).
