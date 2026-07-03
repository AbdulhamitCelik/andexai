// Integration smoke test against running dev server — node scripts/test-api.mjs
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const results = [];

function pass(name, detail) {
  results.push({ name, ok: true, detail });
  console.log(`✅ ${name}: ${detail}`);
}

function fail(name, detail) {
  results.push({ name, ok: false, detail });
  console.log(`❌ ${name}: ${detail}`);
}

// 1. LLM status
const llm = await get("/api/llm");
if (llm.ok && llm.data.ready) pass("LLM providers", `${llm.data.configured?.length ?? 0} configured`);
else fail("LLM providers", llm.data.error ?? `HTTP ${llm.status}`);

// 2. Dashboard / project
const project = await get("/api/project");
if (project.ok && Array.isArray(project.data.projects)) {
  pass("GET /api/project", `${project.data.projects.length} project(s)`);
} else {
  fail("GET /api/project", project.data.error ?? `HTTP ${project.status}`);
}

const projectId = project.data?.projects?.[0]?.id;
if (!projectId) {
  console.log("\n⚠️  No projects — skipping project-scoped tests. Seed via Brain page or POST /api/project.");
} else {
  // 3. Proposals
  const proposals = await get("/api/proposals");
  if (proposals.ok && Array.isArray(proposals.data.proposals)) {
    pass("GET /api/proposals", `${proposals.data.proposals.length} proposal(s)`);
  } else fail("GET /api/proposals", proposals.data.error ?? `HTTP ${proposals.status}`);

  // 4. Product discovery (the NaN fix)
  const discovery = await post("/api/discovery", { projectId });
  if (discovery.ok && Array.isArray(discovery.data.featurePacks)) {
    const packs = discovery.data.featurePacks;
    const bad = packs.find((p) => !Number.isFinite(p.priorityScore));
    if (bad) fail("POST /api/discovery", `pack has invalid priorityScore: ${bad.priorityScore}`);
    else pass("POST /api/discovery", `${packs.length} feature pack(s), scores valid`);
  } else {
    fail("POST /api/discovery", discovery.data.error ?? `HTTP ${discovery.status}`);
  }

  // 5. Priority / intelligence
  const priority = await get(`/api/priority?projectId=${projectId}`);
  if (priority.ok) pass("GET /api/priority", "rankings + intelligence loaded");
  else fail("GET /api/priority", priority.data.error ?? `HTTP ${priority.status}`);

  // 6. Councils
  const councils = await get(`/api/councils?projectId=${projectId}`);
  if (councils.ok) pass("GET /api/councils", `${councils.data.councils?.length ?? 0} councils`);
  else fail("GET /api/councils", councils.data.error ?? `HTTP ${councils.status}`);

  // 7. Ask Brain (two different questions)
  const q1 = await post("/api/memory/ask", {
    userId: "mgr-1",
    projectId,
    prompt: "What is the project vision?",
  });
  const q2 = await post("/api/memory/ask", {
    userId: "mgr-1",
    projectId,
    prompt: "What are the main technical risks?",
  });
  if (q1.ok && q1.data.answer && !q1.data.accessDenied) {
    const via = q1.data.provider ? `via ${q1.data.provider}` : q1.data.llmFallback ? "fallback" : "no provider";
    pass("POST /api/memory/ask (vision)", `${q1.data.answer.slice(0, 60)}… (${via})`);
  } else {
    fail("POST /api/memory/ask (vision)", q1.data.message ?? q1.data.error ?? `HTTP ${q1.status}`);
  }
  if (q2.ok && q2.data.answer && !q2.data.accessDenied) {
    const different = q1.data.answer !== q2.data.answer;
    pass(
      "POST /api/memory/ask (risks)",
      different
        ? `distinct answer ${q2.data.provider ? `via ${q2.data.provider}` : ""}`
        : "answer returned (same as vision — check LLM keys)"
    );
  } else {
    fail("POST /api/memory/ask (risks)", q2.data.message ?? q2.data.error ?? `HTTP ${q2.status}`);
  }

  // 8. Governance
  const gov = await get(`/api/governance?userId=mgr-1&projectId=${projectId}`);
  if (gov.ok) pass("GET /api/governance", `${gov.data.stats?.accessible ?? "?"} accessible memories`);
  else fail("GET /api/governance", gov.data.error ?? `HTTP ${gov.status}`);
}

// 9. Agents
const agents = await get("/api/agents");
if (agents.ok) pass("GET /api/agents", `${agents.data.logs?.length ?? 0} log entries`);
else fail("GET /api/agents", agents.data.error ?? `HTTP ${agents.status}`);

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} API checks passed`);
process.exit(failed ? 1 : 0);
