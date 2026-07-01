import { v4 as uuid } from "uuid";
import type {
  AgentLog,
  AgentName,
  DecisionBranch,
  DriftAlert,
  ImpactAnalysis,
  ImplementationTask,
  PipelineResult,
  ProjectBrain,
  Proposal,
  ProposalContext,
  ReviewAnalysis,
  Vote,
} from "@/lib/types";
import { universityBrain, UNIVERSITY_PROPOSALS, DIVERGENT_TASK } from "@/lib/fixtures/university";

// In-memory store for demo / when DATABASE_URL is unavailable on Vercel preview
class InMemoryStore {
  project: ProjectBrain | null = null;
  proposals: Proposal[] = [];
  branches: DecisionBranch[] = [];
  tasks: ImplementationTask[] = [];
  logs: AgentLog[] = [];
  driftAlerts: DriftAlert[] = [];

  reset(seed: ProjectBrain) {
    this.project = seed;
    this.proposals = [];
    this.branches = [];
    this.tasks = [];
    this.logs = [];
    this.driftAlerts = [];
  }
}

export const store = new InMemoryStore();

function log(
  agent: AgentName,
  action: string,
  input: string,
  output: string,
  proposalId?: string
): AgentLog {
  const entry: AgentLog = {
    id: uuid(),
    agent,
    action,
    input,
    output,
    proposalId,
    timestamp: new Date().toISOString(),
  };
  store.logs.push(entry);
  return entry;
}

// ─── Agent 1: Project Brain ───────────────────────────────────────────────

export function getProjectBrain(): ProjectBrain | null {
  return store.project;
}

export function updateProjectBrain(updates: Partial<ProjectBrain>): ProjectBrain {
  if (!store.project) throw new Error("Project not initialized");
  store.project = { ...store.project, ...updates, updatedAt: new Date().toISOString() };
  log("project_brain", "update", JSON.stringify(updates), "Project brain updated");
  return store.project;
}

// ─── Agent 2: Proposal Agent ──────────────────────────────────────────────

