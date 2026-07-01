// Scenario / edge-case test harness for the decision-governance pipeline.
//
// Drives the orchestrator directly (no server, no network) against the
// Metropolitan University fixture, asserting both happy paths and the
// exceptions/edge cases that a real organisation would hit.
//
// Run: npm run test:scenarios
//
// No test framework — a tiny assert runner keeps it dependency-free and fast.

import {
  seedUniversity,
  store,
  getProposals,
  getBranches,
  getDriftAlerts,
  createProposal,
  runProposalPipeline,
  castVote,
  checkConsensus,
  runApprovalPipeline,
  rollbackToBranch,
} from "@/lib/agents/orchestrator";

// ─── tiny assert runner ─────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const rows: { name: string; ok: boolean; detail: string }[] = [];

function check(name: string, cond: boolean, detail = "") {
  rows.push({ name, ok: cond, detail: cond ? detail : detail || "assertion false" });
  cond ? passed++ : failed++;
}

function expectThrow(name: string, fn: () => void) {
  try {
    fn();
    check(name, false, "expected an error, none thrown");
  } catch (e) {
    check(name, true, `threw: ${(e as Error).message}`);
  }
}

// ─── Group A — seed integrity ───────────────────────────────────────────────

seedUniversity();
const proposals = getProposals();
const find = (frag: string) => proposals.find((p) => p.title.includes(frag));
const mongo = find("MongoDB");
const oidc = find("OpenID Connect");

check("A1 · seeds exactly 6 proposals", proposals.length === 6, `got ${proposals.length}`);
check("A2 · OIDC migration merged (happy path)", oidc?.status === "merged", `status=${oidc?.status}`);
check("A3 · MongoDB proposal rejected", mongo?.status === "rejected", `status=${mongo?.status}`);
check(
  "A4 · facial-recognition -> needs_discussion",
  find("Facial-Recognition")?.status === "needs_discussion",
  `status=${find("Facial-Recognition")?.status}`
);

// ─── Group B — consensus edge cases ─────────────────────────────────────────

check(
  "B1 · tied 2-2 vote does NOT auto-approve",
  find("Independent Microservices")?.status === "consensus_pending",
  `status=${find("Independent Microservices")?.status}`
);
check("B2 · rejected proposal creates no branch", getBranches().length === 1, `branches=${getBranches().length}`);
check("B3 · merged decision bumped version 3.2.0 -> 3.2.1", store.project?.currentVersion === "3.2.1", `v=${store.project?.currentVersion}`);

// ─── Group C — duplicate detection ──────────────────────────────────────────

const dup = find("second attempt");
check(
  "C1 · near-duplicate proposal is flagged",
  (dup?.context?.duplicates.length ?? 0) > 0,
  `duplicates=${JSON.stringify(dup?.context?.duplicates)}`
);

// ─── Group D — drift detection ──────────────────────────────────────────────

const alerts = getDriftAlerts();
check(
  "D1 · implementation drift: phantom component caught",
  alerts.some((a) => a.description.includes("Legacy Student Portal")),
  `${alerts.length} alerts`
);
check(
  "D2 · backlog drift: >3 open proposals flagged",
  alerts.some((a) => a.source === "conversation"),
  `${alerts.length} alerts`
);

// ─── Group E — pathological inputs must not crash ───────────────────────────

const e1 = createProposal("", "   ", "anon", "Anon");
check("E1 · empty/whitespace proposal handled", Boolean(e1.id));

const long = "A".repeat(20_000);
const e2 = runProposalPipeline(long, long, "anon", "Anon");
check("E2 · 20k-char proposal runs full pipeline", e2.proposal.status === "under_review");

const e3 = runProposalPipeline("Ünïcödé 教务系统 🎓🔐", "naïve café résumé — ✅", "anon", "Anon");
check("E3 · unicode/emoji handled", Boolean(e3.proposal.review));

const e4 = runProposalPipeline("<script>alert(1)</script>", "'; DROP TABLE students;--", "anon", "Anon");
check("E4 · injection-like strings stored verbatim, no crash", e4.proposal.title.includes("<script>"));

// ─── Group F — error paths must throw ───────────────────────────────────────

expectThrow("F1 · vote on non-existent proposal throws", () => castVote("does-not-exist", "u", "U", "approve"));
expectThrow("F2 · checkConsensus with zero votes throws", () => {
  const p = createProposal("no votes yet", "d", "u", "U");
  checkConsensus(p.id);
});
expectThrow("F3 · approval pipeline on a rejected proposal throws", () => runApprovalPipeline(mongo!.id));
expectThrow("F4 · rollback to missing branch throws", () => rollbackToBranch("no-such-branch"));

// ─── Group G — rollback correctness ─────────────────────────────────────────

seedUniversity(); // clean slate
const firstBranch = getBranches().find((b) => b.merged)!;
const alumni = runProposalPipeline("Add Alumni Portal Module", "New alumni engagement service", "u", "U").proposal;
castVote(alumni.id, "a", "A", "approve");
castVote(alumni.id, "b", "B", "approve");
checkConsensus(alumni.id);
alumni.managerApproved = true;
runApprovalPipeline(alumni.id);

check("G1 · second merge bumps version to 3.2.2", store.project?.currentVersion === "3.2.2", `v=${store.project?.currentVersion}`);
rollbackToBranch(firstBranch.id);
check(
  "G2 · rollback restores the branch snapshot version",
  store.project?.currentVersion === firstBranch.snapshot.currentVersion,
  `restored v=${store.project?.currentVersion}, snapshot v=${firstBranch.snapshot.currentVersion}`
);
check(
  "G3 · rollback restores architecture component count",
  store.project?.architecture.length === firstBranch.snapshot.architecture.length
);

// ─── report ─────────────────────────────────────────────────────────────────

console.log("\n  Andex AI — scenario & edge-case suite\n  " + "─".repeat(48));
for (const r of rows) {
  const mark = r.ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
  console.log(`  ${mark} ${r.name}${r.ok ? "" : `\n      → ${r.detail}`}`);
}
console.log("  " + "─".repeat(48));
console.log(`  ${passed} passed, ${failed} failed, ${rows.length} total\n`);

process.exit(failed ? 1 : 0);
