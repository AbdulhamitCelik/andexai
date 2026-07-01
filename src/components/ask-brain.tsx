"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Shield } from "lucide-react";
import { useUser } from "@/lib/context/user-context";
import Link from "next/link";

/** Permission-governed Ask Brain — memory filtered BEFORE LLM retrieval */
export function AskBrain({ projectId }: { projectId: string; projectName?: string; vision?: string }) {
  const { currentUser } = useUser();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [provider, setProvider] = useState("");
  const [meta, setMeta] = useState<{ used: number; filtered: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading) return;
    setLoading(true);
    setError("");
    setAnswer("");
    setProvider("");
    setMeta(null);

    try {
      const res = await fetch("/api/memory/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          projectId,
          prompt: question,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? data.error ?? "Access Denied");
      } else {
        setAnswer(data.answer);
        setProvider(data.provider ?? "");
        setMeta({ used: data.memoriesUsed, filtered: data.memoriesFiltered });
      }
    } catch {
      setError("Network error — is the dev server running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Ask the Project Brain
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <Shield className="h-3.5 w-3.5" />
          Permission-filtered retrieval — only authorised memory reaches the LLM
          <Badge variant="secondary" className="text-[10px] capitalize">{currentUser.memoryRole}</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={ask} className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What are the leadership strategy notes?"
            className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <Button type="submit" disabled={loading || !question.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
          </Button>
        </form>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {answer && (
          <div className="animate-in rounded-lg border border-border/70 bg-background/40 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {provider && (
                <Badge variant="secondary" className="text-[10px]">via {provider}</Badge>
              )}
              {meta && (
                <Badge variant="secondary" className="text-[10px]">
                  {meta.used} memories authorised · {meta.filtered} filtered
                </Badge>
              )}
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground">
          View governance details on{" "}
          <Link href="/memory-governance" className="text-primary hover:underline">Memory Governance</Link>
        </p>
      </CardContent>
    </Card>
  );
}
