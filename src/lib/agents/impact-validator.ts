import type {
  StructuredImpactAnalysis,
  ImpactSeverity,
  ImpactLikelihood,
  DependencyType,
  TShirtSize,
  ImpactRecommendation,
} from "@/lib/types";

const IMPACT_SEVERITIES: ImpactSeverity[] = ["none", "low", "medium", "high", "critical"];
const LIKELIHOODS: ImpactLikelihood[] = ["low", "medium", "high"];
const DEP_TYPES: DependencyType[] = ["technical", "product", "team", "external"];
const T_SIZES: TShirtSize[] = ["XS", "S", "M", "L", "XL"];
const RECOMMENDATIONS: ImpactRecommendation[] = ["approve", "revise", "reject", "needs_discussion"];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  repaired?: StructuredImpactAnalysis;
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}

function asBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function asNumber(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => asString(x)).filter(Boolean);
}

function pickEnum<T extends string>(v: unknown, allowed: T[], fallback: T): T {
  const s = asString(v).toLowerCase();
  const hit = allowed.find((a) => a.toLowerCase() === s);
  return hit ?? fallback;
}

function pickTShirt(v: unknown): TShirtSize {
  const s = asString(v).toUpperCase();
  return T_SIZES.includes(s as TShirtSize) ? (s as TShirtSize) : "M";
}

export function extractJsonFromLlm(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("LLM response did not contain JSON object");
  return JSON.parse(raw.slice(start, end + 1));
}

export function repairStructuredImpact(
  raw: unknown,
  proposalId: string
): { data: StructuredImpactAnalysis; repairs: string[] } {
  const repairs: string[] = [];
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  if (!obj.proposalId) {
    obj.proposalId = proposalId;
    repairs.push("Set missing proposalId");
  }

  const affectedComponents = Array.isArray(obj.affectedComponents)
    ? obj.affectedComponents.map((item, i) => {
        const c = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        const impactType = pickEnum(c.impactType, IMPACT_SEVERITIES, "medium");
        if (!c.impactType) repairs.push(`affectedComponents[${i}].impactType defaulted`);
        return {
          component: asString(c.component, `Component ${i + 1}`),
          impactType,
          reason: asString(c.reason, "Impact reason not specified by model"),
          requiredChanges: asStringArray(c.requiredChanges),
        };
      })
    : [];
  if (!Array.isArray(obj.affectedComponents)) repairs.push("affectedComponents was missing — defaulted to []");

  const risks = Array.isArray(obj.risks)
    ? obj.risks.map((item, i) => {
        const r = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        return {
          risk: asString(r.risk, `Risk ${i + 1}`),
          severity: pickEnum(r.severity, IMPACT_SEVERITIES.filter((s) => s !== "none"), "medium"),
          likelihood: pickEnum(r.likelihood, LIKELIHOODS, "medium"),
          mitigation: asString(r.mitigation, "Define mitigation plan"),
        };
      })
    : [];
  if (!Array.isArray(obj.risks)) repairs.push("risks was missing — defaulted to []");

  const tradeOffs = Array.isArray(obj.tradeOffs)
    ? obj.tradeOffs.map((item, i) => {
        const t = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        return {
          benefit: asString(t.benefit, `Benefit ${i + 1}`),
          cost: asString(t.cost, `Cost ${i + 1}`),
          affectedStakeholders: asStringArray(t.affectedStakeholders),
        };
      })
    : [];
  if (!Array.isArray(obj.tradeOffs)) repairs.push("tradeOffs was missing — defaulted to []");

  const dependencies = Array.isArray(obj.dependencies)
    ? obj.dependencies.map((item, i) => {
        const d = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        return {
          dependency: asString(d.dependency, `Dependency ${i + 1}`),
          type: pickEnum(d.type, DEP_TYPES, "technical"),
          blocking: asBool(d.blocking, false),
        };
      })
    : [];
  if (!Array.isArray(obj.dependencies)) repairs.push("dependencies was missing — defaulted to []");

  const effortRaw =
    obj.effortEstimate && typeof obj.effortEstimate === "object"
      ? (obj.effortEstimate as Record<string, unknown>)
      : {};
  if (!obj.effortEstimate) repairs.push("effortEstimate was missing — defaulted");
  const effortEstimate = {
    tShirtSize: pickTShirt(effortRaw.tShirtSize),
    storyPoints: Math.max(1, asNumber(effortRaw.storyPoints, 5)),
    estimatedDays: Math.max(1, asNumber(effortRaw.estimatedDays, 5)),
    confidence: pickEnum(effortRaw.confidence, LIKELIHOODS, "medium"),
    reasoning: asString(effortRaw.reasoning, "Effort estimate requires team validation"),
  };

  const summary = asString(obj.summary);
  const reasoning = asString(obj.reasoning);

  const data: StructuredImpactAnalysis = {
    proposalId: asString(obj.proposalId, proposalId),
    summary: summary || reasoning.slice(0, 500) || "Impact analysis generated",
    affectedComponents,
    risks,
    tradeOffs,
    dependencies,
    effortEstimate,
    implementationNotes: asStringArray(obj.implementationNotes),
    testingRecommendations: asStringArray(obj.testingRecommendations),
    rollbackConsiderations: asStringArray(obj.rollbackConsiderations),
    overallImpact: pickEnum(obj.overallImpact, IMPACT_SEVERITIES.filter((s) => s !== "none"), "medium"),
    recommendation: pickEnum(obj.recommendation, RECOMMENDATIONS, "needs_discussion"),
    reasoning: reasoning || summary || "See affected components and risks for full reasoning",
  };

  return { data, repairs };
}

export function validateStructuredImpact(data: StructuredImpactAnalysis): ValidationResult {
  const errors: string[] = [];

  if (!data.proposalId) errors.push("proposalId is required");
  if (!data.summary || data.summary.length < 20) errors.push("summary must be at least 20 characters");
  if (!data.reasoning || data.reasoning.length < 20) errors.push("reasoning must be at least 20 characters");
  if (data.affectedComponents.length === 0) errors.push("affectedComponents must not be empty");
  if (data.risks.length === 0) errors.push("risks must not be empty");
  if (data.tradeOffs.length === 0) errors.push("tradeOffs must not be empty");
  if (!data.effortEstimate.reasoning) errors.push("effortEstimate.reasoning is required");

  for (const c of data.affectedComponents) {
    if (!c.component) errors.push("affectedComponents[].component required");
    if (!c.reason) errors.push(`affectedComponents[${c.component}].reason required`);
  }

  return { valid: errors.length === 0, errors };
}

export const IMPACT_JSON_SCHEMA = `{
  "proposalId": "string",
  "summary": "string",
  "affectedComponents": [{ "component": "string", "impactType": "none|low|medium|high|critical", "reason": "string", "requiredChanges": ["string"] }],
  "risks": [{ "risk": "string", "severity": "low|medium|high|critical", "likelihood": "low|medium|high", "mitigation": "string" }],
  "tradeOffs": [{ "benefit": "string", "cost": "string", "affectedStakeholders": ["string"] }],
  "dependencies": [{ "dependency": "string", "type": "technical|product|team|external", "blocking": true }],
  "effortEstimate": { "tShirtSize": "XS|S|M|L|XL", "storyPoints": number, "estimatedDays": number, "confidence": "low|medium|high", "reasoning": "string" },
  "implementationNotes": ["string"],
  "testingRecommendations": ["string"],
  "rollbackConsiderations": ["string"],
  "overallImpact": "low|medium|high|critical",
  "recommendation": "approve|revise|reject|needs_discussion",
  "reasoning": "string"
}`;
