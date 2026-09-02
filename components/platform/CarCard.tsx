"use client";

import type { Car } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { CarArt } from "./CarArt";
import { usePlatform } from "./PlatformContext";

export default function CarCard({ car, compact = false }: { car: Car; compact?: boolean }) {
  const { favorites, toggleFavorite, isComparing, toggleCompare, openDetail } = usePlatform();
  const favored = favorites.has(car.slug);
  const comparing = isComparing(car.slug);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-bg-2 transition-colors hover:border-accent/60">
      <button
        type="button"
        onClick={() => openDetail(car.slug)}
        className="block w-full text-left"
        aria-label={`View ${car.brand} ${car.model}`}
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-bg-3">
          <CarArt
            car={car}
            className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-110"
          />
        </div>
      </button>

      <button
        type="button"
        onClick={() => toggleFavorite(car.slug)}
        aria-label={favored ? "Remove from favorites" : "Add to favorites"}
        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-bg/70 backdrop-blur transition-colors hover:bg-bg"
      >
        <HeartIcon filled={favored} />
      </button>

      <div className={compact ? "p-4" : "p-5"}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-data text-[11px] uppercase tracking-[0.2em] text-accent">{car.brand}</p>
            <button type="button" onClick={() => openDetail(car.slug)} className="text-left">
              <h3 className="mt-0.5 truncate font-display text-xl text-text">{car.model}</h3>
            </button>
          </div>
          <span className="shrink-0 rounded-full border border-line-soft px-2 py-1 font-data text-[10px] text-text-faint">
            {car.year}
          </span>
        </div>

        <p className="mt-2 text-xs text-text-soft">Starting From</p>
        <p className="font-data text-lg text-text">{formatPrice(car.priceFrom)}</p>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line-soft pt-4">
          <Stat value={car.horsepower} label="HP" />
          <Stat value={`${car.zeroToHundred}s`} label="0–100" />
          <Stat value={car.fuelType} label="FUEL" small />
        </div>

        {!compact && (
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => openDetail(car.slug)}
              className="text-xs font-bold tracking-wide text-accent"
            >
              EXPLORE →
            </button>
            <label className="flex items-center gap-1.5 text-[11px] text-text-soft">
              <input
                type="checkbox"
                checked={comparing}
                onChange={() => toggleCompare(car.slug)}
                className="h-3.5 w-3.5 accent-[var(--accent)]"
              />
              Compare
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label, small = false }: { value: string | number; label: string; small?: boolean }) {
  return (
    <div>
      <p className={`font-data text-text ${small ? "text-xs" : "text-sm"}`}>{value}</p>
      <p className="mt-0.5 text-[10px] text-text-faint">{label}</p>
    </div>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? "var(--accent)" : "none"} aria-hidden="true">
      <path
        d="M12 20 C7 16 2 12.5 2 8.2 C2 5.3 4.3 3 7.2 3 C9 3 10.6 3.9 12 5.5 C13.4 3.9 15 3 16.8 3 C19.7 3 22 5.3 22 8.2 C22 12.5 17 16 12 20 Z"
        stroke={filled ? "var(--accent)" : "white"}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
