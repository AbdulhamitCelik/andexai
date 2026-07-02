"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BEGINNER_STEPS } from "@/lib/shortcuts/registry";
import { useShortcuts } from "@/lib/context/shortcuts-context";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Sparkles, X } from "lucide-react";

const STORAGE_KEY = "andex-guide-dismissed";

export function BeginnerGuide() {
  const { guideOpen, setGuideOpen, setShortcutsOpen } = useShortcuts();

  if (!guideOpen) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setGuideOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setGuideOpen(false)} />
      <div className="relative w-full max-w-lg rounded-xl border border-border glass sakura-border shadow-2xl overflow-hidden animate-in">
        <div className="bg-gradient-to-r from-primary/20 via-rose-500/10 to-violet-500/10 px-6 py-5 border-b border-border/70">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/20 p-2">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-display text-lg font-light tracking-wide">Quick start guide</h2>
                <p className="text-xs text-muted-foreground">6 steps to demo the full product lifecycle</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setGuideOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ol className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {BEGINNER_STEPS.map((step) => (
            <li key={step.step} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {step.step}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                <Link
                  href={step.href}
                  className="inline-flex items-center gap-1 text-xs text-primary mt-1 hover:underline"
                  onClick={() => setGuideOpen(false)}
                >
                  Go there <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </li>
          ))}
        </ol>

        <div className="border-t border-border/70 px-6 py-4 flex flex-wrap gap-2 justify-between">
          <Button variant="outline" size="sm" onClick={() => { setGuideOpen(false); setShortcutsOpen(true); }}>
            <BookOpen className="h-3 w-3 mr-1" /> View shortcuts
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={dismiss}>Don&apos;t show again</Button>
            <Button size="sm" onClick={() => setGuideOpen(false)}>Got it</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Floating chip for first-time users */
export function BeginnerGuidePrompt() {
  const { setGuideOpen } = useShortcuts();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) !== "1") setShow(true);
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      onClick={() => setGuideOpen(true)}
      className="fixed bottom-20 right-6 z-[90] flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary shadow-lg backdrop-blur-md hover:bg-primary/20 transition-all animate-in sakura-glow"
    >
      <Sparkles className="h-4 w-4" />
      Quick start guide
    </button>
  );
}
