# Enterprise Decision Intelligence — Testing Guide

AndexAI is now an **Enterprise Decision Intelligence Operating System** with universal priority scoring, structured enterprise reports, timeline/resource engines, and explainable decision intelligence.

## Quick Start

```bash
npm install
npm run dev
curl -X POST http://localhost:3000/api/db/init
curl -X POST http://localhost:3000/api/project -H "Content-Type: application/json" -d "{\"scenario\":\"ecommerce\"}"
```

Open http://localhost:3000

---

## New Capabilities

| Capability | Location | API |
|------------|----------|-----|
| **Priority Engine** | All entities scored with reasoning | `GET /api/priority?projectId=...` |
| **Project Brain Rankings** | Dashboard, Lifecycle OS | `GET /api/priority?projectId=...&view=brain` |
| **Decision Intelligence** | Dashboard, Lifecycle OS | `GET /api/priority?projectId=...&view=decisions` |
| **Enterprise Reports** | Council runs (Planning/Testing/Evaluation) | Expand council on `/lifecycle` |
| **Timeline Engine** | Planning Council report | Auto on manager accept |
| **Resource Engine** | Task assignees on implementation | Branches → Start Implementation |
| **Dark / Light mode** | Sidebar bottom toggle | — |
| **Loading animations** | All major pages | Sakura pulse loader |

---

## Test Flow (20 min)

### 1. Theme & splash
- Refresh browser → splash animation with sakura petals
- Sidebar → **Light mode** / **Dark mode** toggle
- Verify UI adapts (background, cards, text)

### 2. Priority Engine — Discovery
1. **Feature Packs** → Run Discovery
2. Each pack shows **Priority Score** and **Confidence**
3. Scores now come from Priority Engine (multi-dimension, not hardcoded)
4. API check:
```bash
curl "http://localhost:3000/api/priority?projectId=YOUR_ID"
```
Returns: `scores[]` with `dimensions[]`, `reasoning[]`, `recommendedAction`

### 3. Decision Intelligence — Dashboard
1. **Dashboard** → see **Project Brain** panel ("What matters now")
2. **Decision Intelligence** panel explains:
   - Why Feature A should be prioritised
   - Why Feature B should wait
   - Delay/revenue/engineering impact

### 4. Full lifecycle with enterprise reports
1. Promote Feature Pack → vote → Manager **Accept**
2. **Planning Council** auto-runs with:
   - Roadmap, sprints, milestones, critical path
   - Priority/confidence/risk scores
   - **Enterprise Report** (exportable JSON)
3. **Branches** → Start Implementation → tasks get **assignees** from Resource Engine
4. **Lifecycle OS** → Run Testing → structured report + enterprise sections
5. Run Evaluation → **Board-ready** report (business/engineering/customer/delivery health)
6. Run Learning → Project Brain updated

### 5. Enterprise report export
1. Lifecycle OS → expand Planning/Testing/Evaluation council
2. Click **Export** on Enterprise Report card
3. JSON includes all sections: executive summary, metrics, risks, action items, KPIs

### 6. Refresh priorities
```bash
curl -X POST http://localhost:3000/api/priority -H "Content-Type: application/json" -d "{\"projectId\":\"YOUR_ID\"}"
```

---

## Architecture

```
src/lib/engines/
  priority-engine.ts    — Universal scoring (all entity types)
  priority-service.ts     — DB persistence + brain rankings
  report-framework.ts     — Enterprise report builder
  timeline-engine.ts      — Roadmaps, sprints, delay predictions
  resource-engine.ts      — Capacity, assignees, bottlenecks
  decision-intelligence.ts — Prioritise vs defer reasoning
```

Councils call engines — **no hardcoded priority in individual agents**.

MongoDB collection: `priority_scores`

---

## Verify Core Principles

- [ ] Every score includes **reasoning** (not just a number)
- [ ] Every council report has **Enterprise Report** sections
- [ ] Decision Intelligence explains **why wait** and **what if delayed**
- [ ] Tasks have assignees from Resource Engine
- [ ] Project Brain ranks top priorities with **why** and **next action**
- [ ] Humans still approve — AI recommends only

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Empty priority scores | Run Discovery or `POST /api/priority` |
| No Decision Intelligence | Need 2+ scored entities (packs/proposals) |
| Theme flash | Normal on first load — persists in localStorage |
| Old council reports missing enterprise sections | Re-run council from Lifecycle OS |

See also: [LIFECYCLE.md](./LIFECYCLE.md), [COUNCILS.md](./COUNCILS.md)