export function createProposal(
  title: string,
  description: string,
  authorId: string,
  authorName: string
): Proposal {
  const proposal: Proposal = {
    id: uuid(),
    title,
    description,
    authorId,
    authorName,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.proposals.push(proposal);
  log("proposal", "create", title, `Proposal created: ${proposal.id}`, proposal.id);
  return proposal;
}

export function gatherContext(proposal: Proposal): ProposalContext {
  const brain = store.project;
  const relatedDecisions = store.proposals
    .filter((p) => p.status === "merged" && p.id !== proposal.id)
    .slice(-5)
    .map((p) => `${p.title} (${p.id.slice(0, 8)})`);

  const keywords = proposal.description.toLowerCase().split(/\s+/);
  const relatedArchitecture =
    brain?.architecture
      .filter((a) => keywords.some((k) => a.name.toLowerCase().includes(k) || a.description.toLowerCase().includes(k)))
      .map((a) => a.name) ?? [];

  const duplicates = store.proposals
    .filter(
      (p) =>
        p.id !== proposal.id &&
        p.status !== "rejected" &&
        p.title.toLowerCase().includes(proposal.title.toLowerCase().slice(0, 10))
    )
    .map((p) => p.title);

  const context: ProposalContext = {
    relatedDecisions,
    relatedArchitecture,
    duplicates,
    summary: `Retrieved ${relatedDecisions.length} prior decisions and ${relatedArchitecture.length} architecture components relevant to "${proposal.title}".`,
  };

  proposal.context = context;
  proposal.status = "context_gathered";
  proposal.updatedAt = new Date().toISOString();
  log("proposal", "gather_context", proposal.title, context.summary, proposal.id);
  return context;
}

// ─── Agent 3: Impact Agent ────────────────────────────────────────────────

export function analyzeImpact(proposal: Proposal): ImpactAnalysis {
  const brain = store.project;
  const arch = brain?.architecture ?? [];

  const affected = arch.filter((a) =>
    proposal.description.toLowerCase().includes(a.name.toLowerCase()) ||
    proposal.title.toLowerCase().includes(a.type)
  );

  const dependencyImpact = affected.flatMap((a) =>
    a.dependencies.map((dep) => ({
      target: dep,
      severity: "medium" as const,
      description: `Dependency of ${a.name} may require updates`,
    }))
  );

  const architectureImpact = affected.map((a) => ({
    target: a.name,
    severity: "high" as const,
    description: `Direct architecture component affected by proposal`,
  }));

  const apiImpact = affected
    .filter((a) => a.type === "api")
    .map((a) => ({
      target: a.name,
      severity: "medium" as const,
      description: `API contract may need versioning`,
    }));

  const existingTasks = store.tasks.filter((t) => t.status !== "completed");
  const taskImpact = existingTasks.slice(0, 3).map((t) => ({
    target: t.title,
    severity: "low" as const,
    description: `Existing task may need scope adjustment`,
  }));

  const impact: ImpactAnalysis = {
    dependencyImpact,
    architectureImpact,
    apiImpact,
    taskImpact,
    costEstimate: affected.length > 2 ? "2-3 engineering weeks" : "3-5 engineering days",
    riskLevel: affected.length > 2 ? "high" : affected.length > 0 ? "medium" : "low",
    summary: `Impact analysis complete. ${affected.length} architecture components affected.`,
  };

  proposal.impact = impact;
  proposal.status = "impact_analyzed";
  proposal.updatedAt = new Date().toISOString();
  log("impact", "analyze", proposal.title, impact.summary, proposal.id);
  return impact;
}

// ─── Agent 4: Review Agent ──────────────────────────────────────────────────

export function generateReview(proposal: Proposal): ReviewAnalysis {
  const review: ReviewAnalysis = {
    pros: [
      `Addresses a clear engineering need: ${proposal.title}`,
      "Aligns with project vision and institutional knowledge",
      proposal.impact?.riskLevel === "low" ? "Low risk implementation path" : "Well-scoped change with manageable risk",
    ],
    cons: [
      proposal.impact?.riskLevel === "high" ? "High blast radius across multiple components" : "Requires coordination across team members",
      "Adds complexity to the current architecture",
    ],
    risks: [
      ...(proposal.impact?.dependencyImpact.length ? ["Downstream dependency breakage"] : []),
      "Team mental model may diverge during implementation",
      "Rollback complexity if consensus changes",
    ],
    tradeoffs: [
      "Speed of delivery vs. architectural purity",
      "Incremental change vs. comprehensive refactor",
    ],
    questions: [
      "Have all affected stakeholders been identified?",
      "Is there an existing decision that conflicts with this proposal?",
      "What is the rollback strategy if implementation fails?",
    ],
    suggestedReviewers: ["Tech Lead", "Backend Engineer", "Frontend Engineer", "Engineering Manager"],
  };

  proposal.review = review;
  proposal.status = "under_review";
  proposal.updatedAt = new Date().toISOString();
  log("review", "generate", proposal.title, `Generated ${review.pros.length} pros, ${review.cons.length} cons`, proposal.id);
  return review;
}

// ─── Agent 5: Consensus Agent ───────────────────────────────────────────────

export function castVote(
  proposalId: string,
  userId: string,
  userName: string,
  vote: Vote["vote"],
  comment?: string
): Proposal {
  const proposal = store.proposals.find((p) => p.id === proposalId);
  if (!proposal) throw new Error("Proposal not found");

  if (!proposal.votes) proposal.votes = [];
  const existing = proposal.votes.findIndex((v) => v.userId === userId);
  const voteEntry: Vote = { userId, userName, vote, comment, createdAt: new Date().toISOString() };

  if (existing >= 0) proposal.votes[existing] = voteEntry;
  else proposal.votes.push(voteEntry);

  proposal.status = "consensus_pending";
  proposal.updatedAt = new Date().toISOString();
  log("consensus", "vote", `${userName}: ${vote}`, comment ?? "", proposalId);
  return proposal;
}

export function checkConsensus(proposalId: string): Proposal {
  const proposal = store.proposals.find((p) => p.id === proposalId);
  if (!proposal?.votes?.length) throw new Error("No votes recorded");

  const approvals = proposal.votes.filter((v) => v.vote === "approve" || v.vote === "approve_with_comments").length;
  const rejections = proposal.votes.filter((v) => v.vote === "reject").length;
  const discussions = proposal.votes.filter((v) => v.vote === "needs_discussion").length;

  if (rejections > approvals) proposal.status = "rejected";
  else if (discussions > 0) proposal.status = "needs_discussion";
  else if (approvals >= Math.ceil(proposal.votes.length * 0.6)) proposal.status = "approved";
  else proposal.status = "consensus_pending";

  proposal.updatedAt = new Date().toISOString();
  log("consensus", "check", proposalId, `Status: ${proposal.status}`, proposalId);
  return proposal;
}

// ─── Agent 6: Branch Agent ──────────────────────────────────────────────────

export function createDecisionBranch(proposal: Proposal): DecisionBranch {
  const brain = store.project;
  if (!brain) throw new Error("Project brain not initialized");

  const versionParts = brain.currentVersion.split(".").map(Number);
  versionParts[2] += 1;
  const newVersion = versionParts.join(".");

  const branch: DecisionBranch = {
    id: uuid(),
    name: `decision/${proposal.title.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}`,
    proposalId: proposal.id,
    parentBranchId: store.branches.find((b) => b.merged)?.id,
    version: newVersion,
    merged: false,
    snapshot: JSON.parse(JSON.stringify(brain)),
    createdAt: new Date().toISOString(),
  };

  store.branches.push(branch);
  proposal.branchId = branch.id;
  proposal.updatedAt = new Date().toISOString();
  log("branch", "create", proposal.title, `Branch ${branch.name} at v${newVersion}`, proposal.id);
  return branch;
}

export function mergeDecisionBranch(branchId: string): DecisionBranch {
  const branch = store.branches.find((b) => b.id === branchId);
  if (!branch) throw new Error("Branch not found");

  branch.merged = true;
  branch.mergedAt = new Date().toISOString();

  const proposal = store.proposals.find((p) => p.id === branch.proposalId);
  if (proposal) {
    proposal.status = "merged";
    proposal.updatedAt = new Date().toISOString();
  }

  if (store.project) {
    store.project.currentVersion = branch.version;
    store.project.institutionalMemory.push({
      id: uuid(),
      title: proposal?.title ?? "Decision",
      content: proposal?.description ?? "",
      source: "decision",
      decisionId: branch.id,
      createdAt: new Date().toISOString(),
    });
    store.project.updatedAt = new Date().toISOString();
  }

  log("branch", "merge", branch.name, `Merged at v${branch.version}`, proposal?.id);
  return branch;
}

export function rollbackToBranch(branchId: string): ProjectBrain {
  const branch = store.branches.find((b) => b.id === branchId);
  if (!branch) throw new Error("Branch not found");

  store.project = JSON.parse(JSON.stringify(branch.snapshot));
  log("branch", "rollback", branch.name, `Rolled back to v${branch.version}`, branch.proposalId);
  return store.project!;
}

// ─── Agent 7: Implementation Agent ──────────────────────────────────────────

export function generateImplementationTasks(proposal: Proposal, branch: DecisionBranch): ImplementationTask[] {
  const affected = proposal.impact?.architectureImpact.map((i) => i.target) ?? [];
  const baseTasks = [
    { title: `Design: ${proposal.title}`, desc: "Create technical design document aligned with approved decision" },
    { title: `Implement: ${proposal.title}`, desc: "Core implementation work" },
    { title: `Test: ${proposal.title}`, desc: "Integration and regression testing" },
    { title: `Document: ${proposal.title}`, desc: "Update project brain and institutional memory" },
  ];

  const tasks: ImplementationTask[] = baseTasks.map((t) => ({
    id: uuid(),
    title: t.title,
    description: t.desc,
    status: "pending",
    branchId: branch.id,
    proposalId: proposal.id,
    affectedComponents: affected,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  store.tasks.push(...tasks);
  log("implementation", "generate_tasks", proposal.title, `Generated ${tasks.length} tasks`, proposal.id);
  return tasks;
}

export function updateAffectedTasks(proposal: Proposal): ImplementationTask[] {
  const affected = new Set(proposal.impact?.architectureImpact.map((i) => i.target) ?? []);
  const updated: ImplementationTask[] = [];

  for (const task of store.tasks) {
    const overlap = task.affectedComponents.some((c) => affected.has(c));
    if (overlap && task.status === "pending") {
      task.description += ` [Updated by proposal: ${proposal.title}]`;
      task.proposalId = proposal.id;
      task.updatedAt = new Date().toISOString();
      updated.push(task);
    }
  }

  log("implementation", "update_affected", proposal.title, `Updated ${updated.length} tasks (others unchanged)`, proposal.id);
  return updated;
}

// ─── Agent 8: Communication Agent ───────────────────────────────────────────

export function sendNotification(
  channel: "slack" | "discord" | "github" | "email",
  message: string,
  proposalId?: string
): void {
  log("communication", `notify_${channel}`, message, `Notification queued for ${channel}`, proposalId);
}

// ─── Optional: Drift Detection Agent ────────────────────────────────────────

export function detectDrift(): DriftAlert[] {
  const alerts: DriftAlert[] = [];
  const brain = store.project;
  if (!brain) return alerts;

  const pendingTasks = store.tasks.filter((t) => t.status === "pending");
  const brainComponents = new Set(brain.architecture.map((a) => a.name));

  for (const task of pendingTasks) {
    for (const comp of task.affectedComponents) {
      if (!brainComponents.has(comp)) {
        alerts.push({
          id: uuid(),
          severity: "medium",
          source: "implementation",
          description: `Task "${task.title}" references "${comp}" not in project brain`,
          recommendation: "Review architecture alignment or update project brain",
          detectedAt: new Date().toISOString(),
        });
      }
    }
  }

  const openProposals = store.proposals.filter((p) => !["merged", "rejected", "archived"].includes(p.status));
  if (openProposals.length > 3) {
    alerts.push({
      id: uuid(),
      severity: "low",
      source: "conversation",
      description: `${openProposals.length} open proposals may indicate diverging team priorities`,
      recommendation: "Schedule alignment session to resolve proposal backlog",
      detectedAt: new Date().toISOString(),
    });
  }

  store.driftAlerts.push(...alerts);
  if (alerts.length) log("drift_detection", "scan", "full_scan", `Detected ${alerts.length} drift signals`);
  return alerts;
}

// ─── Pipeline Orchestrator ──────────────────────────────────────────────────

export function runProposalPipeline(
  title: string,
  description: string,
  authorId: string,
  authorName: string
): PipelineResult {
  const proposal = createProposal(title, description, authorId, authorName);
  gatherContext(proposal);
  analyzeImpact(proposal);
  generateReview(proposal);
  sendNotification("slack", `New proposal ready for review: ${title}`, proposal.id);

  return { proposal, logs: store.logs.filter((l) => l.proposalId === proposal.id) };
}

export function runApprovalPipeline(proposalId: string): PipelineResult {
  const proposal = store.proposals.find((p) => p.id === proposalId);
  if (!proposal) throw new Error("Proposal not found");
  if (proposal.status !== "approved") throw new Error("Proposal not approved");

  const branch = createDecisionBranch(proposal);
  const tasks = generateImplementationTasks(proposal, branch);
  mergeDecisionBranch(branch.id);
  detectDrift();
  sendNotification("slack", `Decision merged: ${proposal.title} → v${branch.version}`, proposal.id);

  return { proposal, logs: store.logs.filter((l) => l.proposalId === proposalId), branch, tasks };
}

export function getProposals(): Proposal[] {
  return [...store.proposals].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getProposal(id: string): Proposal | undefined {
  return store.proposals.find((p) => p.id === id);
}

export function getBranches(): DecisionBranch[] {
  return [...store.branches];
}

export function getTasks(): ImplementationTask[] {
  return [...store.tasks];
}

export function getAgentLogs(): AgentLog[] {
  return [...store.logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getDriftAlerts(): DriftAlert[] {
  return [...store.driftAlerts];
}

export function seedProject(): ProjectBrain {
  const seed: ProjectBrain = {
    id: "proj-andex-demo",
    name: "E-Commerce Platform",
    vision: "Build a scalable, maintainable e-commerce platform with clear architectural boundaries",
    goals: [
      "Reduce time-to-market for new features",
      "Maintain shared team understanding of architecture",
      "Enable safe, reversible engineering decisions",
    ],
    architecture: [
      { id: "1", name: "API Gateway", type: "api", description: "Central API entry point", dependencies: ["Auth Service"] },
      { id: "2", name: "Auth Service", type: "service", description: "Authentication and authorization", dependencies: ["User DB"] },
      { id: "3", name: "Product Service", type: "service", description: "Product catalog management", dependencies: ["Product DB", "Search Service"] },
      { id: "4", name: "Order Service", type: "service", description: "Order processing and fulfillment", dependencies: ["Payment Service", "Inventory Service"] },
      { id: "5", name: "Payment Service", type: "integration", description: "Stripe payment integration", dependencies: [] },
      { id: "6", name: "User DB", type: "database", description: "PostgreSQL user data store", dependencies: [] },
      { id: "7", name: "Product DB", type: "database", description: "PostgreSQL product catalog", dependencies: [] },
      { id: "8", name: "Search Service", type: "module", description: "Elasticsearch product search", dependencies: [] },
    ],
    institutionalMemory: [
      {
        id: "mem-1",
        title: "Adopted microservices architecture",
        content: "Team decided to split monolith into domain-bounded services for independent scaling.",
        source: "decision",
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
      {
        id: "mem-2",
        title: "PostgreSQL as primary datastore",
        content: "Chose PostgreSQL over MongoDB for ACID compliance in order processing.",
        source: "decision",
        createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      },
    ],
    currentVersion: "1.0.0",
    updatedAt: new Date().toISOString(),
  };

  store.reset(seed);
  log("project_brain", "seed", "demo", "Demo project initialized");
  return seed;
}

// ─── Test organisation seed: Metropolitan University ────────────────────────
// Drives the real pipeline with a fixture that covers edge cases (rejected,
// needs-discussion, tied votes, duplicates, drift). See src/lib/fixtures.

export function seedUniversity(): ProjectBrain {
  store.reset(universityBrain());
  log("project_brain", "seed", "university", "Metropolitan University demo initialized");

  for (const spec of UNIVERSITY_PROPOSALS) {
    const { proposal } = runProposalPipeline(spec.title, spec.description, spec.author.id, spec.author.name);
    for (const v of spec.votes) {
      castVote(proposal.id, v.user.id, v.user.name, v.vote, v.comment);
    }
    if (spec.votes.length) checkConsensus(proposal.id);
    if (spec.finalize === "approve" && proposal.status === "approved") {
      proposal.managerApproved = true;
      runApprovalPipeline(proposal.id);
    }
  }

  // Simulate implementation drift: a pending task that references a component
  // which was removed from the brain (the retired "Legacy Student Portal").
  const branchId = store.branches.find((b) => b.merged)?.id ?? "orphan-branch";
  store.tasks.push({
    id: uuid(),
    title: DIVERGENT_TASK.title,
    description: DIVERGENT_TASK.description,
    status: "pending",
    branchId,
    affectedComponents: DIVERGENT_TASK.affectedComponents,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  detectDrift();
  return store.project!;
}
