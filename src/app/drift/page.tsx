"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DriftAlert } from "@/lib/types";
import { AlertTriangle } from "lucide-react";

export default function DriftPage() {
  const [alerts, setAlerts] = useState<DriftAlert[]>([]);
  const [scanning, setScanning] = useState(false);

  const load = () => fetch("/api/drift").then((r) => r.json()).then((d) => setAlerts(d.alerts));

  useEffect(() => { load(); }, []);

  const scan = async () => {
    setScanning(true);
    const res = await fetch("/api/drift", { method: "POST" });
    const data = await res.json();
    setAlerts(data.alerts);
    setScanning(false);
  };

  return (
    <AppShell>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Drift Detection</h1>
            <p className="text-sm text-muted-foreground">
              Optional Agent — compares Project Brain vs Implementation vs Documentation vs Conversations
            </p>
          </div>
          <Button onClick={scan} disabled={scanning}>
            {scanning ? "Scanning..." : "Run Drift Scan"}
          </Button>
        </div>

        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">What is Mental Model Drift?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            As engineers use different AI tools, prompts, and schedules, team understanding diverges from the
            approved project brain. Drift detection catches this before it becomes a production incident.
          </CardContent>
        </Card>

        {alerts.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <AlertTriangle className="h-5 w-5 text-emerald-400" />
              No drift detected. Team alignment looks healthy.
            </CardContent>
          </Card>
        ) : (
          alerts.map((a) => (
            <Card key={a.id} className={a.severity === "high" ? "border-red-500/30" : a.severity === "medium" ? "border-amber-500/30" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={a.severity === "high" ? "destructive" : a.severity === "medium" ? "warning" : "secondary"}>
                    {a.severity}
                  </Badge>
                  <Badge variant="secondary">{a.source}</Badge>
                </div>
                <p className="text-sm">{a.description}</p>
                <p className="mt-2 text-xs text-primary">Recommendation: {a.recommendation}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppShell>
  );
}
