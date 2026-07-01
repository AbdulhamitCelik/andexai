"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ImplementationTask } from "@/lib/types";

export default function TasksPage() {
  const [tasks, setTasks] = useState<ImplementationTask[]>([]);

  useEffect(() => {
    fetch("/api/tasks").then((r) => r.json()).then((d) => setTasks(d.tasks));
  }, []);

  return (
    <AppShell>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Implementation Tasks</h1>
          <p className="text-sm text-muted-foreground">Agent 7 — Only affected tasks updated when new proposals arrive</p>
        </div>

        {tasks.length === 0 ? (
          <Card><CardContent className="p-6 text-sm text-muted-foreground">No tasks yet. Merge a decision to generate implementation work.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {tasks.map((t) => (
              <Card key={t.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-medium text-sm">{t.title}</h3>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                    {t.affectedComponents.length > 0 && (
                      <p className="mt-1 text-xs text-muted-foreground">Affects: {t.affectedComponents.join(", ")}</p>
                    )}
                  </div>
                  <Badge variant={t.status === "completed" ? "success" : t.status === "pending" ? "warning" : "secondary"}>
                    {t.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
