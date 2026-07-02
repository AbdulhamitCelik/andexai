# Testing Guide

Andex AI ships with a **test organisation** — *Metropolitan University — Digital
Campus* — and an automated suite that drives the full decision-governance
pipeline through realistic happy paths **and** the exceptions/edge cases a real
organisation hits.

- Fixture: [`src/lib/fixtures/university.ts`](../src/lib/fixtures/university.ts)
- Scenario suite: [`scripts/test-scenarios.ts`](../scripts/test-scenarios.ts)
- LLM smoke test: [`scripts/test-llm.mjs`](../scripts/test-llm.mjs)

---

## Quick commands

```bash
npm run test:scenarios   # pipeline + edge-case suite (needs MONGODB_URI; no dev server)
npm run test:llm         # verify configured LLM provider keys (calls providers)
npm run build            # typecheck + lint + production build
```

`npm run test:scenarios` runs **15 assertions** against the orchestrator
directly and exits non-zero on any failure (CI-friendly). It loads `.env.local`
(like `test:llm` does) and **requires `MONGODB_URI`** — the orchestrator
persists through Mongoose, so the suite seeds and reads the same MongoDB the
app uses. Re-runs are deterministic: the university project's data is cleared
and re-seeded on every run. No dev server is needed, but the database must be
reachable.

---

## The test organisation

A messy-but-realistic university platform: 13 architecture components (services,
databases, integrations), 4 prior institutional decisions, a 5-person review
panel (IT head, architect, security lead, data-protection officer, backend
lead), and 6 seeded proposals engineered to land in different pipeline states.

### Working with the test data

**In the app / over HTTP** — seed the university dataset into MongoDB, then
browse the UI or query the API:

```bash
# with the dev server running (npm run dev)
curl -X POST http://localhost:3000/api/project \
  -H "Content-Type: application/json" \
  -d '{"scenario":"university"}'

curl http://localhost:3000/api/project      # inspect the seeded snapshot
```

Send `{"scenario":"ecommerce"}` (or no body) to seed the original demo
alongside it.

**In code / tests** — call the seed function directly (requires `MONGODB_URI`):

```ts
import { seedUniversity, getProposals, detectDrift } from "@/lib/agents/orchestrator";

const brain = await seedUniversity();
await getProposals(brain.id);  // 6 proposals in mixed states
await detectDrift();           // implementation + backlog drift
```

`seedUniversity()` doesn't hand-craft objects — it replays the fixture through
the **real** pipeline functions (`runProposalPipeline`, `castVote`/`seedCastVote`,
`tallyVotes`, `managerAcceptProposal`, `managerDeclineProposal`), so the seed
itself exercises the system. It clears the university project's previous data
first, so re-seeding is idempotent.

---

## Assertions in the suite

| # | Scenario | What it proves |
|---|----------|----------------|
| A1 | Fixture seeds | Exactly 6 university proposals, deterministic on re-runs |
| A2 | OIDC migration, clear approval majority | Happy path: manager accepts, decision branch opens, tasks flow |
| A3 | MongoDB records migration, 3 reject / 1 approve | Rejection majority alone never sets `rejected` — the manager declines |
| A4 | Facial-recognition attendance, majority approve **but** 1 `needs_discussion` | A single discussion vote blocks approval |
| A5 | The rejected proposal | **No branch** created on rejection |
| B1 | Grading split, tied 2–2 | Tie does **not** auto-approve — stays `consensus_pending` |
| B2 | The accepted proposal | Opens a decision branch |
| B3 | Branch vs project version | Version bumps on the branch only (`3.2.0 → 3.2.1`); the project stays `3.2.0` until merge |
| C1 | "Second attempt" OIDC proposal | Duplicate detection flags the overlap |
| D1 | Task referencing the retired "Legacy Student Portal" | Implementation drift caught (component not in the brain) |
| D2 | 4 open suggestions on one project | Backlog drift flagged (>3 open) |
| E1 | Empty / whitespace title & body | Stored without crashing (validation lives at the API layer) |
| F1 | Vote on a non-existent proposal | Throws |
| F2 | Tally with zero votes | Throws |
| F3 | Manager tries to vote | Throws — only workers vote |

---

## How testing was carried out

Three complementary layers, all runnable locally with one command each:

1. **Scenario / edge-case suite** (`npm run test:scenarios`) — the primary
   layer. Exercises orchestrator logic and the consensus, branching, and drift
   code paths against the university fixture. Runs without a dev server, but
   needs `MONGODB_URI` (loaded from `.env.local` by the npm script) since the
   orchestrator persists everything through Mongoose.

2. **LLM provider smoke test** (`npm run test:llm`) — hits each configured
   provider's `/chat/completions` endpoint and reports latency + reply, so key
   or model misconfiguration is caught before it reaches the UI.

3. **API integration (manual/curl)** — the REST endpoints are verified against a
   running dev server; the full proposal lifecycle
   (create → vote → approve → branch → tasks → merge) is documented with
   copy-paste commands in the [README](../README.md#testing-the-apis).

### Findings worth knowing

- **Validation lives at the API layer, not the orchestrator.** `createProposal`
  accepts empty/whitespace input (test E1), while `POST /api/proposals` rejects
  it with a `400`. Keep input validation in route handlers; treat orchestrator
  functions as trusted-caller internals.
- **Consensus is intentionally conservative.** A tie stays `consensus_pending`,
  any `needs_discussion` vote sends the suggestion back to the team, and a
  rejection majority only becomes `rejected` when the manager declines. Nothing
  auto-approves — a human always decides (human-in-the-loop governance).
- **There is no rollback endpoint.** Branches are the safety mechanism: the
  project brain is untouched until a branch is explicitly merged
  (`merge_to_main`), and a branch can be discarded at any point with zero side
  effects on the project.

---

## Adding your own scenario

Append a `SeedProposal` to `UNIVERSITY_PROPOSALS` in the fixture with its votes
and `expectStatus`, then add a matching `check(...)` in the scenario suite. Run
`npm run test:scenarios` to confirm it behaves as expected.
