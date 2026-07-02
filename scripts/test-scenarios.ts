// Scenario / edge-case test harness for the decision-governance pipeline.
//
// Drives the orchestrator against the Metropolitan University fixture.
// Requires MONGODB_URI — the suite talks to the same MongoDB the app uses
// (the npm script loads it from .env.local). Re-seeding is idempotent: the
// university project's data is cleared and rebuilt through the real pipeline
// on every run.
//
// Run: npm run test:scenarios

import { connectDB } from "@/lib/db/mongodb";
import {
  seedUniversity,
  getProposals,
  getBranchesForProject,
  detectDrift,
  createProposal,
  castVote,
  tallyVotes,
  getDriftAlerts,
  managerAcceptProposal,
} from "@/lib/agents/orchestrator";

let passed = 0;
let failed = 0;
const rows: { name: string; ok: boolean; detail: string }[] = [];

function check(name: string, cond: boolean, detail = "") {
  rows.push({ name, ok: cond, detail: cond ? detail : detail || "assertion false" });
  cond ? passed++ : failed++;
}

async function expectThrow(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    check(name, false, "expected an error, none thrown");
  } catch (e) {
    check(name, true, `threw: ${(e as Error).message}`);
  }
}

async function main() {
  await connectDB();

  const brain = await seedUniversity();
  const proposals = await getProposals(brain.id);
  const find = (frag: string) => proposals.find((p) => p.title.includes(frag));
  const mongo = find("MongoDB");
  const oidc = find("OpenID Connect");
  const tied = find("Independent Microservices");
  const branches = await getBranchesForProject(brain.id);

  // A — pipeline outcomes
  check("A1 · seeds exactly 6 proposals", proposals.length === 6, `got ${proposals.length}`);
  check("A2 · OIDC migration accepted (happy path)", oidc?.status === "accepted", `status=${oidc?.status}`);
  check("A3 · rejection majority ends rejected only via manager decline", mongo?.status === "rejected", `status=${mongo?.status}`);
  check(
    "A4 · single needs_discussion vote blocks approval",
    find("Facial-Recognition")?.status === "needs_discussion",
    `status=${find("Facial-Recognition")?.status}`
  );
  check(
    "A5 · no branch created for the rejected proposal",
    branches.every((b) => b.seedProposalId !== mongo?.id),
    `branches=${branches.length}`
  );

  // B — consensus + versioning
  check("B1 · tied 2-2 vote stays consensus_pending (no auto-approve)", tied?.status === "consensus_pending", `status=${tied?.status}`);
  const oidcBranch = branches.find((b) => b.seedProposalId === oidc?.id);
  check("B2 · accepted proposal opened a decision branch", Boolean(oidcBranch), `branches=${branches.length}`);
  check(
    "B3 · version bumps on the branch only, project unchanged",
    oidcBranch?.version === "3.2.1" && oidcBranch?.mainVersionAtCreation === "3.2.0",
    `branch=${oidcBranch?.version} main@creation=${oidcBranch?.mainVersionAtCreation}`
  );

  // C — duplicates
  const dup = find("second attempt");
  check(
    "C1 · near-duplicate proposal is flagged",
    (dup?.context?.duplicates.length ?? 0) > 0,
    `duplicates=${JSON.stringify(dup?.context?.duplicates)}`
  );

  // D — drift detection
  const alerts = await detectDrift();
  check(
    "D1 · implementation drift: phantom component caught",
    alerts.some((a) => a.source === "implementation" && a.description.includes("Legacy Student Portal")),
    `${alerts.length} alerts`
  );
  check(
    "D2 · backlog drift: >3 open suggestions flagged",
    alerts.some((a) => a.source === "backlog" && a.projectId === brain.id),
    `${alerts.length} alerts`
  );

  // E — hostile / degenerate input
  const e1 = await createProposal("", "   ", "wkr-1", "Alex", "main", brain.id);
  check("E1 · empty/whitespace proposal handled without crash", Boolean(e1.id));

  // F — error paths
  await expectThrow("F1 · vote on a non-existent proposal throws", async () => {
    await castVote("does-not-exist", "wkr-1", "Alex", "approve");
  });
  await expectThrow("F2 · tally with zero votes throws", async () => {
    await tallyVotes(e1.id);
  });
  await expectThrow("F3 · manager cannot vote (workers only)", async () => {
    await castVote(tied?.id ?? "missing", "mgr-1", "Sarah", "approve");
  });

  // G — regression: array titles, drift dedup, governance bypass
  const arrayTitle = await createProposal(
    ["script", "alert"] as unknown as string,
    "Array title regression",
    "wkr-1",
    "Alex",
    "main",
    brain.id
  );
  check(
    "G1 · array title coerced without crash",
    typeof arrayTitle.title === "string" && arrayTitle.title.includes("script"),
    `title=${JSON.stringify(arrayTitle.title)}`
  );

  await detectDrift();
  const driftCount1 = (await getDriftAlerts()).length;
  await detectDrift();
  const driftCount2 = (await getDriftAlerts()).length;
  check(
    "G2 · repeated drift scan does not duplicate alerts",
    driftCount1 === driftCount2,
    `${driftCount1} vs ${driftCount2}`
  );

  await expectThrow("G3 · manager cannot accept without consensus", async () => {
    const p = await createProposal("Governance bypass test", "Accept should be blocked", "wkr-1", "Alex", "main", brain.id);
    await managerAcceptProposal(p.id, "mgr-1");
  });

  console.log("\n  Andex AI — scenario & edge-case suite\n  " + "─".repeat(48));
  for (const r of rows) {
    const mark = r.ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
    console.log(`  ${mark} ${r.name}${r.ok ? "" : `\n      → ${r.detail}`}`);
  }
  console.log("  " + "─".repeat(48));
  console.log(`  ${passed} passed, ${failed} failed, ${rows.length} total\n`);

  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
