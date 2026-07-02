"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProjectBrain } from "@/lib/types";
import { ClipboardList } from "lucide-react";

export default function RequirementsPage() {
  return (
    <Suspense fallback={<AppShell><div className="p-8">Loading...</div></AppShell>}>
      <RequirementsContent />
    </Suspense>
  );
}

function RequirementsContent() {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<ProjectBrain[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch("/api/project")
      .then((r) => r.json())
      .then((d) => {
        const list: ProjectBrain[] = d.projects ?? [];
        setProjects(list);
        setLoadError(false);
        const fromQuery = searchParams.get("project");
        if (fromQuery && list.some((p) => p.id === fromQuery)) {
          setSelectedId(fromQuery);
        } else if (list.length) {
          setSelectedId((prev) => prev || list[0].id);
        }
      })
      .catch(() => setLoadError(true));
  }, [searchParams]);

  const project = projects.find((p) => p.id === selectedId);
  const functional = project?.functionalRequirements ?? [];
  const nonFunctional = project?.nonFunctionalRequirements ?? [];

  return (
    <AppShell>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Requirements
          </h1>
          <p className="text-sm text-muted-foreground">
            Functional and non-functional requirements for the selected project.
          </p>
        </div>

        {loadError ? (
          <Card className="border-red-500/30">
            <CardContent className="p-4 text-sm text-red-400">
              Failed to load requirements — check that the backend is running, then refresh.
            </CardContent>
          </Card>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No projects yet. Create a project with requirements on the Main Ideas page.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="max-w-md">
              <label className="text-xs text-muted-foreground block mb-1">Project</label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {project && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>v{project.currentVersion}</span>
                <Link href={`/brain/${project.id}`} className="text-primary hover:underline">
                  View project brief
                </Link>
              </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Functional Requirements</CardTitle>
                  <CardDescription>What the system must do</CardDescription>
                </CardHeader>
                <CardContent>
                  {functional.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No functional requirements defined yet.</p>
                  ) : (
                    <ul className="list-decimal pl-5 text-sm space-y-2">
                      {functional.map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Non-Functional Requirements</CardTitle>
                  <CardDescription>Quality attributes and constraints</CardDescription>
                </CardHeader>
                <CardContent>
                  {nonFunctional.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No non-functional requirements defined yet.</p>
                  ) : (
                    <ul className="list-decimal pl-5 text-sm space-y-2">
                      {nonFunctional.map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            {project && (
              <div className="flex gap-2">
                <Badge variant="secondary">{functional.length} functional</Badge>
                <Badge variant="secondary">{nonFunctional.length} non-functional</Badge>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
