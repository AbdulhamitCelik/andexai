import { connectDB } from "./mongodb";
import {
  ProjectModel,
  ProposalModel,
  BranchModel,
  TaskModel,
  AgentLogModel,
  DriftAlertModel,
  FeedbackItemModel,
  FeaturePackModel,
  GovernedMemoryModel,
  PermissionAuditLogModel,
} from "./models";
import type {
  AgentLog,
  DecisionBranch,
  DriftAlert,
  FeaturePack,
  FeedbackItem,
  GovernedMemoryRecord,
  ImplementationTask,
  PermissionAuditLog,
  ProjectBrain,
  Proposal,
} from "@/lib/types";

async function ensureDb() {
  await connectDB();
}

function lean<T>(doc: T | null): T | undefined {
  if (!doc) return undefined;
  return JSON.parse(JSON.stringify(doc)) as T;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function dbGetProjects(): Promise<ProjectBrain[]> {
  await ensureDb();
  const docs = await ProjectModel.find().sort({ createdAt: -1 }).lean();
  return docs as ProjectBrain[];
}

export async function dbGetProject(id: string): Promise<ProjectBrain | undefined> {
  await ensureDb();
  return lean(await ProjectModel.findOne({ id }).lean());
}

export async function dbSaveProject(project: ProjectBrain): Promise<ProjectBrain> {
  await ensureDb();
  await ProjectModel.findOneAndUpdate({ id: project.id }, project, { upsert: true, new: true });
  return project;
}

// ─── Proposals ───────────────────────────────────────────────────────────────

export async function dbGetProposals(filter?: { projectId?: string; branchId?: string }): Promise<Proposal[]> {
  await ensureDb();
  const q: Record<string, string> = {};
  if (filter?.projectId) q.projectId = filter.projectId;
  const docs = await ProposalModel.find(q).sort({ createdAt: -1 }).lean();
  let list = docs as Proposal[];
  if (filter?.branchId) {
    list = list.filter((p) => p.targetBranchId === filter.branchId || p.branchId === filter.branchId);
  }
  return list;
}

export async function dbGetProposal(id: string): Promise<Proposal | undefined> {
  await ensureDb();
  return lean(await ProposalModel.findOne({ id }).lean());
}

export async function dbSaveProposal(proposal: Proposal): Promise<Proposal> {
  await ensureDb();
  await ProposalModel.findOneAndUpdate({ id: proposal.id }, proposal, { upsert: true, new: true });
  return proposal;
}

// ─── Branches ────────────────────────────────────────────────────────────────

export async function dbGetBranches(): Promise<DecisionBranch[]> {
  await ensureDb();
  return (await BranchModel.find().lean()) as DecisionBranch[];
}

export async function dbGetBranch(id: string): Promise<DecisionBranch | undefined> {
  await ensureDb();
  return lean(await BranchModel.findOne({ id }).lean());
}

export async function dbSaveBranch(branch: DecisionBranch): Promise<DecisionBranch> {
  await ensureDb();
  await BranchModel.findOneAndUpdate({ id: branch.id }, branch, { upsert: true, new: true });
  return branch;
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export async function dbGetTasks(branchId?: string): Promise<ImplementationTask[]> {
  await ensureDb();
  const q = branchId ? { branchId } : {};
  return (await TaskModel.find(q).lean()) as ImplementationTask[];
}

export async function dbSaveTask(task: ImplementationTask): Promise<ImplementationTask> {
  await ensureDb();
  await TaskModel.findOneAndUpdate({ id: task.id }, task, { upsert: true, new: true });
  return task;
}

export async function dbSaveTasks(tasks: ImplementationTask[]): Promise<void> {
  await ensureDb();
  await Promise.all(tasks.map((t) => TaskModel.findOneAndUpdate({ id: t.id }, t, { upsert: true })));
}

// ─── Agent Logs ──────────────────────────────────────────────────────────────

export async function dbSaveAgentLog(entry: AgentLog): Promise<AgentLog> {
  await ensureDb();
  await AgentLogModel.findOneAndUpdate({ id: entry.id }, entry, { upsert: true, new: true });
  return entry;
}

export async function dbGetAgentLogs(): Promise<AgentLog[]> {
  await ensureDb();
  return (await AgentLogModel.find().sort({ timestamp: -1 }).lean()) as AgentLog[];
}

// ─── Drift Alerts ────────────────────────────────────────────────────────────

export async function dbSaveDriftAlerts(alerts: DriftAlert[]): Promise<void> {
  await ensureDb();
  await Promise.all(alerts.map((a) => DriftAlertModel.findOneAndUpdate({ id: a.id }, a, { upsert: true })));
}

export async function dbGetDriftAlerts(): Promise<DriftAlert[]> {
  await ensureDb();
  return (await DriftAlertModel.find().lean()) as DriftAlert[];
}

/** Remove a project's proposals, branches, tasks, and drift alerts (used to re-seed demos deterministically). */
export async function dbClearProjectData(projectId: string): Promise<void> {
  await ensureDb();
  const branches = (await BranchModel.find({ projectId }).lean()) as DecisionBranch[];
  const branchIds = branches.map((b) => b.id);
  await Promise.all([
    ProposalModel.deleteMany({ projectId }),
    BranchModel.deleteMany({ projectId }),
    branchIds.length ? TaskModel.deleteMany({ branchId: { $in: branchIds } }) : Promise.resolve(),
    DriftAlertModel.deleteMany({ projectId }),
  ]);
}

export async function dbInitCollections(): Promise<{ collections: string[]; message: string }> {
  await ensureDb();
  await Promise.all([
    ProjectModel.createIndexes(),
    ProposalModel.createIndexes(),
    BranchModel.createIndexes(),
    TaskModel.createIndexes(),
    AgentLogModel.createIndexes(),
    DriftAlertModel.createIndexes(),
    FeedbackItemModel.createIndexes(),
    FeaturePackModel.createIndexes(),
    GovernedMemoryModel.createIndexes(),
    PermissionAuditLogModel.createIndexes(),
  ]);
  return {
    collections: [
      "projects",
      "proposals",
      "branches",
      "tasks",
      "agent_logs",
      "drift_alerts",
      "feedback_items",
      "feature_packs",
      "governed_memories",
      "permission_audit_logs",
    ],
    message: "MongoDB collections and indexes ready",
  };
}

// ─── Feedback & Feature Packs ──────────────────────────────────────────────────

export async function dbSaveFeedbackItems(items: FeedbackItem[]): Promise<void> {
  await ensureDb();
  await Promise.all(
    items.map((item) => FeedbackItemModel.findOneAndUpdate({ id: item.id }, item, { upsert: true }))
  );
}

export async function dbGetFeedbackItems(projectId: string): Promise<FeedbackItem[]> {
  await ensureDb();
  return (await FeedbackItemModel.find({ projectId }).sort({ timestamp: -1 }).lean()) as FeedbackItem[];
}

export async function dbSaveFeaturePacks(packs: FeaturePack[]): Promise<void> {
  await ensureDb();
  await Promise.all(
    packs.map((pack) => FeaturePackModel.findOneAndUpdate({ id: pack.id }, pack, { upsert: true }))
  );
}

export async function dbGetFeaturePacks(projectId?: string): Promise<FeaturePack[]> {
  await ensureDb();
  const q = projectId ? { projectId } : {};
  return (await FeaturePackModel.find(q).sort({ priorityScore: -1 }).lean()) as FeaturePack[];
}

export async function dbGetFeaturePack(id: string): Promise<FeaturePack | undefined> {
  await ensureDb();
  return lean(await FeaturePackModel.findOne({ id }).lean());
}

export async function dbSaveFeaturePack(pack: FeaturePack): Promise<FeaturePack> {
  await ensureDb();
  await FeaturePackModel.findOneAndUpdate({ id: pack.id }, pack, { upsert: true, new: true });
  return pack;
}

export async function dbClearDiscoveryForProject(projectId: string): Promise<void> {
  await ensureDb();
  await Promise.all([
    FeedbackItemModel.deleteMany({ projectId }),
    FeaturePackModel.deleteMany({ projectId, status: "discovered" }),
  ]);
}

// ─── Governed Memory & Permission Audit ──────────────────────────────────────

export async function dbSaveGovernedMemories(records: GovernedMemoryRecord[]): Promise<void> {
  await ensureDb();
  await Promise.all(
    records.map((r) => GovernedMemoryModel.findOneAndUpdate({ id: r.id }, r, { upsert: true }))
  );
}

export async function dbGetGovernedMemories(projectId?: string): Promise<GovernedMemoryRecord[]> {
  await ensureDb();
  const q = projectId ? { "permissions.projectId": projectId } : {};
  return (await GovernedMemoryModel.find(q).lean()) as GovernedMemoryRecord[];
}

export async function dbSavePermissionAuditLogs(logs: PermissionAuditLog[]): Promise<void> {
  await ensureDb();
  if (!logs.length) return;
  await Promise.all(
    logs.map((l) => PermissionAuditLogModel.findOneAndUpdate({ id: l.id }, l, { upsert: true }))
  );
}

export async function dbGetPermissionAuditLogs(filter?: {
  userId?: string;
  projectId?: string;
  limit?: number;
}): Promise<PermissionAuditLog[]> {
  await ensureDb();
  const q: Record<string, string> = {};
  if (filter?.userId) q.userId = filter.userId;
  if (filter?.projectId) q.projectId = filter.projectId;
  const limit = filter?.limit ?? 100;
  return (await PermissionAuditLogModel.find(q).sort({ timestamp: -1 }).limit(limit).lean()) as PermissionAuditLog[];
}
