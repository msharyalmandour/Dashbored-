"use client";

import { categories, cars } from "@/lib/cars-data";
import { CarArt } from "./CarArt";
import { usePlatform } from "./PlatformContext";

export default function Categories() {
  const { setCategoryOnly } = usePlatform();

  return (
    <section id="categories" className="py-24">
      <div className="mx-auto max-w-[1400px] px-6">
        <h2 className="font-display text-4xl text-text sm:text-5xl">FIND YOUR CATEGORY</h2>
        <p className="mt-3 max-w-md text-text-soft">Seven ways into the collection. Pick the one that fits the drive you&rsquo;re after.</p>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat, i) => {
            const representative = cars
              .filter((c) => c.category === cat.id)
              .sort((a, b) => b.horsepower - a.horsepower)[0];
            const count = cars.filter((c) => c.category === cat.id).length;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategoryOnly(cat.id);
                  document.getElementById("featured")?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`group relative h-72 overflow-hidden rounded-2xl border border-line text-left transition-colors hover:border-accent ${
                  i === 0 ? "sm:col-span-2 lg:col-span-2" : ""
                }`}
              >
                <div className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-110">
                  {representative && <CarArt car={representative} className="h-full w-full" />}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/50 to-bg/10 transition-colors duration-500 group-hover:from-bg/95" />

                <div className="relative flex h-full flex-col justify-end p-6">
                  <p className="font-data text-[11px] tracking-[0.2em] text-accent">{count} MODELS</p>
                  <h3 className="mt-1 font-display text-3xl text-text">{cat.label.toUpperCase()}</h3>
                  <p className="mt-2 max-w-xs text-sm text-text-soft opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    &ldquo;{cat.line}&rdquo;
                  </p>
                  <p className="mt-3 text-xs font-bold tracking-wide text-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    EXPLORE →
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
