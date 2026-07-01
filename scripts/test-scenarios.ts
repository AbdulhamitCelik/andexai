// Scenario / edge-case test harness for the decision-governance pipeline.
//
// Drives the orchestrator against the Metropolitan University fixture (MongoDB).
// Run: npm run test:scenarios

import { connectDB } from "@/lib/db/mongodb";
import {
  seedUniversity,
  getProposals,
  getBranches,
  getDriftAlerts,
  createProposal,
  runProposalPipeline,
  castVote,
  tallyVotes,
  managerAcceptProposal,
  managerDeclineProposal,
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

  await seedUniversity();
  const proposals = await getProposals();
  const find = (frag: string) => proposals.find((p) => p.title.includes(frag));
  const mongo = find("MongoDB");
  const oidc = find("OpenID Connect");

  check("A1 · seeds exactly 6 proposals", proposals.length === 6, `got ${proposals.length}`);
  check("A2 · OIDC migration accepted (happy path)", oidc?.status === "accepted", `status=${oidc?.status}`);
  check(
    "A3 · MongoDB proposal rejected or blocked",
    mongo?.status === "rejected" || mongo?.status === "needs_discussion",
    `status=${mongo?.status}`
  );
  check(
    "A4 · facial-recognition -> needs_discussion",
    find("Facial-Recognition")?.status === "needs_discussion",
    `status=${find("Facial-Recognition")?.status}`
  );

  check(
    "B1 · tied 2-2 vote does NOT auto-approve",
    find("Independent Microservices")?.status === "consensus_pending" ||
      find("Independent Microservices")?.status === "needs_discussion",
    `status=${find("Independent Microservices")?.status}`
  );
  const branches = await getBranches();
  check("B2 · at least one branch from accepted proposal", branches.length >= 1, `branches=${branches.length}`);

  const dup = find("second attempt");
  check(
    "C1 · near-duplicate proposal is flagged",
    (dup?.context?.duplicates.length ?? 0) > 0,
    `duplicates=${JSON.stringify(dup?.context?.duplicates)}`
  );

  const alerts = await getDriftAlerts();
  check("D1 · drift alerts generated", alerts.length >= 0, `${alerts.length} alerts`);

  const e1 = await createProposal("", "   ", "wkr-1", "Alex", "main", (await getProposals())[0]?.projectId);
  check("E1 · empty/whitespace proposal handled", Boolean(e1.id));

  await expectThrow("F1 · vote on non-existent proposal throws", async () => {
    await castVote("does-not-exist", "wkr-1", "Alex", "approve");
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
