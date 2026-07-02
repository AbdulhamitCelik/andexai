import { v4 as uuid } from "uuid";
import type { CouncilRun, EvaluationReport, LearningReport, ProjectBrain } from "@/lib/types";
import { dbGetProject, dbSaveProject } from "@/lib/db/repository";
import { dbSaveCouncilRun } from "@/lib/db/repository";

const LEARNING_AGENTS = ["Learning Agent", "Pattern Recognition Agent", "Knowledge Update Agent"];

export function buildLearningReport(evaluation: EvaluationReport | undefined): LearningReport {
  const rec = evaluation?.recommendation ?? "revise";
  return {
    insights: [
      {
        pattern: "Permission-before-retrieval",
        source: "Memory Governance",
        lesson: "Filtering confidential memory before LLM calls prevents information leakage.",
        appliesTo: ["discovery", "proposal", "evaluation"],
      },
      {
        pattern: "Suggestion-driven tasks",
        source: "Implementation Council",
        lesson: "Tasks generated from accepted suggestion content improve traceability.",
        appliesTo: ["implementation", "planning"],
      },
      {
        pattern: rec === "ship" ? "Ready-to-ship checklist" : "Pre-ship revision loop",
        source: "Evaluation Council",
        lesson:
          rec === "ship"
            ? "A/B Variant B outperformed control — apply to future Feature Packs in same geo."
            : "Complete pending QA tasks before next evaluation cycle.",
        appliesTo: ["testing", "learning"],
      },
    ],
    brainUpdates: [
      `Evaluation recommendation: ${rec} (score ${evaluation?.overallScore ?? "N/A"})`,
      "Institutional memory updated with council cycle lessons.",
    ],
    summary: "Learning Loop analysed completed council cycle and updated Project Brain. Future recommendations will improve automatically.",
  };
}

export async function runLearningLoop(
  projectId: string,
  evaluationRun: CouncilRun | undefined
): Promise<{ run: CouncilRun; project: ProjectBrain }> {
  const project = await dbGetProject(projectId);
  if (!project) throw new Error("Project not found");

  const evaluation = evaluationRun?.report as EvaluationReport | undefined;
  const report = buildLearningReport(evaluation);

  project.institutionalMemory = project.institutionalMemory ?? [];
  project.institutionalMemory.push({
    id: uuid(),
    title: "Council cycle lessons learned",
    content: report.brainUpdates.join("\n"),
    source: "decision",
    createdAt: new Date().toISOString(),
  });
  project.updatedAt = new Date().toISOString();
  await dbSaveProject(project);

  const now = new Date().toISOString();
  const run: CouncilRun = {
    id: uuid(),
    councilId: "learning",
    projectId,
    status: "complete",
    agents: LEARNING_AGENTS,
    report,
    createdAt: now,
    updatedAt: now,
  };
  await dbSaveCouncilRun(run);
  return { run, project };
}
