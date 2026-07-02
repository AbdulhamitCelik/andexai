"use client";

import type { EnterpriseReport } from "@/lib/types";
import { REPORT_SECTION_LABELS } from "@/lib/engines/report-framework";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EnterpriseReportView({ report }: { report: EnterpriseReport }) {
  const exportReport = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enterprise-report-${report.meta.entityId ?? "export"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="glass overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Enterprise Report
          </CardTitle>
          <p className="text-[10px] text-muted-foreground mt-1">
            {report.meta.generatedBy} · {new Date(report.meta.timestamp).toLocaleString()}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={exportReport}>
          <Download className="h-3 w-3 mr-1" /> Export
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm max-h-[480px] overflow-y-auto">
        <Section title={REPORT_SECTION_LABELS.executiveSummary} content={report.executiveSummary} highlight />
        {report.priorityScore != null && (
          <div className="flex gap-2">
            <Badge variant="success">Priority {report.priorityScore}</Badge>
            {report.confidenceScore != null && <Badge variant="secondary">Confidence {report.confidenceScore}</Badge>}
          </div>
        )}
        <Section title={REPORT_SECTION_LABELS.problemStatement} content={report.problemStatement} />
        {report.keyMetrics.length > 0 && (
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Key Metrics</h4>
            <div className="grid grid-cols-2 gap-2">
              {report.keyMetrics.map((m) => (
                <div key={m.label} className="rounded border border-border/50 p-2">
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  <p className="font-semibold">{m.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        <Section title={REPORT_SECTION_LABELS.businessImpact} content={report.businessImpact} />
        <Section title={REPORT_SECTION_LABELS.technicalImpact} content={report.technicalImpact} />
        <Section title={REPORT_SECTION_LABELS.customerImpact} content={report.customerImpact} />
        <Section title={REPORT_SECTION_LABELS.financialImpact} content={report.financialImpact} />
        {report.riskAssessment && (
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider mb-2">Risk ({report.riskAssessment.level})</h4>
            <ul className="list-disc pl-4 text-xs text-muted-foreground">
              {report.riskAssessment.items.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}
        <ListSection title={REPORT_SECTION_LABELS.pros} items={report.pros} />
        <ListSection title={REPORT_SECTION_LABELS.cons} items={report.cons} />
        <ListSection title={REPORT_SECTION_LABELS.recommendations} items={report.recommendations} />
        <ListSection title={REPORT_SECTION_LABELS.nextSteps} items={report.nextSteps} />
        {report.actionItems && report.actionItems.length > 0 && (
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-wider mb-2">Action Items</h4>
            {report.actionItems.map((a, i) => (
              <p key={i} className="text-xs border-b border-border/30 py-1">
                {a.action} {a.owner && `(${a.owner})`} {a.priority && `[${a.priority}]`}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Section({ title, content, highlight }: { title: string; content?: string; highlight?: boolean }) {
  if (!content) return null;
  return (
    <div>
      <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">{title}</h4>
      <p className={highlight ? "text-foreground font-medium" : "text-muted-foreground text-xs leading-relaxed"}>{content}</p>
    </div>
  );
}

function ListSection({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-1">{title}</h4>
      <ul className="list-disc pl-4 text-xs text-muted-foreground space-y-0.5">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
}
