"use client";

import { cars } from "@/lib/cars-data";
import { CarArt } from "./CarArt";
import { usePlatform } from "./PlatformContext";

const heroCar = cars.find((c) => c.slug === "bugatti-chiron-super-sport")!;

export default function Hero() {
  const { scrollToDiscover } = usePlatform();

  return (
    <section id="top" className="relative flex min-h-[100svh] flex-col overflow-hidden bg-bg">
      <div className="pointer-events-none absolute inset-0">
        <CarArt car={heroCar} className="h-full w-full scale-125 opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-bg/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-transparent to-bg/60" />
        <div className="hero-sweep absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center px-6 pt-28 pb-20">
        <p className="rise font-data text-xs tracking-[0.35em] text-accent">
          THE AUTOMOTIVE DISCOVERY PLATFORM
        </p>

        <h1 className="rise mt-6 max-w-4xl font-display text-[13vw] leading-[0.98] text-text sm:text-[8.5vw] lg:text-[6.4vw]" style={{ animationDelay: "80ms" }}>
          Some people
          <br />
          see a car.
          <br />
          <span className="text-accent">Others feel</span> something.
        </h1>

        <div className="rise mt-8 max-w-lg space-y-1 text-base leading-relaxed text-text-soft" style={{ animationDelay: "180ms" }}>
          <p>That moment before the engine starts.</p>
          <p>The feeling when your hands touch the wheel.</p>
          <p>The sound. The power. The freedom.</p>
        </div>

        <p className="rise mt-6 max-w-lg font-display text-xl text-text" style={{ animationDelay: "260ms" }}>
          This is more than transportation.
          <br />
          Find the car that feels like you.
        </p>

        <div className="rise mt-10 flex flex-wrap items-center gap-5" style={{ animationDelay: "340ms" }}>
          <button
            type="button"
            onClick={() => document.getElementById("featured")?.scrollIntoView({ behavior: "smooth" })}
            className="group inline-flex items-center gap-3 rounded-full bg-accent px-7 py-3.5 text-sm font-bold tracking-wide text-accent-ink transition-transform hover:scale-[1.03]"
          >
            EXPLORE THE COLLECTION
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>
          <button
            type="button"
            onClick={() => document.getElementById("quiz")?.scrollIntoView({ behavior: "smooth" })}
            className="rounded-full border border-line px-7 py-3.5 text-sm font-bold tracking-wide text-text transition-colors hover:border-accent hover:text-accent"
          >
            FIND YOUR PERFECT CAR
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={scrollToDiscover}
        aria-label="Scroll to discover"
        className="relative z-10 mb-8 flex flex-col items-center gap-2 self-center text-text-faint transition-colors hover:text-accent"
      >
        <span className="font-data text-[10px] tracking-[0.3em]">SCROLL</span>
        <span className="scroll-line block h-10 w-px bg-current" />
      </button>

      <style>{`
        @keyframes sweep {
          0% { transform: translateX(0); }
          100% { transform: translateX(340%); }
        }
        .hero-sweep { animation: sweep 9s ease-in-out infinite; }
        @keyframes scrollline {
          0%, 100% { opacity: 0.3; transform: scaleY(0.6); transform-origin: top; }
          50% { opacity: 1; transform: scaleY(1); transform-origin: top; }
        }
        .scroll-line { animation: scrollline 2.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .hero-sweep, .scroll-line { animation: none; }
        }
      `}</style>
    </section>
  );
}
