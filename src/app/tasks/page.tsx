"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ImplementationTask, DecisionBranch, Proposal, ProjectBrain } from "@/lib/types";

export default function TasksPage() {
  const [tasks, setTasks] = useState<ImplementationTask[]>([]);
  const [branches, setBranches] = useState<DecisionBranch[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [projects, setProjects] = useState<ProjectBrain[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/tasks").then((r) => r.json()),
      fetch("/api/branches").then((r) => r.json()),
      fetch("/api/proposals").then((r) => r.json()),
      fetch("/api/project").then((r) => r.json()),
    ]).then(([tasksData, branchesData, proposalsData, projectsData]) => {
      setTasks(tasksData.tasks);
      setBranches(branchesData.branches.filter((b: DecisionBranch) => b.status === "implementing"));
      setProposals(proposalsData.proposals ?? []);
      setProjects(projectsData.projects ?? []);
    });
  }, []);

  const proposalTitle = (proposalId?: string) =>
    proposals.find((p) => p.id === proposalId)?.title ?? "Accepted suggestion";

  const projectName = (projectId?: string) => projects.find((p) => p.id === projectId)?.name ?? "Unknown project";

  const byBranch = branches.map((branch) => ({
    branch,
    tasks: tasks.filter((t) => t.branchId === branch.id),
  }));

  return (
    <AppShell>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Implementation</h1>
          <p className="text-sm text-muted-foreground">
            Tasks are generated from accepted suggestions when the manager starts implementation on a branch.
          </p>
        </div>

        {byBranch.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No active implementation. Manager must accept a suggestion, create a branch, then start implementation.
            </CardContent>
          </Card>
        ) : (
          byBranch.map(({ branch, tasks: branchTasks }) => (
            <Card key={branch.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base font-mono">{branch.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Project: {projectName(branch.projectId)}</p>
                  </div>
                  <Badge variant="warning">implementing</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {branchTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks yet.</p>
                ) : (
                  branchTasks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between rounded border border-border p-3 gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{t.title}</p>
                        <p className="text-xs text-primary/80 mt-0.5">From suggestion: {proposalTitle(t.proposalId)}</p>
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{t.description}</p>
                      </div>
                      <Badge
                        className="shrink-0"
                        variant={
                          t.status === "completed"
                            ? "success"
                            : t.status === "blocked"
                              ? "destructive"
                              : t.status === "cancelled"
                                ? "secondary"
                                : "warning"
                        }
                      >
                        {t.status}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppShell>
  );
}
