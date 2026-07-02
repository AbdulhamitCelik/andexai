"use client";

import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingState({ message = "Loading…", className, size = "md" }: LoadingStateProps) {
  const iconSize = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-10 w-10" : "h-6 w-6";

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 py-12", className)}>
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/10 sakura-glow">
          <Loader2 className={cn(iconSize, "animate-spin text-primary")} />
        </div>
      </div>
      <p className="text-sm text-muted-foreground animate-pulse tracking-wide">{message}</p>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-rose-400/60 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export function PageLoader({ message }: { message?: string }) {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <LoadingState message={message} size="lg" />
    </div>
  );
}
