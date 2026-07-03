"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/context/user-context";
import type { ProjectBrain } from "@/lib/types";
import { Plus, FolderOpen, Upload } from "lucide-react";

export default function BrainPage() {
  const { isManager, currentUser } = useUser();
  const [projects, setProjects] = useState<ProjectBrain[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [vision, setVision] = useState("");
  const [goalsText, setGoalsText] = useState("");
  const [functionalText, setFunctionalText] = useState("");
  const [nonFunctionalText, setNonFunctionalText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = () =>
    fetch("/api/project")
      .then((r) => r.json())
      .then((d) => {
        setProjects(d.projects ?? []);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));

  useEffect(() => {
    load();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("managerId", currentUser.id);
      const res = await fetch("/api/project/parse", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Failed to parse file");
        return;
      }
      const p = data.parsed ?? {};
      if (p.name) setName(p.name);
      if (p.vision) setVision(p.vision);
      if (p.goals?.length) setGoalsText(p.goals.join("\n"));
      if (p.functionalRequirements?.length) setFunctionalText(p.functionalRequirements.join("\n"));
      if (p.nonFunctionalRequirements?.length) setNonFunctionalText(p.nonFunctionalRequirements.join("\n"));
      setShowForm(true);
    } catch {
      alert("Failed to parse file — is the backend running?");
    } finally {
      setUploading(false);
    }
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const goals = goalsText.split("\n").map((g) => g.trim()).filter(Boolean);
      const functionalRequirements = functionalText.split("\n").map((g) => g.trim()).filter(Boolean);
      const nonFunctionalRequirements = nonFunctionalText.split("\n").map((g) => g.trim()).filter(Boolean);
      const res = await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          managerId: currentUser.id,
          name,
          vision,
          goals,
          functionalRequirements,
          nonFunctionalRequirements,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Failed to create project");
        return;
      }
      setShowForm(false);
      setName("");
      setVision("");
      setGoalsText("");
      setFunctionalText("");
      setNonFunctionalText("");
      load();
    } catch {
      alert("Failed to create project — is the backend running?");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="page-shell-tight">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Main Ideas</h1>
            <p className="text-sm text-muted-foreground">
              Original project briefs. All members can view and add suggestions. Only the manager can create or edit.
            </p>
          </div>
          {isManager && (
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="mr-2 h-4 w-4" /> New Project
            </Button>
          )}
        </div>

        {showForm && isManager && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create Project (Manager only)</CardTitle>
              <CardDescription>Upload a brief file to auto-fill fields, or enter manually</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:bg-accent/30">
                  <Upload className="h-4 w-4" />
                  {uploading ? "Parsing file..." : "Upload brief (.txt, .md, .json)"}
                  <input
                    type="file"
                    accept=".txt,.md,.json,.csv"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
              <form onSubmit={createProject} className="space-y-3">
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Project name (e.g. E-Commerce Platform)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <textarea
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[100px]"
                  placeholder="Brief — what are we building and why?"
                  value={vision}
                  onChange={(e) => setVision(e.target.value)}
                  required
                />
                <textarea
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[60px]"
                  placeholder="Goals (one per line, optional)"
                  value={goalsText}
                  onChange={(e) => setGoalsText(e.target.value)}
                />
                <textarea
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[60px]"
                  placeholder="Functional requirements (one per line, optional)"
                  value={functionalText}
                  onChange={(e) => setFunctionalText(e.target.value)}
                />
                <textarea
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[60px]"
                  placeholder="Non-functional requirements (one per line, optional)"
                  value={nonFunctionalText}
                  onChange={(e) => setNonFunctionalText(e.target.value)}
                />
                <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Project"}</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {loadError ? (
          <Card className="border-red-500/30">
            <CardContent className="p-4 text-sm text-red-400">
              Failed to load projects — check that the backend is running, then refresh.
            </CardContent>
          </Card>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              {isManager
                ? "No projects yet. Create the first main idea for your team."
                : "No projects yet. Ask your manager to create the project brief."}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((p) => (
              <Link key={p.id} href={`/brain/${p.id}`}>
                <Card className="hover:bg-accent/30 transition-colors cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-primary" />
                        {p.name}
                      </CardTitle>
                      <Badge>v{p.currentVersion}</Badge>
                    </div>
                    <CardDescription className="line-clamp-2">{p.vision}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">
                      {p.goals.length} goals · {(p.functionalRequirements?.length ?? 0) + (p.nonFunctionalRequirements?.length ?? 0)} requirements
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
