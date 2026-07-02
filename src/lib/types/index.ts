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
  | "product_discovery"
  | "planning"
  | "testing"
  | "evaluation"
  | "learning";

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

/** LLM-generated structured impact analysis (Impact Agent output) */
export type ImpactSeverity = "none" | "low" | "medium" | "high" | "critical";
export type ImpactLikelihood = "low" | "medium" | "high";
export type DependencyType = "technical" | "product" | "team" | "external";
export type TShirtSize = "XS" | "S" | "M" | "L" | "XL";
export type ImpactRecommendation = "approve" | "revise" | "reject" | "needs_discussion";

export interface AffectedComponentImpact {
  component: string;
  impactType: ImpactSeverity;
  reason: string;
  requiredChanges: string[];
}

export interface ImpactRisk {
  risk: string;
  severity: ImpactSeverity;
  likelihood: ImpactLikelihood;
  mitigation: string;
}

export interface ImpactTradeOff {
  benefit: string;
  cost: string;
  affectedStakeholders: string[];
}

export interface ImpactDependency {
  dependency: string;
  type: DependencyType;
  blocking: boolean;
}

export interface EffortEstimate {
  tShirtSize: TShirtSize;
  storyPoints: number;
  estimatedDays: number;
  confidence: ImpactLikelihood;
  reasoning: string;
}

export interface StructuredImpactAnalysis {
  proposalId: string;
  summary: string;
  affectedComponents: AffectedComponentImpact[];
  risks: ImpactRisk[];
  tradeOffs: ImpactTradeOff[];
  dependencies: ImpactDependency[];
  effortEstimate: EffortEstimate;
  implementationNotes: string[];
  testingRecommendations: string[];
  rollbackConsiderations: string[];
  overallImpact: ImpactSeverity;
  recommendation: ImpactRecommendation;
  reasoning: string;
  /** Set after LLM call */
  generatedAt?: string;
  llmProvider?: string;
  llmModel?: string;
}

