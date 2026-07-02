"use client";

import type { CouncilRun, EnterpriseReport } from "@/lib/types";
import type { EvaluationReport, PlanningReport, TestingReport } from "@/lib/types";
import { EnterpriseReportView } from "@/components/intelligence/enterprise-report-view";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Gavel, FlaskConical, Calendar } from "lucide-react";

interface ProposalEnterpriseReportProps {
  report: EnterpriseReport;
  councilRuns: {
    planning?: CouncilRun;
    testing?: CouncilRun;
    evaluation?: CouncilRun;
  };
}

export function ProposalEnterpriseReport({ report, councilRuns }: ProposalEnterpriseReportProps) {
  const planning = councilRuns.planning?.report as PlanningReport | undefined;
  const testing = councilRuns.testing?.report as TestingReport | undefined;
  const evaluation = councilRuns.evaluation?.report as EvaluationReport | undefined;

  const recommended =
    evaluation?.recommendedDecision ??
    evaluation?.recommendation?.toUpperCase() ??
    report.recommendations?.[0] ??
    "REVIEW";

  return (
    <div className="space-y-4">
      <Card className="border-violet-500/30 bg-violet-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gavel className="h-4 w-4 text-violet-300" />
            Recommended Decision
          </CardTitle>
          <CardDescription>Unified enterprise intelligence — councils + engines</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Badge variant="success" className="text-sm px-3 py-1">
            {recommended}
          </Badge>
          {report.priorityScore != null && (
            <Badge variant="secondary">Priority {report.priorityScore}/100</Badge>
          )}
          {report.confidenceScore != null && (
            <Badge variant="secondary">Confidence {report.confidenceScore}%</Badge>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <CouncilOutcomeCard
          icon={Calendar}
          title="Planning Council"
          score={planning?.priorityScore}
          summary={planning?.summary}
          detail={report.timeline}
        />
        <CouncilOutcomeCard
          icon={FlaskConical}
          title="Testing Council"
          score={testing?.overallScore}
          summary={testing?.summary}
          detail={testing?.recommendation ? `Recommendation: ${testing.recommendation}` : undefined}
        />
        <CouncilOutcomeCard
          icon={FileText}
          title="Evaluation Council"
          score={evaluation?.overallHealth ?? evaluation?.overallScore}
          summary={evaluation?.executiveSummary}
          detail={evaluation?.timelineSummary}
        />
      </div>

      {report.resourceRequirements && report.resourceRequirements.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Resource Estimate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {report.resourceRequirements.slice(0, 5).map((r, i) => (
              <p key={i} className="text-xs text-muted-foreground">
                {r}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <EnterpriseReportView report={report} />
    </div>
  );
}

function CouncilOutcomeCard({
  icon: Icon,
  title,
  score,
  summary,
  detail,
}: {
  icon: typeof Calendar;
  title: string;
  score?: number;
  summary?: string;
  detail?: string;
}) {
  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {score != null && (
          <Badge variant="secondary" className="text-[10px]">
            Score {score}
          </Badge>
        )}
        <p className="text-xs text-muted-foreground line-clamp-3">{summary ?? "Pending"}</p>
        {detail && <p className="text-[10px] text-muted-foreground/80 line-clamp-2">{detail}</p>}
      </CardContent>
    </Card>
  );
}
