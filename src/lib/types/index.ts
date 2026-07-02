// Andex AI — Core domain types

export type UserRole = "manager" | "worker";

export type ProposalStatus =
  | "draft"
  | "context_gathered"
  | "impact_analyzed"
  | "under_review"
  | "consensus_pending"
  | "ready_for_manager"
  | "accepted"
  | "rejected"
  | "needs_discussion"
  | "archived";

export type BranchStatus = "open" | "implementing" | "merged_to_main" | "discarded";

export type ProposalTarget = "main" | "branch";

export type VoteType = "approve" | "reject" | "needs_discussion" | "approve_with_comments";

export type TaskStatus = "pending" | "in_progress" | "completed" | "blocked" | "cancelled";

export type AgentName =
  | "project_brain"
  | "proposal"
  | "impact"
  | "review"
  | "consensus"
  | "branch"
  | "implementation"
  | "communication"
  | "drift_detection"
  | "product_discovery";

export interface TeamMember {
  id: string;
  name: string;
  role: UserRole;
  /** Enterprise memory governance demo role (BasedAI model) */
  memoryRole: MemoryRole;
}

// ─── Enterprise Memory Governance (BasedAI) ──────────────────────────────────

export type MemoryRole = "manager" | "developer" | "intern";

export type MemoryVisibility = "public" | "internal" | "confidential" | "leadership";

export type MemoryResourceType =
  | "project_brain"
  | "institutional_memory"
  | "feature_pack"
  | "proposal"
  | "ai_summary"
  | "embedding"
  | "decision_branch"
  | "implementation_task"
  | "organisational_note";

export type PermissionAction = "read" | "write" | "query" | "promote";

export interface PermissionMetadata {
  organisationId: string;
  projectId: string;
  ownerId: string;
  visibility: MemoryVisibility;
  allowedRoles: MemoryRole[];
  allowedUserIds?: string[];
  sourceResourceId?: string;
  sourceResourceType?: MemoryResourceType;
  derivedFromIds?: string[];
  unlockAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  classification?: string;
}

export interface MemoryLineage {
  parentResourceId?: string;
  parentResourceType?: MemoryResourceType;
  derivedFromIds: string[];
  label: string;
}

export interface GovernedMemoryRecord {
  id: string;
  resourceId: string;
  resourceType: MemoryResourceType;
  title: string;
  content: string;
  permissions: PermissionMetadata;
  lineage: MemoryLineage;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionAuditLog {
  id: string;
  userId: string;
  userName: string;
  memoryRole: MemoryRole;
  resourceId: string;
  resourceType: MemoryResourceType;
  resourceTitle: string;
  action: PermissionAction;
  granted: boolean;
  reason: string;
  organisationId: string;
  projectId: string;
  timestamp: string;
}

export interface AccessDecision {
  resourceId: string;
  resourceType: MemoryResourceType;
  title: string;
  granted: boolean;
  reason: string;
  effectiveVisibility: MemoryVisibility;
}

export interface ProjectBrain {
  id: string;
  name: string;
  vision: string;
  goals: string[];
  functionalRequirements?: string[];
  nonFunctionalRequirements?: string[];
  architecture: ArchitectureNode[];
  institutionalMemory: MemoryEntry[];
  currentVersion: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArchitectureNode {
  id: string;
  name: string;
  type: "service" | "module" | "api" | "database" | "integration";
  description: string;
  dependencies: string[];
}

export interface MemoryEntry {
  id: string;
  title: string;
  content: string;
  source: "decision" | "proposal" | "manual";
  decisionId?: string;
  createdAt: string;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  status: ProposalStatus;
  /** What this suggestion adds to */
  targetType: ProposalTarget;
  /** Project when targeting main idea */
  targetProjectId?: string;
  targetBranchId?: string;
  projectId: string;
  branchId?: string;
  context?: ProposalContext;
  impact?: ImpactAnalysis;
  review?: ReviewAnalysis;
  votes?: Vote[];
  managerDecision?: "accepted" | "declined";
  managerNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalContext {
  relatedDecisions: string[];
  relatedArchitecture: string[];
  duplicates: string[];
  summary: string;
  targetLabel: string;
}

export interface ImpactAnalysis {
  dependencyImpact: ImpactItem[];
  architectureImpact: ImpactItem[];
  apiImpact: ImpactItem[];
  taskImpact: ImpactItem[];
  costEstimate: string;
  riskLevel: "low" | "medium" | "high";
  summary: string;
}

export interface ImpactItem {
  target: string;
  severity: "low" | "medium" | "high";
  description: string;
}

export interface ReviewAnalysis {
  pros: string[];
  cons: string[];
  risks: string[];
  tradeoffs: string[];
  questions: string[];
  suggestedReviewers: string[];
  /** AI-generated summary visible to all team members */
  teamSummary: string;
}

export interface Vote {
  userId: string;
  userName: string;
  vote: VoteType;
  comment?: string;
  createdAt: string;
}

export interface DecisionBranch {
  id: string;
  projectId: string;
  name: string;
  seedProposalId: string;
  proposalTitle: string;
  status: BranchStatus;
  version: string;
  mainVersionAtCreation: string;
  /** Main idea + all accepted suggestions on this branch */
  mergedBrain: ProjectBrain;
  acceptedProposalIds: string[];
  createdAt: string;
  implementingAt?: string;
  mergedAt?: string;
  discardedAt?: string;
}

export interface ImplementationTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  branchId: string;
  proposalId?: string;
  affectedComponents: string[];
  assignee?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentLog {
  id: string;
  agent: AgentName;
  action: string;
  input: string;
  output: string;
  proposalId?: string;
  timestamp: string;
}

export interface DriftAlert {
  id: string;
  projectId?: string;
  severity: "low" | "medium" | "high";
  source: "brain" | "implementation" | "documentation" | "conversation" | "backlog";
  description: string;
  recommendation: string;
  detectedAt: string;
}

export interface PipelineResult {
  proposal: Proposal;
  logs: AgentLog[];
  branch?: DecisionBranch;
  tasks?: ImplementationTask[];
}

// ─── Product Discovery ───────────────────────────────────────────────────────

export type FeedbackSentiment = "positive" | "neutral" | "negative";
export type FeedbackSource = "app_review" | "support_ticket" | "survey" | "social" | "analytics" | "interview";
export type FeaturePackStatus = "discovered" | "promoted" | "dismissed";
export type EstimatedImpact = "low" | "medium" | "high";

export interface FeedbackItem {
  id: string;
  source: FeedbackSource;
  text: string;
  geo?: string;
  sentiment: FeedbackSentiment;
  timestamp: string;
  userSegment: string;
  projectId?: string;
}

export interface FeaturePack {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  userProblem: string;
  suggestedFeature: string;
  evidenceCount: number;
  topEvidenceQuotes: string[];
  geoInsights: string[];
  affectedUserSegments: string[];
  pros: string[];
  cons: string[];
  risks: string[];
  priorityScore: number;
  confidenceScore: number;
  estimatedImpact: EstimatedImpact;
  status: FeaturePackStatus;
  feedbackIds: string[];
  promotedProposalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiscoveryResult {
  projectId: string;
  feedbackProcessed: number;
  featurePacks: FeaturePack[];
}