export interface ImpactAnalysis {
  /** Full LLM-generated structured analysis */
  structured?: StructuredImpactAnalysis;
  /** Legacy fields derived from structured analysis for downstream agents */
  dependencyImpact: ImpactItem[];
  architectureImpact: ImpactItem[];
  apiImpact: ImpactItem[];
  taskImpact: ImpactItem[];
  costEstimate: string;
  riskLevel: "low" | "medium" | "high";
  summary: string;
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

// ─── AI Councils (Product Operating System) ──────────────────────────────────

export type CouncilId =
  | "discovery"
  | "proposal"
  | "approval"
  | "planning"
  | "implementation"
  | "testing"
  | "evaluation"
  | "learning";

export type CouncilRunStatus = "idle" | "running" | "complete";

export interface SprintPlan {
  name: string;
  focus: string;
  items: string[];
  weekStart: number;
}

export interface PlanningReport {
  complexity: "low" | "medium" | "high";
  businessValueScore: number;
  estimatedDurationWeeks: number;
  deadlineRisk: "low" | "medium" | "high";
  requiredSkills: string[];
  sprints: SprintPlan[];
  milestones: { name: string; week: number }[];
  criticalPath: string[];
  dependencies: string[];
  ownerRecommendations: { role: string; assignee: string; rationale: string }[];
  summary: string;
  /** Enterprise extensions */
  priorityScore?: number;
  confidenceScore?: number;
  riskScore?: number;
  estimatedCost?: string;
  requiredTeams?: string[];
  timeline?: TimelineEngineOutput;
  resources?: ResourceEngineOutput;
  enterprise?: EnterpriseReport;
}

export interface AbVariantResult {
  variant: string;
  conversion: number;
  retention: number;
  satisfaction: number;
  performance: number;
  failureRate: number;
}

export interface TestingReport {
  customerSimulation: {
    customer: string;
    powerUser: string;
    accessibility: string;
    international: string;
    mobile: string;
    enterprise: string;
  };
  technical: {
    qa: string;
    regression: string;
    performance: string;
    security: string;
    reliability: string;
  };
  abTesting: {
    recommendation: string;
    winner: string;
    variants: AbVariantResult[];
  };
  overallReadiness: "not_ready" | "needs_work" | "ready";
  summary: string;
  /** Enterprise board-ready testing report */
  overallScore?: number;
  customerSatisfaction?: number;
  abWinner?: string;
  performanceScore?: number;
  securityScore?: number;
  accessibilityScore?: number;
  reliabilityScore?: number;
  regressionStatus?: string;
  bugSummary?: string[];
  knownIssues?: string[];
  deploymentRisk?: "low" | "medium" | "high";
  recommendation?: "ship" | "revise" | "rollback";
  enterprise?: EnterpriseReport;
}

export interface EvaluationReport {
  overallScore: number;
  customerSatisfaction: number;
  technicalHealth: number;
  security: number;
  performance: number;
  accessibility: number;
  businessValue: number;
  recommendation: "ship" | "revise" | "rollback" | "archive";
  executiveSummary: string;
  evidence: string[];
  /** Enterprise CTO/Board report */
  overallHealth?: number;
  businessHealth?: number;
  engineeringHealth?: number;
  productHealth?: number;
  customerHealth?: number;
  deliveryHealth?: number;
  riskSummary?: string[];
  timelineSummary?: string;
  budgetSummary?: string;
  recommendedDecision?: string;
  approvalConfidence?: number;
  futureRecommendations?: string[];
  enterprise?: EnterpriseReport;
}

export interface LearningInsight {
  pattern: string;
  source: string;
  lesson: string;
  appliesTo: string[];
}

export interface LearningReport {
  insights: LearningInsight[];
  brainUpdates: string[];
  summary: string;
}

export interface CouncilRun {
  id: string;
  councilId: CouncilId;
  projectId: string;
  branchId?: string;
  proposalId?: string;
  status: CouncilRunStatus;
  agents: string[];
  report: PlanningReport | TestingReport | EvaluationReport | LearningReport | Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LifecyclePhaseState {
  id: CouncilId;
  label: string;
  status: "complete" | "active" | "pending" | "locked";
  agents: string[];
  summary?: string;
  reportId?: string;
}

// ─── Enterprise Decision Intelligence ─────────────────────────────────────────

export type PriorityEntityType =
  | "project"
  | "feature_pack"
  | "feedback"
  | "proposal"
  | "branch"
  | "task"
  | "sprint"
  | "milestone"
  | "testing_report"
  | "risk"
  | "learning"
  | "knowledge";

export type PriorityDimensionKey =
  | "businessValue"
  | "customerImpact"
  | "revenueImpact"
  | "userDemand"
  | "supportingRequests"
  | "customerSentiment"
  | "strategicAlignment"
  | "urgency"
  | "complexity"
  | "estimatedEffort"
  | "dependencies"
  | "technicalRisk"
  | "securityRisk"
  | "businessRisk"
  | "resourceAvailability"
  | "estimatedRoi"
  | "confidence"
  | "historicalSuccess";

export interface PriorityDimension {
  key: PriorityDimensionKey;
  label: string;
  score: number;
  weight: number;
  weightedContribution: number;
  reasoning: string;
}

export interface PriorityScoreRecord {
  id: string;
  entityType: PriorityEntityType;
  entityId: string;
  projectId: string;
  title: string;
  overallScore: number;
  confidenceScore: number;
  riskScore: number;
  businessValue: number;
  complexity: number;
  dimensions: PriorityDimension[];
  summary: string;
  recommendedAction: string;
  reasoning: string[];
  supportingEvidence: string[];
  updatedAt: string;
}

export interface EnterpriseReportMeta {
  generatedBy: string;
  timestamp: string;
  councilId?: CouncilId;
  entityId?: string;
  entityTitle?: string;
}

export interface EnterpriseReport {
  meta: EnterpriseReportMeta;
  executiveSummary: string;
  problemStatement?: string;
  objectives?: string[];
  currentSituation?: string;
  supportingEvidence: string[];
  keyMetrics: { label: string; value: string | number }[];
  businessImpact?: string;
  technicalImpact?: string;
  financialImpact?: string;
  customerImpact?: string;
  riskAssessment?: { level: "low" | "medium" | "high"; items: string[] };
  dependencies?: string[];
  complexityAssessment?: string;
  timeline?: string;
  resourceRequirements?: string[];
  priorityScore?: number;
  confidenceScore?: number;
  alternativeSolutions?: string[];
  pros?: string[];
  cons?: string[];
  tradeoffs?: string[];
  recommendations?: string[];
  actionItems?: { action: string; owner?: string; priority?: string }[];
  successMetrics?: string[];
  kpis?: { name: string; target: string }[];
  approvalStatus?: string;
  nextSteps?: string[];
  supportingSources?: string[];
}

export interface RoadmapEntry {
  rank: number;
  entityId: string;
  title: string;
  businessPriority: number;
  riskLevel: "low" | "medium" | "high";
  estimatedDurationWeeks: number;
  estimatedCost: string;
  requiredSkills: string[];
  requiredTeams: string[];
  roadmapPosition: number;
  recommendedOrder: number;
  dependencies: string[];
}

export interface TimelineEngineOutput {
  roadmap: RoadmapEntry[];
  sprints: SprintPlan[];
  milestones: { name: string; week: number; priority: number }[];
  criticalPath: string[];
  dependencyGraph: { from: string; to: string; type: string }[];
  deliveryForecast: string;
  releaseForecast: string;
  delayPredictions: string[];
  timelineRisk: "low" | "medium" | "high";
  summary: string;
}

export interface ResourceAllocation {
  role: string;
  assignee: string;
  assigneeId: string;
  workloadPercent: number;
  skills: string[];
  rationale: string;
}

export interface ResourceEngineOutput {
  allocations: ResourceAllocation[];
  bottlenecks: string[];
  velocityEstimate: string;
  completionForecast: string;
  sprintAdjustments: string[];
  summary: string;
}

export interface DecisionComparison {
  entityId: string;
  title: string;
  score: number;
  shouldPrioritize: boolean;
  reasoning: string[];
  delayImpact?: string;
  blockedItems?: string[];
  affectedCustomers?: string[];
  revenueImpact?: string;
  engineeringImpact?: string;
}

export interface DecisionIntelligenceReport {
  prioritize: DecisionComparison;
  defer: DecisionComparison[];
  summary: string;
  generatedAt: string;
}

export interface BrainRankingEntry {
  entityType: PriorityEntityType;
  entityId: string;
  title: string;
  score: number;
  reasoning: string;
}

export interface ProjectBrainRankings {
  projectId: string;
  topPriorities: BrainRankingEntry[];
  whatMattersNow: string;
  why: string;
  nextAction: string;
  updatedAt: string;
}
