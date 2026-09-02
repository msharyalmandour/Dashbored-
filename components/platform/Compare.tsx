"use client";

import { useMemo, useState } from "react";
import { cars } from "@/lib/cars-data";
import { formatPrice } from "@/lib/format";
import { transmissionKind } from "@/lib/filters";
import type { Car } from "@/lib/types";
import { CarArt } from "./CarArt";
import { usePlatform } from "./PlatformContext";

interface NumRow {
  label: string;
  get: (c: Car) => number;
  format: (n: number) => string;
  higherIsBetter: boolean;
}

const NUM_ROWS: NumRow[] = [
  { label: "Horsepower", get: (c) => c.horsepower, format: (n) => `${n} HP`, higherIsBetter: true },
  { label: "Torque", get: (c) => c.torqueNm, format: (n) => `${n} Nm`, higherIsBetter: true },
  { label: "0–100 km/h", get: (c) => c.zeroToHundred, format: (n) => `${n}s`, higherIsBetter: false },
  { label: "Top Speed", get: (c) => c.topSpeed, format: (n) => `${n} km/h`, higherIsBetter: true },
  { label: "Weight", get: (c) => c.weightKg, format: (n) => `${n} kg`, higherIsBetter: false },
];

export default function Compare() {
  const { compare, toggleCompare, openDetail } = usePlatform();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = compare.map((slug) => cars.find((c) => c.slug === slug)).filter(Boolean) as Car[];

  const pickable = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cars
      .filter((c) => !compare.includes(c.slug))
      .filter((c) => !q || `${c.brand} ${c.model}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, compare]);

  return (
    <section id="compare" className="border-y border-line-soft bg-bg-2/40 py-24">
      <div className="mx-auto max-w-[1400px] px-6">
        <h2 className="font-display text-4xl text-text sm:text-5xl">PUT THEM SIDE BY SIDE.</h2>
        <p className="mt-3 max-w-md text-text-soft">Pick up to three cars and compare what actually matters.</p>

        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((slot) => {
            const car = selected[slot];
            if (car) {
              return (
                <div key={car.slug} className="relative overflow-hidden rounded-2xl border border-line bg-bg-3">
                  <button
                    type="button"
                    onClick={() => toggleCompare(car.slug)}
                    aria-label="Remove"
                    className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-bg/80 text-text-soft hover:text-accent"
                  >
                    ✕
                  </button>
                  <div className="aspect-[16/10]">
                    <CarArt car={car} className="h-full w-full" />
                  </div>
                  <div className="p-4">
                    <p className="font-data text-[11px] uppercase tracking-[0.2em] text-accent">{car.brand}</p>
                    <button type="button" onClick={() => openDetail(car.slug)} className="font-display text-xl text-text hover:text-accent">
                      {car.model}
                    </button>
                  </div>
                </div>
              );
            }
            return (
              <button
                key={slot}
                type="button"
                onClick={() => setPickerOpen(true)}
                className="grid aspect-[4/3] place-items-center rounded-2xl border border-dashed border-line text-text-faint transition-colors hover:border-accent hover:text-accent sm:aspect-auto"
              >
                <span className="text-sm font-medium">+ Add a car</span>
              </button>
            );
          })}
        </div>

        {pickerOpen && (
          <div className="mt-4 rounded-2xl border border-line bg-bg-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a car to add…"
                className="w-full rounded-lg border border-line bg-bg-2 px-4 py-2.5 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
              />
              <button type="button" onClick={() => setPickerOpen(false)} className="shrink-0 text-xs text-text-soft hover:text-accent">
                Close
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {pickable.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => {
                    toggleCompare(c.slug);
                    setQuery("");
                    if (compare.length >= 2) setPickerOpen(false);
                  }}
                  disabled={compare.length >= 3}
                  className="flex items-center gap-3 rounded-lg border border-line-soft bg-bg-2 p-2 text-left transition-colors hover:border-accent disabled:opacity-40"
                >
                  <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md">
                    <CarArt car={c} className="h-full w-full" />
                  </div>
                  <span className="truncate text-sm text-text">
                    {c.brand} {c.model}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {selected.length >= 2 && (
          <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <tbody>
                <tr className="border-b border-line-soft">
                  <td className="w-40 p-4 text-text-faint">Starting From</td>
                  {selected.map((c) => (
                    <td key={c.slug} className="p-4 font-data text-text">
                      {formatPrice(c.priceFrom)}
                    </td>
                  ))}
                </tr>
                {NUM_ROWS.map((row) => {
                  const values = selected.map((c) => row.get(c));
                  const max = Math.max(...values);
                  const min = Math.min(...values);
                  return (
                    <tr key={row.label} className="border-b border-line-soft">
                      <td className="p-4 align-top text-text-faint">{row.label}</td>
                      {selected.map((c, i) => {
                        const v = values[i];
                        const best = row.higherIsBetter ? v === max : v === min;
                        const ratio = max === min ? 1 : Math.max(v / max, 0.12);
                        return (
                          <td key={c.slug} className="p-4 align-top">
                            <div className="flex items-center gap-2">
                              <span className={`font-data ${best && selected.length > 1 ? "text-accent" : "text-text"}`}>
                                {row.format(v)}
                              </span>
                              {best && selected.length > 1 && <span className="text-[10px] text-accent">BEST</span>}
                            </div>
                            <div className="mt-1.5 h-1 w-full max-w-24 rounded-full bg-line">
                              <div
                                className="h-1 rounded-full bg-accent"
                                style={{ width: `${ratio * 100}%` }}
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr className="border-b border-line-soft">
                  <td className="p-4 text-text-faint">Fuel Type</td>
                  {selected.map((c) => (
                    <td key={c.slug} className="p-4 text-text">{c.fuelType}</td>
                  ))}
                </tr>
                <tr className="border-b border-line-soft">
                  <td className="p-4 text-text-faint">Transmission</td>
                  {selected.map((c) => (
                    <td key={c.slug} className="p-4 text-text">{transmissionKind(c)}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 text-text-faint">Drive Type</td>
                  {selected.map((c) => (
                    <td key={c.slug} className="p-4 text-text">{c.drive}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
