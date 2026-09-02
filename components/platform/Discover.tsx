"use client";

import { useMemo } from "react";
import { cars, brands, categories } from "@/lib/cars-data";
import {
  filterCars,
  hasActiveFilters,
  HP_BUCKETS,
  PRICE_BUCKETS,
  SPRINT_BUCKETS,
} from "@/lib/filters";
import { usePlatform } from "./PlatformContext";

const FUELS = ["Petrol", "Hybrid", "Electric"] as const;
const TRANSMISSIONS = ["Automatic", "Dual-Clutch", "Manual", "Direct-Drive"] as const;
const DRIVES = ["RWD", "AWD", "FWD"] as const;

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-xs font-medium tracking-wide transition-colors ${
        active
          ? "border-accent bg-accent text-accent-ink"
          : "border-line bg-bg-2 text-text-soft hover:border-text-soft hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line-soft py-5 first:border-t-0 first:pt-0">
      <p className="mb-3 font-data text-[11px] uppercase tracking-[0.2em] text-text-faint">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export default function Discover() {
  const { filters, setQuery, toggleFilterValue, toggleYear, clearFilters } = usePlatform();

  const uniqueBrands = useMemo(() => brands.map((b) => b.name).sort(), []);
  const uniqueYears = useMemo(() => [...new Set(cars.map((c) => c.year))].sort((a, b) => b - a), []);
  const resultCount = useMemo(() => filterCars(cars, filters).length, [filters]);
  const active = hasActiveFilters(filters);

  return (
    <section id="discover" className="relative border-y border-line-soft bg-bg-2/40 py-24">
      <div className="mx-auto max-w-[1400px] px-6">
        <h2 className="font-display text-4xl text-text sm:text-5xl">WHAT ARE YOU LOOKING FOR?</h2>
        <p className="mt-3 max-w-md text-text-soft">
          Search by car, brand, model, or category — or narrow it down with filters.
        </p>

        <div className="relative mt-8">
          <SearchGlyph />
          <input
            id="search-input"
            value={filters.query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by car, brand, model, or category…"
            className="w-full rounded-2xl border border-line bg-bg-3 py-5 pl-14 pr-5 text-lg text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Porsche 911", "BMW M3", "Tesla", "SUV", "Electric", "Supercar"].map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setQuery(example)}
              className="rounded-full border border-line-soft px-3 py-1 text-xs text-text-faint transition-colors hover:border-accent hover:text-accent"
            >
              {example}
            </button>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border border-line bg-bg-3/60 p-6 sm:p-8">
          <Group label="Brand">
            {uniqueBrands.map((b) => (
              <Chip key={b} active={filters.brands.includes(b)} onClick={() => toggleFilterValue("brands", b)}>
                {b}
              </Chip>
            ))}
          </Group>
          <Group label="Price Range">
            {PRICE_BUCKETS.map((b) => (
              <Chip key={b.id} active={filters.priceBuckets.includes(b.id)} onClick={() => toggleFilterValue("priceBuckets", b.id)}>
                {b.label}
              </Chip>
            ))}
          </Group>
          <Group label="Vehicle Type">
            {categories.map((c) => (
              <Chip key={c.id} active={filters.categories.includes(c.id)} onClick={() => toggleFilterValue("categories", c.id)}>
                {c.label}
              </Chip>
            ))}
          </Group>
          <Group label="Fuel Type">
            {FUELS.map((f) => (
              <Chip key={f} active={filters.fuels.includes(f)} onClick={() => toggleFilterValue("fuels", f)}>
                {f}
              </Chip>
            ))}
          </Group>
          <Group label="Transmission">
            {TRANSMISSIONS.map((t) => (
              <Chip key={t} active={filters.transmissions.includes(t)} onClick={() => toggleFilterValue("transmissions", t)}>
                {t}
              </Chip>
            ))}
          </Group>
          <Group label="Horsepower">
            {HP_BUCKETS.map((b) => (
              <Chip key={b.id} active={filters.hpBuckets.includes(b.id)} onClick={() => toggleFilterValue("hpBuckets", b.id)}>
                {b.label}
              </Chip>
            ))}
          </Group>
          <Group label="0–100 km/h">
            {SPRINT_BUCKETS.map((b) => (
              <Chip key={b.id} active={filters.sprintBuckets.includes(b.id)} onClick={() => toggleFilterValue("sprintBuckets", b.id)}>
                {b.label}
              </Chip>
            ))}
          </Group>
          <Group label="Year">
            {uniqueYears.map((y) => (
              <Chip key={y} active={filters.years.includes(y)} onClick={() => toggleYear(y)}>
                {y}
              </Chip>
            ))}
          </Group>
          <Group label="Drive Type">
            {DRIVES.map((d) => (
              <Chip key={d} active={filters.drives.includes(d)} onClick={() => toggleFilterValue("drives", d)}>
                {d}
              </Chip>
            ))}
          </Group>

          <div className="mt-6 flex items-center justify-between border-t border-line-soft pt-5">
            <p className="font-data text-sm text-text-soft">
              <span className="text-accent">{resultCount}</span> {resultCount === 1 ? "car" : "cars"} match
            </p>
            {active && (
              <button type="button" onClick={clearFilters} className="text-xs text-text-soft hover:text-accent">
                Clear all filters
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SearchGlyph() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-text-faint"
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
