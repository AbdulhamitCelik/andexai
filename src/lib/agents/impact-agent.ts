import { getTargetBrainForProposal, getTargetLabelForProposal } from "@/lib/agents/impact-helpers";
import { chat, LlmError } from "@/lib/llm";
import type { ImpactAnalysis, Proposal, StructuredImpactAnalysis } from "@/lib/types";
import { buildImpactAnalysisContext, formatContextForPrompt, mapSeverityToLegacy } from "@/lib/agents/impact-context";
import {
  extractJsonFromLlm,
  repairStructuredImpact,
  validateStructuredImpact,
  IMPACT_JSON_SCHEMA,
} from "@/lib/agents/impact-validator";
import { dbGetProposal, dbSaveProposal, dbSaveAgentLog } from "@/lib/db/repository";
import { asPlainText } from "@/lib/utils/text";
import { v4 as uuid } from "uuid";

export interface RunImpactAgentInput {
  proposalId: string;
  proposalText: string;
  projectId: string;
  userId?: string;
}

const SYSTEM_PROMPT = `You are the Impact Agent for an enterprise product decision platform.
Your job is to perform genuine engineering impact analysis — NOT generic templates.

Rules:
1. Base every claim on the provided Project Brain context and decision history.
2. Reference specific architecture components, prior accepted/rejected decisions, and active tasks by name when relevant.
3. Different proposals MUST produce different analyses tied to their unique scope.
4. Return ONLY valid JSON matching the schema — no markdown, no prose outside JSON.
5. Be evidence-based. If context is sparse, state assumptions explicitly in reasoning.
6. Never copy example placeholder text verbatim.`;

function buildUserPrompt(proposalText: string, contextJson: string): string {
  return `Analyze the impact of this proposal on the project.

PROPOSAL:
${proposalText}

PROJECT BRAIN + DECISION HISTORY + ACTIVE WORK (JSON):
${contextJson}

Return JSON matching this exact schema:
${IMPACT_JSON_SCHEMA}

Ensure proposalId in JSON matches the proposal being analyzed.
Reference actual component names from projectBrain.architecture.
Reference acceptedDecisions or rejectedAlternatives when historically relevant.`;
}

function structuredToLegacyImpact(structured: StructuredImpactAnalysis): Omit<ImpactAnalysis, "structured"> {
  const riskLevel = mapSeverityToLegacy(structured.overallImpact);

  const architectureImpact = structured.affectedComponents
    .filter((c) => c.impactType !== "none")
    .map((c) => ({
      target: c.component,
      severity: mapSeverityToLegacy(c.impactType),
      description: c.reason,
    }));

  const dependencyImpact = structured.dependencies.map((d) => ({
    target: d.dependency,
    severity: (d.blocking ? "high" : "medium") as "low" | "medium" | "high",
    description: `${d.type} dependency${d.blocking ? " (blocking)" : ""}`,
  }));

  const apiImpact = structured.affectedComponents
    .filter((c) => /api|integration|service/i.test(c.component))
    .map((c) => ({
      target: c.component,
      severity: mapSeverityToLegacy(c.impactType),
      description: c.reason,
    }));

  const { effortEstimate } = structured;
  const costEstimate = `${effortEstimate.tShirtSize} (${effortEstimate.estimatedDays} days, ~${effortEstimate.storyPoints} pts, ${effortEstimate.confidence} confidence)`;

  return {
    dependencyImpact,
    architectureImpact,
    apiImpact,
    taskImpact: structured.implementationNotes.slice(0, 5).map((note, i) => ({
      target: note.slice(0, 80),
      severity: "medium" as const,
      description: structured.implementationNotes[i] ?? note,
    })),
    costEstimate,
    riskLevel,
    summary: structured.summary,
  };
}

async function impactLog(
  action: string,
  detail: string,
  proposalId: string,
  output?: string
): Promise<void> {
  console.info(`[ImpactAgent] ${action}: ${detail}`);
  await dbSaveAgentLog({
    id: uuid(),
    agent: "impact",
    action,
    input: detail,
    output: output ?? detail,
    proposalId,
    timestamp: new Date().toISOString(),
  });
}

async function callLlmForImpact(
  proposalText: string,
  contextJson: string,
  repairHint?: string
): Promise<{ text: string; provider: string; model: string }> {
  const userContent = repairHint
    ? `${buildUserPrompt(proposalText, contextJson)}\n\nPREVIOUS OUTPUT WAS INVALID. Fix these issues and return corrected JSON only:\n${repairHint}`
    : buildUserPrompt(proposalText, contextJson);

  const result = await chat(
    [{ role: "user", content: userContent }],
    {
      system: SYSTEM_PROMPT,
      temperature: 0.25,
      maxTokens: 4096,
    }
  );
  return { text: result.text, provider: result.provider, model: result.model };
}

