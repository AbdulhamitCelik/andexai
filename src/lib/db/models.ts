import mongoose, { Schema, model, models } from "mongoose";
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

const ProjectSchema = new Schema<ProjectBrain>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: String,
    vision: String,
    goals: [String],
    functionalRequirements: [String],
    nonFunctionalRequirements: [String],
    architecture: [Schema.Types.Mixed],
    institutionalMemory: [Schema.Types.Mixed],
    currentVersion: String,
    createdBy: String,
    createdAt: String,
    updatedAt: String,
  },
  { collection: "projects" }
);

const ProposalSchema = new Schema<Proposal>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: String,
    description: String,
    authorId: String,
    authorName: String,
    status: String,
    targetType: String,
    targetProjectId: String,
    targetBranchId: String,
    projectId: { type: String, index: true },
    branchId: String,
    context: Schema.Types.Mixed,
    impact: Schema.Types.Mixed,
    review: Schema.Types.Mixed,
    votes: [Schema.Types.Mixed],
    managerDecision: String,
    managerNote: String,
    createdAt: String,
    updatedAt: String,
  },
  { collection: "proposals" }
);

const BranchSchema = new Schema<DecisionBranch>(
  {
    id: { type: String, required: true, unique: true, index: true },
    projectId: { type: String, index: true },
    name: String,
    seedProposalId: String,
    proposalTitle: String,
    status: String,
    version: String,
    mainVersionAtCreation: String,
    mergedBrain: Schema.Types.Mixed,
    acceptedProposalIds: [String],
    createdAt: String,
    implementingAt: String,
    mergedAt: String,
    discardedAt: String,
  },
  { collection: "branches" }
);

const TaskSchema = new Schema<ImplementationTask>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: String,
    description: String,
    status: String,
    branchId: { type: String, index: true },
    proposalId: String,
    affectedComponents: [String],
    assignee: String,
    createdAt: String,
    updatedAt: String,
  },
  { collection: "tasks" }
);

const AgentLogSchema = new Schema<AgentLog>(
  {
    id: { type: String, required: true, unique: true, index: true },
    agent: String,
    action: String,
    input: String,
    output: String,
    proposalId: String,
    timestamp: String,
  },
  { collection: "agent_logs" }
);

const DriftAlertSchema = new Schema<DriftAlert>(
  {
    id: { type: String, required: true, unique: true, index: true },
    projectId: { type: String, index: true },
    severity: String,
    source: String,
    description: String,
    recommendation: String,
    detectedAt: String,
  },
  { collection: "drift_alerts" }
);

const FeedbackItemSchema = new Schema<FeedbackItem>(
  {
    id: { type: String, required: true, unique: true, index: true },
    source: String,
    text: String,
    geo: String,
    sentiment: String,
    timestamp: String,
    userSegment: String,
    projectId: { type: String, index: true },
  },
  { collection: "feedback_items" }
);

const FeaturePackSchema = new Schema<FeaturePack>(
  {
    id: { type: String, required: true, unique: true, index: true },
    projectId: { type: String, index: true },
    title: String,
    summary: String,
    userProblem: String,
    suggestedFeature: String,
    evidenceCount: Number,
    topEvidenceQuotes: [String],
    geoInsights: [String],
    affectedUserSegments: [String],
    pros: [String],
    cons: [String],
    risks: [String],
    priorityScore: Number,
    confidenceScore: Number,
    estimatedImpact: String,
    status: String,
    feedbackIds: [String],
    promotedProposalId: String,
    createdAt: String,
    updatedAt: String,
  },
  { collection: "feature_packs" }
);

const GovernedMemorySchema = new Schema<GovernedMemoryRecord>(
  {
    id: { type: String, required: true, unique: true, index: true },
    resourceId: { type: String, index: true },
    resourceType: { type: String, index: true },
    title: String,
    content: String,
    permissions: Schema.Types.Mixed,
    lineage: Schema.Types.Mixed,
    createdAt: String,
    updatedAt: String,
  },
  { collection: "governed_memories" }
);

const PermissionAuditLogSchema = new Schema<PermissionAuditLog>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    userName: String,
    memoryRole: String,
    resourceId: String,
    resourceType: String,
    resourceTitle: String,
    action: String,
    granted: Boolean,
    reason: String,
    organisationId: String,
    projectId: { type: String, index: true },
    timestamp: String,
  },
  { collection: "permission_audit_logs" }
);

export const ProjectModel = models.Project ?? model<ProjectBrain>("Project", ProjectSchema);
export const ProposalModel = models.Proposal ?? model<Proposal>("Proposal", ProposalSchema);
export const BranchModel = models.Branch ?? model<DecisionBranch>("Branch", BranchSchema);
export const TaskModel = models.Task ?? model<ImplementationTask>("Task", TaskSchema);
export const AgentLogModel = models.AgentLog ?? model<AgentLog>("AgentLog", AgentLogSchema);
export const DriftAlertModel = models.DriftAlert ?? model<DriftAlert>("DriftAlert", DriftAlertSchema);
export const FeedbackItemModel = models.FeedbackItem ?? model<FeedbackItem>("FeedbackItem", FeedbackItemSchema);
export const FeaturePackModel = models.FeaturePack ?? model<FeaturePack>("FeaturePack", FeaturePackSchema);
export const GovernedMemoryModel =
  models.GovernedMemory ?? model<GovernedMemoryRecord>("GovernedMemory", GovernedMemorySchema);
export const PermissionAuditLogModel =
  models.PermissionAuditLog ?? model<PermissionAuditLog>("PermissionAuditLog", PermissionAuditLogSchema);

export const COLLECTIONS = [
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
] as const;
