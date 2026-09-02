"use client";

import { useMemo } from "react";
import { cars } from "@/lib/cars-data";
import { filterCars, hasActiveFilters } from "@/lib/filters";
import { usePlatform } from "./PlatformContext";
import CarCard from "./CarCard";

export default function FeaturedCars() {
  const { filters, clearFilters } = usePlatform();
  const active = hasActiveFilters(filters);
  const list = useMemo(() => (active ? filterCars(cars, filters) : cars), [filters, active]);

  return (
    <section id="featured" className="py-24">
      <div className="mx-auto max-w-[1400px] px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-data text-xs tracking-[0.3em] text-accent">
              {active ? "FILTERED RESULTS" : `${cars.length} CARS`}
            </p>
            <h2 className="mt-2 font-display text-4xl text-text sm:text-5xl">FEATURED CARS</h2>
          </div>
          {active && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-full border border-line px-4 py-2 text-xs text-text-soft hover:border-accent hover:text-accent"
            >
              Clear filters ({list.length} shown)
            </button>
          )}
        </div>

        {list.length === 0 ? (
          <div className="mt-16 rounded-2xl border border-dashed border-line py-20 text-center">
            <p className="font-display text-2xl text-text">No cars match those filters.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 rounded-full bg-accent px-6 py-3 text-sm font-bold text-accent-ink"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((car) => (
              <CarCard key={car.slug} car={car} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
