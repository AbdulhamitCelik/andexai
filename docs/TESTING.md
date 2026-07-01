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
npm run test:scenarios   # pipeline + edge-case suite (no server, no network)
npm run test:llm         # verify configured LLM provider keys
npm run build            # typecheck + lint + production build
```

`npm run test:scenarios` runs 21 assertions against the orchestrator directly
via `tsx` and exits non-zero on any failure (CI-friendly).

---

## The test organisation

A messy-but-realistic university platform: 13 architecture components (services,
databases, integrations), 4 prior institutional decisions, a 5-person review
panel (IT head, architect, security lead, data-protection officer, backend
lead), and 6 seeded proposals engineered to land in different pipeline states.

### Working with the test data

**In the app / over HTTP** — seed the university dataset into the in-memory
store, then browse the UI or query the API:

```bash
# with the dev server running (npm run dev)
curl -X POST http://localhost:3000/api/project \
  -H "Content-Type: application/json" \
  -d '{"scenario":"university"}'

curl http://localhost:3000/api/project      # inspect the seeded snapshot
```

Send `{"scenario":"ecommerce"}` (or no body) to reset to the original demo.

**In code / tests** — call the seed function directly:

```ts
import { seedUniversity, getProposals, getDriftAlerts } from "@/lib/agents/orchestrator";

seedUniversity();
getProposals();    // 6 proposals in mixed states
getDriftAlerts();  // implementation + backlog drift
```

`seedUniversity()` doesn't hand-craft objects — it replays the fixture through
the **real** pipeline functions (`runProposalPipeline`, `castVote`,
`checkConsensus`, `runApprovalPipeline`), so the seed itself exercises the
system.

---

## Edge cases covered

| # | Scenario | What it proves |
|---|----------|----------------|
| A2 | OIDC migration, unanimous approval | Happy path: merges, bumps version, generates tasks |
| A3 | MongoDB records migration, 3 reject / 1 approve | Rejection wins; **no branch** created |
| A4 | Facial-recognition attendance, majority approve **but** 1 `needs_discussion` | A single discussion vote blocks approval |
| B1 | Grading split, tied 2–2 | Tie does **not** auto-approve — stays `consensus_pending` |
| B3 | — | Semantic version bumps only on merge (`3.2.0 → 3.2.1`) |
| C1 | "Second attempt" OIDC proposal | Duplicate detection flags the overlap |
| D1 | Task referencing the retired "Legacy Student Portal" | Implementation drift caught (component not in brain) |
| D2 | 4 open proposals | Backlog drift flagged (>3 open) |
| E1 | Empty / whitespace title & body | No crash |
| E2 | 20,000-character proposal | Full pipeline runs |
| E3 | Unicode + emoji (`Ünïcödé 教务系统 🎓🔐`) | Handled verbatim |
| E4 | `<script>` / SQL-injection strings | Stored verbatim, no crash |
| F1 | Vote on a non-existent proposal | Throws |
| F2 | Consensus check with zero votes | Throws |
| F3 | Approval pipeline on a rejected proposal | Throws |
| F4 | Rollback to a missing branch | Throws |
| G1–G3 | Merge twice, then roll back | Version + architecture restored from snapshot |

---

## How testing was carried out

Three complementary layers, all runnable locally with one command each:

1. **Scenario / edge-case suite** (`npm run test:scenarios`) — the primary
   layer. Exercises orchestrator logic and every branch of the consensus, drift,
   and rollback code paths against the university fixture. Pure functions, no
   server, runs in well under a second.

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
- **Consensus is intentionally conservative.** Ties and any `needs_discussion`
  vote never auto-approve — a human must break the tie. This is by design
  (human-in-the-loop governance), not a bug.
- **Rollback uses pre-merge snapshots.** A branch snapshot is captured *before*
  its own merge, so rolling back to a branch restores the state that preceded
  that decision.

---

## Adding your own scenario

Append a `SeedProposal` to `UNIVERSITY_PROPOSALS` in the fixture with its votes
and `expectStatus`, then add a matching `check(...)` in the scenario suite. Run
`npm run test:scenarios` to confirm it behaves as expected.
