"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/context/user-context";
import { TEAM_MEMBERS } from "@/lib/auth/team";
import type { AccessDecision, GovernedMemoryRecord, PermissionAuditLog, ProjectBrain } from "@/lib/types";
import { Shield, Lock, Unlock, GitBranch, RefreshCw, User } from "lucide-react";

const VISIBILITY_COLOR: Record<string, string> = {
  public: "bg-emerald-500/20 text-emerald-400",
  internal: "bg-blue-500/20 text-blue-400",
  confidential: "bg-amber-500/20 text-amber-400",
  leadership: "bg-red-500/20 text-red-400",
};

export default function MemoryGovernancePage() {
  const { currentUser, setCurrentUser } = useUser();
  const [projects, setProjects] = useState<ProjectBrain[]>([]);
  const [projectId, setProjectId] = useState("");
  const [accessible, setAccessible] = useState<GovernedMemoryRecord[]>([]);
  const [restricted, setRestricted] = useState<
    { id: string; title: string; resourceType: string; visibility: string; unlockAt?: string; lineage: string }[]
  >([]);
  const [decisions, setDecisions] = useState<AccessDecision[]>([]);
  const [auditLogs, setAuditLogs] = useState<PermissionAuditLog[]>([]);
  const [lineage, setLineage] = useState<
    { id: string; title: string; type: string; label: string; parent: string | null; visibility: string }[]
  >([]);
  const [stats, setStats] = useState({ total: 0, accessible: 0, restricted: 0 });
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = (uid = currentUser.id, pid = projectId) => {
    const q = new URLSearchParams({ userId: uid });
    if (pid) q.set("projectId", pid);
    fetch(`/api/governance?${q}`)
      .then((r) => r.json())
      .then((d) => {
        setProjects(d.projects ?? []);
        if (!pid && d.projects?.length) setProjectId(d.projects[0].id);
        setAccessible(d.accessible ?? []);
        setRestricted(d.restricted ?? []);
        setDecisions(d.decisions ?? []);
        setAuditLogs(d.auditLogs ?? []);
        setLineage(d.lineage ?? []);
        setStats(d.stats ?? { total: 0, accessible: 0, restricted: 0 });
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.id, projectId]);

  const sync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/governance", { method: "POST" });
      if (!res.ok) {
        alert("Sync failed");
        return;
      }
      load();
    } catch {
      alert("Sync failed — is the backend running?");
    } finally {
      setSyncing(false);
    }
  };

  const demoUsers = [
    TEAM_MEMBERS.find((m) => m.memoryRole === "manager")!,
    TEAM_MEMBERS.find((m) => m.memoryRole === "developer")!,
    TEAM_MEMBERS.find((m) => m.memoryRole === "intern")!,
  ];

  return (
    <AppShell>
      <div className="p-8 space-y-8 max-w-6xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary/80 mb-2">
              <Shield className="h-4 w-4" />
              BasedAI Enterprise Memory Governance
            </div>
            <h1 className="text-3xl font-bold">Memory Governance</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground text-sm">
              Permissions are deterministic — enforced in the database layer before any memory reaches an LLM.
              The AI never decides access.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={sync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
            Sync registry
          </Button>
        </div>

        {/* Demo role switcher */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" /> Demo: switch governance role
            </CardTitle>
            <CardDescription>Watch accessible vs restricted memories change instantly</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {demoUsers.map((u) => (
              <Button
                key={u.id}
                size="sm"
                variant={currentUser.id === u.id ? "default" : "outline"}
                onClick={() => setCurrentUser(u)}
              >
                {u.name} — {u.memoryRole}
              </Button>
            ))}
          </CardContent>
        </Card>

        {loadError && (
          <Card className="border-red-500/30">
            <CardContent className="p-4 text-sm text-red-400">
              Failed to load governance data — check that the backend is running, then refresh.
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Current user" value={currentUser.name} sub={currentUser.memoryRole} />
          <Stat label="Total memories" value={String(stats.total)} />
          <Stat label="Accessible" value={String(stats.accessible)} accent="emerald" />
          <Stat label="Restricted" value={String(stats.restricted)} accent="red" />
        </div>

        {projects.length > 0 && (
          <select
            className="rounded-md border border-border bg-background px-3 py-2 text-sm max-w-xs"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-emerald-400">
                <Unlock className="h-4 w-4" /> Accessible Memories ({accessible.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
              {accessible.length === 0 ? (
                <p className="text-sm text-muted-foreground">No accessible memories for this role.</p>
              ) : (
                accessible.map((m) => (
                  <MemoryRow key={m.id} title={m.title} type={m.resourceType} visibility={m.permissions.visibility} lineage={m.lineage.label} />
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-red-400">
                <Lock className="h-4 w-4" /> Restricted Memories ({restricted.length})
              </CardTitle>
              <CardDescription>Filtered out before AI retrieval — existence not leaked to LLM</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-80 overflow-y-auto">
              {restricted.map((m) => (
                <div key={m.id} className="rounded border border-red-500/20 p-2 text-sm">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{m.title}</span>
                    <Badge className={VISIBILITY_COLOR[m.visibility] ?? ""}>{m.visibility}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{m.lineage}</p>
                  {m.unlockAt && (
                    <p className="text-xs text-amber-400 mt-1">
                      Temporal lock until {new Date(m.unlockAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lineage Graph</CardTitle>
            <CardDescription>Derived memories inherit source permissions automatically</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 max-h-64 overflow-y-auto font-mono text-xs">
            {lineage.map((l) => (
              <div key={l.id} className="flex items-center gap-2 py-1 border-b border-border/40">
                <GitBranch className="h-3 w-3 shrink-0 text-primary/60" />
                <span className="text-muted-foreground">{l.label}</span>
                {l.parent && <span className="text-primary/70">← {l.parent}</span>}
                <Badge className={`ml-auto text-[9px] ${VISIBILITY_COLOR[l.visibility] ?? ""}`}>{l.visibility}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Access Decisions</CardTitle></CardHeader>
            <CardContent className="space-y-1 max-h-64 overflow-y-auto text-xs">
              {decisions.slice(0, 20).map((d, i) => (
                <div key={i} className="flex justify-between gap-2 py-1 border-b border-border/30">
                  <span className="truncate">{d.title}</span>
                  <Badge variant={d.granted ? "success" : "destructive"} className="shrink-0 text-[9px]">
                    {d.granted ? "granted" : "denied"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Permission Audit Log</CardTitle></CardHeader>
            <CardContent className="space-y-2 max-h-64 overflow-y-auto text-xs">
              {auditLogs.length === 0 ? (
                <p className="text-muted-foreground">No audit entries yet. Use Ask the Project Brain to generate logs.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="border-b border-border/30 pb-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{log.resourceTitle}</span>
                      <Badge variant={log.granted ? "success" : "destructive"} className="text-[9px]">
                        {log.granted ? "granted" : "denied"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">{log.reason}</p>
                    <p className="text-[10px] text-muted-foreground/70">
                      {log.userName} ({log.memoryRole}) · {log.action} · {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${accent === "emerald" ? "text-emerald-400" : accent === "red" ? "text-red-400" : ""}`}>
          {value}
        </p>
        {sub && <p className="text-xs capitalize text-primary/80">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function MemoryRow({
  title,
  type,
  visibility,
  lineage,
}: {
  title: string;
  type: string;
  visibility: string;
  lineage: string;
}) {
  return (
    <div className="rounded border border-border/60 p-2 text-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium">{title}</span>
        <Badge variant="secondary" className="text-[9px]">{type.replace(/_/g, " ")}</Badge>
        <Badge className={`text-[9px] ${VISIBILITY_COLOR[visibility] ?? ""}`}>{visibility}</Badge>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{lineage}</p>
    </div>
  );
}
