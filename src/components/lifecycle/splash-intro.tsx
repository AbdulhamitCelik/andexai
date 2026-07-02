"use client";

import { useEffect, useState } from "react";

const PETALS = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  left: `${(i * 17 + 5) % 100}%`,
  delay: `${(i * 0.35) % 4}s`,
  duration: `${4 + (i % 5)}s`,
  size: 8 + (i % 4) * 3,
}));

export function SplashIntro() {
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = sessionStorage.getItem("andex-splash-seen");
    if (seen) return;

    setVisible(true);
    const fadeTimer = setTimeout(() => setFadeOut(true), 3200);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem("andex-splash-seen", "1");
    }, 4200);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`splash-overlay fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-1000 ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-hidden
    >
      <div className="splash-ink absolute inset-0" />
      {PETALS.map((p) => (
        <span
          key={p.id}
          className="sakura-petal absolute rounded-full"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6">
        <p className="font-display text-sm font-light tracking-[0.35em] uppercase text-rose-200/80 mb-4 animate-splash-rise">
          The product journey
        </p>
        <h1 className="font-display text-5xl md:text-7xl font-light text-white/95 mb-3 animate-splash-rise splash-delay-1">
          Andex AI
        </h1>
        <p className="font-display text-xl md:text-2xl font-light text-white/60 tracking-wide animate-splash-rise splash-delay-2">
          Councils guide the path of product
        </p>
        <div className="mt-10 h-px w-32 bg-gradient-to-r from-transparent via-rose-300/60 to-transparent animate-splash-rise splash-delay-3" />
        <p className="mt-6 max-w-md text-sm text-white/45 leading-relaxed animate-splash-rise splash-delay-4">
          AI analyses. Humans approve. Every council explains with evidence — the project always belongs to you.
        </p>
      </div>
    </div>
  );
}
