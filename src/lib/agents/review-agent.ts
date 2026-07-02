import { chat } from "@/lib/llm";
import { extractJsonFromLlm } from "@/lib/agents/impact-validator";
import { buildImpactAnalysisContext, formatContextForPrompt } from "@/lib/agents/impact-context";
import { getTargetBrainForProposal, getTargetLabelForProposal } from "@/lib/agents/impact-helpers";
import { dbSaveAgentLog } from "@/lib/db/repository";
import type { Proposal, ReviewAnalysis } from "@/lib/types";
import { asPlainText, asStringArray } from "@/lib/agents/review-validator";
import { v4 as uuid } from "uuid";

const SYSTEM_PROMPT = `You are the Review Agent for an enterprise product decision platform.
Given a proposal and its Impact Agent analysis, produce a team-facing review with pros, cons, risks, trade-offs, and open questions.

Rules:
1. Be specific to THIS proposal — no generic boilerplate.
2. Ground claims in the impact analysis and project context provided.
3. teamSummary must be 2-4 sentences readable by all team members.
4. Return ONLY valid JSON matching the schema — no markdown.`;

const REVIEW_JSON_SCHEMA = `{
  "pros": ["string — concrete benefits"],
  "cons": ["string — concrete costs or concerns"],
  "risks": ["string — risk with severity hint"],
  "tradeoffs": ["string — benefit vs cost pairs"],
  "questions": ["string — questions for the team before voting"],
  "suggestedReviewers": ["string — roles or names"],
  "teamSummary": "string — 2-4 sentence summary for all team members"
}`;

function buildDeterministicReview(proposal: Proposal): ReviewAnalysis {
  const structured = proposal.impact!.structured!;
  const pros = structured.tradeOffs.map((t) => t.benefit).filter(Boolean);
  if (pros.length === 0 && structured.summary) pros.push(structured.summary.slice(0, 120));

  const cons = structured.tradeOffs.map((t) => t.cost).filter(Boolean);
  const risks = structured.risks.map(
    (r) => `${r.risk} (severity: ${r.severity}, likelihood: ${r.likelihood}) — mitigation: ${r.mitigation}`
  );
  const tradeoffs = structured.tradeOffs.map(
    (t) =>
      `${t.benefit} ↔ ${t.cost}${t.affectedStakeholders.length ? ` [${t.affectedStakeholders.join(", ")}]` : ""}`
  );

  return {
    pros: pros.length ? pros : [`Addresses: ${asPlainText(proposal.title)}`],
    cons: cons.length ? cons : ["Scope and trade-offs require team discussion"],
    risks,
    tradeoffs: tradeoffs.length ? tradeoffs : structured.dependencies.map((d) => d.dependency),
    questions: [
      ...structured.implementationNotes.slice(0, 2).map((n) => `Implementation: ${n}`),
      ...structured.rollbackConsiderations.slice(0, 1).map((r) => `Rollback: ${r}`),
      `Does this align given recommendation "${structured.recommendation}"?`,
    ],
    suggestedReviewers: [
      ...new Set(structured.tradeOffs.flatMap((t) => t.affectedStakeholders).filter(Boolean)),
    ].slice(0, 5),
    teamSummary: `${structured.summary} Impact Agent recommendation: ${structured.recommendation.replace(/_/g, " ")}. ${structured.reasoning.slice(0, 280)}${structured.reasoning.length > 280 ? "…" : ""}`,
  };
}

function parseReviewJson(raw: unknown, proposal: Proposal): ReviewAnalysis {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const fallback = buildDeterministicReview(proposal);

  const teamSummary = asPlainText(obj.teamSummary, fallback.teamSummary);
  return {
    pros: asStringArray(obj.pros, fallback.pros),
    cons: asStringArray(obj.cons, fallback.cons),
    risks: asStringArray(obj.risks, fallback.risks),
    tradeoffs: asStringArray(obj.tradeoffs, fallback.tradeoffs),
    questions: asStringArray(obj.questions, fallback.questions),
    suggestedReviewers: asStringArray(obj.suggestedReviewers, fallback.suggestedReviewers),
    teamSummary: teamSummary.length >= 40 ? teamSummary : fallback.teamSummary,
  };
}

export async function runReviewAgent(proposal: Proposal): Promise<ReviewAnalysis> {
  if (!proposal.impact?.structured) {
    throw new Error("Review Agent requires structured impact analysis");
  }

  const targetBrain = await getTargetBrainForProposal(proposal);
  const targetLabel = await getTargetLabelForProposal(proposal);
  const context = await buildImpactAnalysisContext(proposal, targetBrain, targetLabel);
  const contextJson = formatContextForPrompt(context);
  const structured = proposal.impact.structured;

  const userPrompt = `Review this engineering proposal for the team.

PROPOSAL TITLE: ${asPlainText(proposal.title)}
PROPOSAL DESCRIPTION: ${asPlainText(proposal.description)}
TARGET: ${targetLabel}

IMPACT ANALYSIS SUMMARY:
${structured.summary}

IMPACT RECOMMENDATION: ${structured.recommendation}
OVERALL IMPACT: ${structured.overallImpact}

PROJECT CONTEXT (JSON):
${contextJson}

Return JSON matching:
${REVIEW_JSON_SCHEMA}`;

  const result = await chat([{ role: "user", content: userPrompt }], {
    system: SYSTEM_PROMPT,
    temperature: 0.3,
    maxTokens: 2048,
  });

  const parsed = extractJsonFromLlm(result.text);
  const review = parseReviewJson(parsed, proposal);

  await dbSaveAgentLog({
    id: uuid(),
    agent: "review",
    action: "generate",
    input: asPlainText(proposal.title),
    output: `${review.teamSummary.slice(0, 200)} [${result.provider}/${result.model}]`,
    proposalId: proposal.id,
    timestamp: new Date().toISOString(),
  });

  return review;
}

export { buildDeterministicReview };
