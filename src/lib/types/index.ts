// Andex AI — Core domain types
// GitHub version controls code. Andex version controls engineering decisions.

export type ProposalStatus =
  | "draft"
  | "context_gathered"
  | "impact_analyzed"
  | "under_review"
  | "consensus_pending"
  | "approved"
  | "rejected"
  | "needs_discussion"
  | "merged"
  | "archived";

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
  | "drift_detection";

export interface ProjectBrain {
  id: string;
  name: string;
  vision: string;
  goals: string[];
  architecture: ArchitectureNode[];
  institutionalMemory: MemoryEntry[];
  currentVersion: string;
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
  branchId?: string;
  context?: ProposalContext;
  impact?: ImpactAnalysis;
  review?: ReviewAnalysis;
  votes?: Vote[];
  managerApproved?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalContext {
  relatedDecisions: string[];
  relatedArchitecture: string[];
  duplicates: string[];
  summary: string;
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
  name: string;
  proposalId: string;
  parentBranchId?: string;
  version: string;
  merged: boolean;
  mergedAt?: string;
  snapshot: ProjectBrain;
  createdAt: string;
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
  severity: "low" | "medium" | "high";
  source: "brain" | "implementation" | "documentation" | "conversation";
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
