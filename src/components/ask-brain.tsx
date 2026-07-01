"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";

// Live demo of the multi-provider LLM client via POST /api/llm.
export function AskBrain({ projectName, vision }: { projectName: string; vision: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [provider, setProvider] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || loading) return;
    setLoading(true);
    setError("");
    setAnswer("");
    setProvider("");

    try {
      const res = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `You are the Project Brain for "${projectName}". Vision: ${vision}. Answer engineering questions concisely (2-3 sentences).`,
          prompt: question,
          maxTokens: 300,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Request failed");
      } else {
        setAnswer(data.text);
        setProvider(data.provider);
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
        <CardDescription>
          Query institutional knowledge — powered by your configured LLM providers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={ask} className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What are the risks of migrating auth to OAuth 2.0?"
            className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <Button type="submit" disabled={loading || !question.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
          </Button>
        </form>

        {error && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-300">
            {error}
          </div>
        )}

        {answer && (
          <div className="animate-in rounded-lg border border-border/70 bg-background/40 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>
            {provider && (
              <div className="mt-3">
                <Badge variant="secondary" className="text-[10px]">
                  via {provider}
                </Badge>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
