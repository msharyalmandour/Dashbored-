"use client";

import type { Feeling } from "@/lib/types";
import { usePlatform } from "./PlatformContext";

const FEELINGS: { id: Feeling; icon: string; label: string }[] = [
  { id: "speed", icon: "⚡", label: "I WANT SPEED" },
  { id: "luxury", icon: "👑", label: "I WANT LUXURY" },
  { id: "adventure", icon: "🌍", label: "I WANT ADVENTURE" },
  { id: "future", icon: "🔮", label: "I WANT THE FUTURE" },
  { id: "attention", icon: "🔥", label: "I WANT ATTENTION" },
  { id: "technology", icon: "🧠", label: "I WANT TECHNOLOGY" },
];

export default function FeelingDiscovery() {
  const { setFeelingOnly, filters } = usePlatform();

  return (
    <section id="feel" className="py-24">
      <div className="mx-auto max-w-[1400px] px-6">
        <h2 className="font-display text-4xl text-text sm:text-5xl">HOW DO YOU WANT TO FEEL?</h2>
        <p className="mt-3 max-w-md text-text-soft">
          Forget the spec sheet for a second. Pick a feeling — we&rsquo;ll find the car.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {FEELINGS.map((f) => {
            const active = filters.feelings.includes(f.id);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFeelingOnly(f.id);
                  document.getElementById("featured")?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`flex flex-col items-center gap-3 rounded-2xl border p-6 text-center transition-all hover:-translate-y-1 ${
                  active ? "border-accent bg-accent/10" : "border-line bg-bg-2 hover:border-accent/60"
                }`}
              >
                <span className="text-3xl">{f.icon}</span>
                <span className="text-xs font-bold tracking-wide text-text">{f.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
