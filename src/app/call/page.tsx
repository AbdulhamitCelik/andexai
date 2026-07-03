"use client";

import { AppShell } from "@/components/layout/app-shell";
import { VoiceAssistant } from "@/components/voice/voice-assistant";

export default function CallPage() {
  return (
    <AppShell>
      <div className="page-shell">
        <header>
          <p className="font-display mb-2 text-xs font-light tracking-[0.25em] uppercase text-rose-300/70">
            Team Andex
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="text-gradient">Voice</span> Assistant
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Talk to Andex in real time on the website — built-in browser voice, no phone number needed.
            Ask about anything you need to do.
          </p>
        </header>

        <VoiceAssistant />
      </div>
    </AppShell>
  );
}
