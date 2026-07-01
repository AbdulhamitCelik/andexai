"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import type { AgentLog } from "@/lib/types";

const AGENT_COLORS: Record<string, string> = {
  project_brain: "bg-purple-500/20 text-purple-400",
  proposal: "bg-blue-500/20 text-blue-400",
  impact: "bg-orange-500/20 text-orange-400",
  review: "bg-cyan-500/20 text-cyan-400",
  consensus: "bg-green-500/20 text-green-400",
  branch: "bg-pink-500/20 text-pink-400",
  implementation: "bg-yellow-500/20 text-yellow-400",
  communication: "bg-indigo-500/20 text-indigo-400",
  drift_detection: "bg-red-500/20 text-red-400",
};

export default function AgentsPage() {
  const [logs, setLogs] = useState<AgentLog[]>([]);

  useEffect(() => {
    fetch("/api/agents").then((r) => r.json()).then((d) => setLogs(d.logs));
  }, []);

  return (
    <AppShell>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Agent Activity Log</h1>
          <p className="text-sm text-muted-foreground">Transparent, auditable, explainable — every AI action recorded</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-6">
          {Object.entries(AGENT_COLORS).map(([agent, color]) => (
            <div key={agent} className={`rounded-md px-3 py-2 text-xs font-medium ${color}`}>
              {agent.replace(/_/g, " ")}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-medium ${AGENT_COLORS[log.agent] ?? "bg-secondary"}`}>
                    {log.agent.replace(/_/g, " ")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{log.action}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground truncate">In: {log.input}</p>
                    <p className="text-xs">{log.output}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
