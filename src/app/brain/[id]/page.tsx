"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/context/user-context";
import type { ProjectBrain } from "@/lib/types";
import { ArrowLeft, Lock, Pencil } from "lucide-react";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isManager, currentUser } = useUser();
  const [project, setProject] = useState<ProjectBrain | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [vision, setVision] = useState("");
  const [goalsText, setGoalsText] = useState("");
  const [functionalText, setFunctionalText] = useState("");
  const [nonFunctionalText, setNonFunctionalText] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () =>
    fetch(`/api/project/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setProject(d.project);
        if (d.project) {
          setName(d.project.name);
          setVision(d.project.vision);
          setGoalsText(d.project.goals.join("\n"));
          setFunctionalText((d.project.functionalRequirements ?? []).join("\n"));
          setNonFunctionalText((d.project.nonFunctionalRequirements ?? []).join("\n"));
        }
      });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const goals = goalsText.split("\n").map((g) => g.trim()).filter(Boolean);
    const functionalRequirements = functionalText.split("\n").map((g) => g.trim()).filter(Boolean);
    const nonFunctionalRequirements = nonFunctionalText.split("\n").map((g) => g.trim()).filter(Boolean);
    await fetch("/api/project", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        managerId: currentUser.id,
        projectId: id,
        name,
        vision,
        goals,
        functionalRequirements,
        nonFunctionalRequirements,
      }),
    });
    setSaving(false);
    setEditing(false);
    load();
  };

  if (!project) {
    return <AppShell><div className="p-8">Loading...</div></AppShell>;
  }

  return (
    <AppShell>
      <div className="p-8 space-y-6 max-w-3xl">
        <Link href="/brain" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All projects
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <Badge className="mt-2">v{project.currentVersion}</Badge>
          </div>
          {isManager ? (
            <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>
              <Pencil className="mr-1 h-3 w-3" /> Edit
            </Button>
          ) : (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Lock className="h-3 w-3" /> View only
            </Badge>
          )}
        </div>

        {editing && isManager ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Edit Project (Manager only)</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={save} className="space-y-3">
                <input className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} required />
                <textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[100px]" value={vision} onChange={(e) => setVision(e.target.value)} required />
                <textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[60px]" value={goalsText} onChange={(e) => setGoalsText(e.target.value)} />
                <textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[60px]" placeholder="Functional requirements (one per line)" value={functionalText} onChange={(e) => setFunctionalText(e.target.value)} />
                <textarea className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[60px]" placeholder="Non-functional requirements (one per line)" value={nonFunctionalText} onChange={(e) => setNonFunctionalText(e.target.value)} />
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>Save</Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle>Brief</CardTitle>
                <CardDescription>The original idea — what we are building</CardDescription>
              </CardHeader>
              <CardContent><p className="text-sm">{project.vision}</p></CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Goals</CardTitle></CardHeader>
              <CardContent>
                <ul className="list-disc pl-5 text-sm space-y-1">{project.goals.map((g) => <li key={g}>{g}</li>)}</ul>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>Functional Requirements</CardTitle></CardHeader>
                <CardContent>
                  {(project.functionalRequirements ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">None defined</p>
                  ) : (
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {(project.functionalRequirements ?? []).map((r) => <li key={r}>{r}</li>)}
                    </ul>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Non-Functional Requirements</CardTitle></CardHeader>
                <CardContent>
                  {(project.nonFunctionalRequirements ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">None defined</p>
                  ) : (
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {(project.nonFunctionalRequirements ?? []).map((r) => <li key={r}>{r}</li>)}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <Link href={`/requirements?project=${id}`}>
              <Button variant="outline" size="sm">View all requirements</Button>
            </Link>
          </>
        )}

        <Link href={`/proposals?project=${id}`}>
          <Button>Add suggestion to this project</Button>
        </Link>
      </div>
    </AppShell>
  );
}
