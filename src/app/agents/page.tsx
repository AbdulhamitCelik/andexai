"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import type { AgentLog } from "@/lib/types";
import { AGENT_COLORS, AGENT_SKILLS } from "@/lib/agents/skills";

export default function AgentsPage() {
  const [logs, setLogs] = useState<AgentLog[]>([]);

  useEffect(() => {
    fetch("/api/agents").then((r) => r.json()).then((d) => setLogs(d.logs ?? []));
  }, []);

  return (
    <AppShell>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Agent Activity Log</h1>
          <p className="text-sm text-muted-foreground">Transparent, auditable, explainable — every AI action recorded</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Agent Skill Sets</h2>
          <p className="text-sm text-muted-foreground">Each agent headline shows the set of supported skills below.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-6">
          {Object.entries(AGENT_SKILLS).map(([agent, config]) => (
            <div key={agent} className={`rounded-md px-3 py-2 text-xs font-medium ${AGENT_COLORS[agent] ?? "bg-secondary"}`}>
              {config.title}
            </div>
          ))}
        </div>

        <section className="space-y-8 mb-8">
          {Object.entries(AGENT_SKILLS).map(([agent, config]) => (
            <Card key={agent} className="border">
              <CardContent className="p-4">
                <h2 className="text-lg font-semibold">{config.title}</h2>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {config.skills.map((skill) => (
                    <li key={skill} className="list-disc pl-5">
                      {skill}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </section>

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
