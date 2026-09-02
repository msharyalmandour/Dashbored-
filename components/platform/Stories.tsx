"use client";

import { useState } from "react";
import { stories } from "@/lib/cars-data";
import type { Story } from "@/lib/types";

function StoryArt({ hue, dense = false }: { hue: number; dense?: boolean }) {
  return (
    <svg viewBox="0 0 400 240" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`story-${hue}-${dense ? "d" : "s"}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={`hsl(${hue} 55% 22%)`} />
          <stop offset="100%" stopColor="var(--bg)" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill={`url(#story-${hue}-${dense ? "d" : "s"})`} />
      {[...Array(dense ? 8 : 5)].map((_, i) => (
        <line
          key={i}
          x1={-20 + i * 60}
          y1="240"
          x2={80 + i * 60}
          y2="0"
          stroke={`hsl(${hue} 70% 60% / 0.12)`}
          strokeWidth="1"
        />
      ))}
      <circle cx="320" cy="60" r="70" fill={`hsl(${hue} 80% 60% / 0.08)`} />
    </svg>
  );
}

export default function Stories() {
  const [open, setOpen] = useState<Story | null>(null);
  const [featured, ...rest] = stories;

  return (
    <section id="stories" className="py-24">
      <div className="mx-auto max-w-[1400px] px-6">
        <p className="font-data text-xs tracking-[0.3em] text-accent">FROM THE EDITORS</p>
        <h2 className="mt-2 font-display text-4xl text-text sm:text-5xl">STORIES</h2>

        <button
          type="button"
          onClick={() => setOpen(featured)}
          className="group mt-10 grid grid-cols-1 gap-0 overflow-hidden rounded-2xl border border-line bg-bg-2 text-left md:grid-cols-2"
        >
          <div className="h-64 md:h-full">
            <StoryArt hue={featured.hue} dense />
          </div>
          <div className="flex flex-col justify-center p-8 sm:p-10">
            <p className="font-data text-xs tracking-[0.2em] text-accent">{featured.kicker.toUpperCase()}</p>
            <h3 className="mt-3 font-display text-3xl leading-tight text-text sm:text-4xl">{featured.title}</h3>
            <p className="mt-4 text-sm leading-relaxed text-text-soft">{featured.excerpt}</p>
            <p className="mt-5 text-xs font-bold tracking-wide text-accent">READ THE STORY →</p>
          </div>
        </button>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {rest.map((s) => (
            <button
              key={s.slug}
              type="button"
              onClick={() => setOpen(s)}
              className="group overflow-hidden rounded-2xl border border-line bg-bg-2 text-left transition-colors hover:border-accent"
            >
              <div className="h-40">
                <StoryArt hue={s.hue} />
              </div>
              <div className="p-5">
                <p className="font-data text-[11px] tracking-[0.2em] text-accent">{s.kicker.toUpperCase()}</p>
                <h4 className="mt-2 font-display text-xl leading-snug text-text">{s.title}</h4>
              </div>
            </button>
          ))}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-[70] overflow-y-auto">
          <button
            aria-label="Close"
            onClick={() => setOpen(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />
          <div className="relative mx-auto my-10 max-w-2xl rounded-2xl border border-line bg-bg-2 p-8 sm:p-12">
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="absolute right-6 top-6 grid h-9 w-9 place-items-center rounded-full border border-line text-text-soft hover:text-accent"
            >
              ✕
            </button>
            <p className="font-data text-xs tracking-[0.2em] text-accent">{open.kicker.toUpperCase()}</p>
            <h3 className="mt-3 font-display text-4xl leading-tight text-text">{open.title}</h3>
            <p className="mt-6 text-base leading-relaxed text-text-soft">{open.excerpt}</p>
          </div>
        </div>
      )}
    </section>
  );
}
