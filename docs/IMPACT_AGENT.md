# Impact Agent — LLM-Based Analysis

The Impact Agent replaces all template-based impact analysis with genuine LLM reasoning grounded in Project Brain context and decision history.

## Flow

```
Proposal Text
  → Project Brain Context (vision, architecture, tasks, roadmap, risks)
  → Historical Decision Context (accepted/rejected, trade-offs, outcomes)
  → LLM Reasoning
  → JSON validation + safe repair
  → Structured Impact Analysis stored on proposal
  → Review Agent derives pros/cons from structured output
```

## Requirements

- At least one LLM API key in `.env.local` (see `docs/LLM.md`)
- MongoDB connected
- Seeded or created project with architecture data

## Test

### 1. Create two different proposals

```bash
curl -X POST http://localhost:3000/api/proposals \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Add Apple Pay checkout\",\"description\":\"UK users need Apple Pay and Google Pay at checkout to reduce cart abandonment\",\"target\":\"project:YOUR_PROJECT_ID\"}"
```

```bash
curl -X POST http://localhost:3000/api/proposals \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Rebuild search relevance\",\"description\":\"Product search returns irrelevant results; need autocomplete and visual filters\",\"target\":\"project:YOUR_PROJECT_ID\"}"
```

Each should produce **different** affected components, risks, and effort estimates.

### 2. Verify LLM dependency

Remove or comment out all LLM keys in `.env.local` and retry — impact analysis must **fail** with:

`Impact Agent requires LLM — analysis cannot proceed`

### 3. View structured analysis

Open `/proposals/[id]` in the UI — full panel shows:
- Affected components with reasons
- Risks with severity/likelihood/mitigation
- Trade-offs, dependencies, effort estimate
- LLM provider/model timestamp

### 4. Re-run impact

```bash
curl -X POST http://localhost:3000/api/proposals/PROPOSAL_ID/impact \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":\"YOUR_PROJECT_ID\",\"userId\":\"mgr-1\"}"
```

### 5. Audit logs

Check `/agents` page or MongoDB `agent_logs` for entries:
- `load_proposal`
- `retrieve_brain`
- `retrieve_history`
- `llm_call`
- `llm_response`
- `analysis_complete`
- `stored`

## Files

| File | Role |
|------|------|
| `src/lib/agents/impact-agent.ts` | LLM call + store |
| `src/lib/agents/impact-context.ts` | Brain + history retrieval |
| `src/lib/agents/impact-validator.ts` | JSON parse/validate/repair |
| `src/lib/agents/orchestrator.ts` | Pipeline integration |
| `src/app/api/proposals/[id]/impact/route.ts` | Re-run API |
| `src/components/proposals/impact-analysis-panel.tsx` | UI |