export async function runImpactAgent(input: RunImpactAgentInput): Promise<StructuredImpactAnalysis> {
  const { proposalId, proposalText, projectId, userId } = input;

  await impactLog("load_proposal", `Loading proposal ${proposalId} for project ${projectId}`, proposalId);

  const proposal = await dbGetProposal(proposalId);
  if (!proposal) throw new Error(`Proposal not found: ${proposalId}`);
  if (proposal.projectId !== projectId) throw new Error("proposalId does not belong to projectId");

  const targetBrain = await getTargetBrainForProposal(proposal);
  const targetLabel = await getTargetLabelForProposal(proposal);

  await impactLog("retrieve_brain", `Project Brain retrieved: "${targetBrain.name}" (${targetBrain.architecture.length} components)`, proposalId);

  const context = await buildImpactAnalysisContext(proposal, targetBrain, targetLabel);
  const contextJson = formatContextForPrompt(context);

  await impactLog(
    "retrieve_history",
    `Decision history: ${context.decisionHistory.acceptedDecisions.length} accepted, ${context.decisionHistory.rejectedAlternatives.length} rejected, ${context.activeTasks.length} active tasks`,
    proposalId
  );

  let rawText: string;
  let provider = "";
  let model = "";

  try {
    await impactLog("llm_call", `Calling LLM for impact reasoning${userId ? ` (requested by ${userId})` : ""}`, proposalId);
    const result = await callLlmForImpact(proposalText, contextJson);
    rawText = result.text;
    provider = result.provider;
    model = result.model;
    await impactLog("llm_response", `LLM responded via ${provider}/${model} (${rawText.length} chars)`, proposalId);
  } catch (err) {
    const msg = err instanceof LlmError ? err.message : err instanceof Error ? err.message : String(err);
    await impactLog("llm_failed", msg, proposalId);
    throw new Error(`Impact Agent requires LLM — analysis cannot proceed: ${msg}`);
  }

  let parsed: unknown;
  try {
    parsed = extractJsonFromLlm(rawText);
  } catch {
    await impactLog("parse_failed", "Malformed JSON from LLM — attempting repair call", proposalId);
    const repair = await callLlmForImpact(proposalText, contextJson, "Response was not valid JSON. Return only the JSON object.");
    provider = repair.provider;
    model = repair.model;
    rawText = repair.text;
    parsed = extractJsonFromLlm(rawText);
  }

  let { data: structured, repairs } = repairStructuredImpact(parsed, proposalId);
  if (repairs.length) {
    await impactLog("repair_applied", repairs.join("; "), proposalId);
  }

  let validation = validateStructuredImpact(structured);
  if (!validation.valid) {
    await impactLog("validation_failed", validation.errors.join("; "), proposalId);
    const repair = await callLlmForImpact(proposalText, contextJson, validation.errors.join("\n"));
    provider = repair.provider;
    model = repair.model;
    parsed = extractJsonFromLlm(repair.text);
    ({ data: structured, repairs } = repairStructuredImpact(parsed, proposalId));
    validation = validateStructuredImpact(structured);
    if (!validation.valid) {
      throw new Error(`Impact Agent produced invalid structured output: ${validation.errors.join("; ")}`);
    }
  }

  structured.generatedAt = new Date().toISOString();
  structured.llmProvider = provider;
  structured.llmModel = model;

  await impactLog(
    "analysis_complete",
    `Structured impact: overall=${structured.overallImpact}, recommendation=${structured.recommendation}`,
    proposalId,
    structured.summary
  );

  return structured;
}

export async function analyzeAndStoreImpact(
  proposal: Proposal,
  userId?: string
): Promise<ImpactAnalysis> {
  const structured = await runImpactAgent({
    proposalId: proposal.id,
    proposalText: `${asPlainText(proposal.title)}\n\n${asPlainText(proposal.description)}`,
    projectId: proposal.projectId,
    userId,
  });

  const legacy = structuredToLegacyImpact(structured);
  const impact: ImpactAnalysis = { structured, ...legacy };

  proposal.impact = impact;
  proposal.status = "impact_analyzed";
  proposal.updatedAt = new Date().toISOString();
  await dbSaveProposal(proposal);

  await impactLog("stored", `Impact analysis stored on proposal ${proposal.id}`, proposal.id, impact.summary);

  return impact;
}

export { structuredToLegacyImpact };
