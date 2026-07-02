# AI Councils — Architecture Reference

Each council is a modular service under `src/lib/councils/`. The registry (`registry.ts`) defines agents, inputs, and outputs. Runs are persisted in MongoDB `council_runs`.

## Council Catalog

| Council | Service | Trigger |
|---------|---------|---------|
| Discovery | `product-discovery.ts` (orchestrator) | Feature Packs page → Run Discovery |
| Proposal | orchestrator pipeline | Promote pack / create suggestion |
| Approval | orchestrator voting + manager accept | Proposals page |
| Planning | `planning-council.ts` | Auto on manager accept; manual via Lifecycle OS |
| Implementation | orchestrator tasks | Branches → Start Implementation |
| Testing | `testing-council.ts` | Lifecycle OS → Run Testing Council |
| Evaluation | `evaluation-council.ts` | Lifecycle OS → Run Evaluation Council |
| Learning | `learning-loop.ts` | Lifecycle OS → Run Learning Loop |

## Agent Interfaces

All council agents are declared in `registry.ts` with `{ id, name, role }`. Runtime agent names are stored on each `CouncilRun.agents[]` for audit transparency.

## Report Types

Defined in `src/lib/types/index.ts`:

- `PlanningReport` — sprints, milestones, critical path, owner recommendations
- `TestingReport` — customer simulation, technical QA, A/B variants
- `EvaluationReport` — scores, executive summary, ship/revise/rollback
- `LearningReport` — insights, brain updates

## Permission Governance

Councils that read Project Brain or governed memory must use `askWithGovernedMemory()` from `src/lib/governance/memory-retrieval.ts`. Permission checks occur **before** any LLM call.

## Lifecycle Resolution

`lifecycle.ts` → `resolveLifecyclePhases()` derives UI state from feature packs, proposals, branches, and council runs without mutating project data.
