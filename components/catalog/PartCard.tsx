"use client";

import type { Part } from "@/lib/types";
import { isCompatible } from "@/lib/types";
import { getCategoryById } from "@/lib/catalog-data";
import { PartArt } from "./PartArt";
import { usePlatform } from "./PlatformContext";

export function PartCard({ part, compact = false }: { part: Part; compact?: boolean }) {
  const { vehicle, favorites, toggleFavorite, openPart, addToCart } = usePlatform();
  const category = getCategoryById(part.categoryId);
  const favored = favorites.has(part.id);
  const compatible = vehicle ? isCompatible(part, vehicle) : null;

  return (
    <div className="group overflow-hidden rounded-diqa border border-line bg-panel transition-colors hover:border-primary/50">
      <div className="relative">
        <button
          type="button"
          onClick={() => openPart(part.id)}
          className="block w-full text-right"
          aria-label={`عرض ${part.name}`}
        >
          <PartArt
            icon={category?.icon as never}
            hue={part.hue}
            className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-105"
          />
        </button>
        <button
          type="button"
          onClick={() => toggleFavorite(part.id)}
          aria-label={favored ? "إزالة من المفضلة" : "أضف للمفضلة"}
          className="absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-bg/70 text-text-soft backdrop-blur transition-colors hover:text-accent"
        >
          {favored ? "♥" : "♡"}
        </button>
      </div>

      <div className={compact ? "p-4" : "p-5"}>
        {compatible !== null && (
          <p
            className={`mb-2 text-xs font-medium ${compatible ? "text-primary" : "text-text-soft"}`}
          >
            {compatible ? "✓ متوافقة مع سيارتك" : "غير متوافقة مع سيارتك"}
          </p>
        )}
        <p className="font-data text-[11px] uppercase tracking-wide text-text-soft">
          {part.brandLabel}
        </p>
        <button
          type="button"
          onClick={() => openPart(part.id)}
          className="mt-0.5 text-right font-editorial text-lg font-bold text-text hover:text-accent"
        >
          {part.name}
        </button>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-data text-base text-primary">{part.price} ر.س</span>
          {!compact && (
            <button
              type="button"
              onClick={() => addToCart(part.id)}
              className="rounded-diqa-sm border border-primary px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-bg"
            >
              أضف للسلة
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
