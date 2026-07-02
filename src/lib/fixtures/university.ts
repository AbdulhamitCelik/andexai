// Test organisation fixture: "Metropolitan University — Digital Campus Platform".
//
// This is a deliberately messy, realistic dataset used to exercise the full
// decision-governance pipeline, including exceptions and edge cases:
//
//   - an accepted decision that opens a branch (happy path)
//   - a rejected decision (rejections outweigh approvals; manager declines)
//   - a decision stuck in "needs discussion"
//   - a tied vote that must NOT auto-approve
//   - a near-duplicate proposal (duplicate detection)
//   - enough open proposals to trip the drift "backlog" alert
//   - a divergent implementation task referencing a component that no longer
//     exists in the brain (implementation drift)
//
// Consumed by `seedUniversity()` in the orchestrator and by the scenario test
// harness (scripts/test-scenarios.ts). See docs/TESTING.md.

import type { ProjectBrain, VoteType } from "@/lib/types";

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

/** Fresh copy of the university project brain (new timestamps each call). */
export function universityBrain(): ProjectBrain {
  return {
    id: "proj-metro-university",
    name: "Metropolitan University — Digital Campus",
    vision:
      "One coherent, privacy-respecting digital platform for every student and staff interaction — admissions to alumni.",
    goals: [
      "Single sign-on across every campus service",
      "GDPR-compliant handling of student data (EU residency)",
      "Reversible, auditable decisions as the platform scales across faculties",
      "Zero unplanned downtime during enrolment and exam periods",
    ],
    architecture: [
      { id: "u1", name: "Campus API Gateway", type: "api", description: "Single entry point for web and mobile clients", dependencies: ["Identity Service"] },
      { id: "u2", name: "Identity Service", type: "service", description: "SSO, SAML/OIDC, role-based access", dependencies: ["Student Records DB"] },
      { id: "u3", name: "Enrolment Service", type: "service", description: "Course registration and timetabling", dependencies: ["Course Catalog DB", "Identity Service"] },
      { id: "u4", name: "Grading Service", type: "service", description: "Marks, transcripts, degree classification", dependencies: ["Student Records DB", "Identity Service"] },
      { id: "u5", name: "Library Service", type: "service", description: "Catalogue, loans, e-resources", dependencies: ["Library DB", "Identity Service"] },
      { id: "u6", name: "Payments Gateway", type: "integration", description: "Tuition and accommodation fees (Stripe)", dependencies: ["Finance DB"] },
      { id: "u7", name: "Notification Module", type: "module", description: "Email/SMS/push for deadlines and alerts", dependencies: ["Identity Service"] },
      { id: "u8", name: "Student Records DB", type: "database", description: "PostgreSQL — authoritative student data", dependencies: [] },
      { id: "u9", name: "Course Catalog DB", type: "database", description: "PostgreSQL — modules, prerequisites", dependencies: [] },
      { id: "u10", name: "Library DB", type: "database", description: "PostgreSQL — bibliographic + loans", dependencies: [] },
      { id: "u11", name: "Finance DB", type: "database", description: "PostgreSQL — fees and ledgers", dependencies: [] },
      { id: "u12", name: "Moodle LMS Integration", type: "integration", description: "Sync courses, rosters, grades to Moodle", dependencies: ["Identity Service", "Enrolment Service"] },
      { id: "u13", name: "UCAS Admissions Feed", type: "integration", description: "Nightly import of applicant records", dependencies: ["Student Records DB"] },
    ],
    institutionalMemory: [
      { id: "mem-1", title: "SSO standardised on SAML 2.0", content: "All services delegate auth to Identity Service; no local passwords.", source: "decision", createdAt: daysAgo(240) },
      { id: "mem-2", title: "EU data residency mandated", content: "Student PII must remain in EU regions for GDPR; rules out several US-only SaaS.", source: "decision", createdAt: daysAgo(180) },
      { id: "mem-3", title: "PostgreSQL as the system of record", content: "Chosen for ACID guarantees on grades and finance; NoSQL only for caches/search.", source: "decision", createdAt: daysAgo(150) },
      { id: "mem-4", title: "Legacy Student Portal deprecated", content: "The monolithic 'Student Portal' was retired; its features moved into domain services.", source: "decision", createdAt: daysAgo(90) },
    ],
    currentVersion: "3.2.0",
    createdBy: "mgr-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Decision-review panel ──────────────────────────────────────────────────

export const PANEL = {
  itHead: { id: "u-whitfield", name: "Dr. Alan Whitfield" },
  architect: { id: "u-nair", name: "Priya Nair" },
  security: { id: "u-chen", name: "Marcus Chen" },
  dpo: { id: "u-alvarez", name: "Sofia Alvarez" },
  backend: { id: "u-becker", name: "Tom Becker" },
} as const;

export interface SeedVote {
  user: { id: string; name: string };
  vote: VoteType;
  comment?: string;
}

export interface SeedProposal {
  title: string;
  description: string;
  author: { id: string; name: string };
  votes: SeedVote[];
  /** approve → manager accepts (opens a decision branch); check → tally, manager declines if expectStatus is rejected; leave → stay under review */
  finalize: "approve" | "check" | "leave";
  /** expected status after seeding — asserted by the test harness */
  expectStatus: string;
  note: string;
}

const P = PANEL;

export const UNIVERSITY_PROPOSALS: SeedProposal[] = [
  {
    title: "Migrate Identity Service to OAuth 2.0 / OpenID Connect",
    description:
      "Replace SAML 2.0 with OIDC across the Identity Service and Campus API Gateway to support mobile apps and third-party integrations.",
    author: P.architect,
    votes: [
      { user: P.itHead, vote: "approve" },
      { user: P.architect, vote: "approve" },
      { user: P.security, vote: "approve", comment: "Require PKCE for public clients." },
      { user: P.backend, vote: "approve" },
      { user: P.dpo, vote: "approve_with_comments", comment: "Document token retention." },
    ],
    finalize: "approve",
    expectStatus: "accepted",
    note: "Happy path — clear consensus; manager accepts and a decision branch opens.",
  },
  {
    title: "Replace PostgreSQL Student Records with MongoDB",
    description:
      "Move the Student Records DB to MongoDB for schema flexibility across faculties.",
    author: P.backend,
    votes: [
      { user: P.itHead, vote: "reject", comment: "Breaks ACID guarantees on grades." },
      { user: P.security, vote: "reject" },
      { user: P.dpo, vote: "reject", comment: "Conflicts with EU residency decision." },
      { user: P.architect, vote: "approve" },
    ],
    finalize: "check",
    expectStatus: "rejected",
    note: "Rejections outweigh approvals — must end rejected, no branch created.",
  },
  {
    title: "Deploy Facial-Recognition Attendance in Lecture Halls",
    description:
      "Use cameras + facial recognition to auto-record attendance and feed the Grading Service.",
    author: P.itHead,
    votes: [
      { user: P.itHead, vote: "approve" },
      { user: P.backend, vote: "approve" },
      { user: P.security, vote: "reject" },
      { user: P.dpo, vote: "needs_discussion", comment: "Biometric data = special category under GDPR." },
    ],
    finalize: "check",
    expectStatus: "needs_discussion",
    note: "A single needs_discussion vote must block approval regardless of majority.",
  },
  {
    title: "Split Grading Service into Independent Microservices",
    description:
      "Decompose the Grading Service into marks-entry, transcript, and classification services.",
    author: P.architect,
    votes: [
      { user: P.architect, vote: "approve" },
      { user: P.backend, vote: "approve" },
      { user: P.itHead, vote: "reject" },
      { user: P.security, vote: "reject" },
    ],
    finalize: "check",
    expectStatus: "consensus_pending",
    note: "Tied vote (2–2) must NOT auto-approve — stays pending for a tie-break.",
  },
  {
    title: "Migrate Identity Service authentication to OAuth (second attempt)",
    description:
      "A near-duplicate of the OIDC migration, filed by a different team unaware of the first.",
    author: P.backend,
    votes: [],
    finalize: "leave",
    expectStatus: "under_review",
    note: "Duplicate detection should flag this against the first proposal.",
  },
  {
    title: "Introduce Real-Time Campus Shuttle Tracking",
    description:
      "Add GPS tracking of campus shuttles surfaced through the Notification Module.",
    author: P.itHead,
    votes: [],
    finalize: "leave",
    expectStatus: "under_review",
    note: "Extra open proposal — pushes the open count past the drift-backlog threshold.",
  },
];

/**
 * A task that references a component ("Legacy Student Portal") which was
 * deprecated and removed from the brain. Seeded directly to simulate
 * implementation drift, which the Drift Detection agent must catch.
 */
export const DIVERGENT_TASK = {
  title: "Patch Legacy Student Portal login bug",
  description: "Hotfix carried over from the retired portal — no longer in the architecture.",
  affectedComponents: ["Legacy Student Portal"],
};
