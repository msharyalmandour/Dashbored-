"use client";

import { cars } from "@/lib/cars-data";
import { formatPrice } from "@/lib/format";
import { usePlatform } from "./PlatformContext";
import { CarArt } from "./CarArt";

export default function FavoritesPanel() {
  const { favoritesOpen, setFavoritesOpen, favorites, toggleFavorite, openDetail } = usePlatform();
  const list = cars.filter((c) => favorites.has(c.slug));

  if (!favoritesOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        aria-label="Close favorites"
        onClick={() => setFavoritesOpen(false)}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <aside className="absolute right-0 top-0 h-full w-full max-w-sm border-l border-line bg-bg-2 p-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg text-text">YOUR GARAGE</h3>
          <button
            type="button"
            onClick={() => setFavoritesOpen(false)}
            className="grid h-8 w-8 place-items-center rounded-full border border-line text-text-soft hover:text-accent"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {list.length === 0 ? (
          <p className="mt-8 text-sm text-text-soft">
            Nothing saved yet. Tap the heart on any car to keep it here.
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {list.map((car) => (
              <div key={car.slug} className="flex gap-3 rounded-lg border border-line bg-bg-3 p-3">
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-md">
                  <CarArt car={car} className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text">
                    {car.brand} {car.model}
                  </p>
                  <p className="font-data text-xs text-accent">{formatPrice(car.priceFrom)}</p>
                  <div className="mt-2 flex gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        openDetail(car.slug);
                        setFavoritesOpen(false);
                      }}
                      className="text-text-soft hover:text-accent"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(car.slug)}
                      className="text-text-soft hover:text-accent"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
