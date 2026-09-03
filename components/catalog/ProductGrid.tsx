"use client";

import { useMemo, useState } from "react";
import {
  getBrandById,
  getCategoryById,
  getModelById,
  getModelsByBrand,
  parts,
} from "@/lib/catalog-data";
import { isCompatible } from "@/lib/types";
import { PartCard } from "./PartCard";
import { usePlatform } from "./PlatformContext";

export default function ProductGrid() {
  const { vehicle, categoryFilter, setCategoryFilter, brandFilter, setBrandFilter } =
    usePlatform();
  const [showAll, setShowAll] = useState(false);

  const category = categoryFilter ? getCategoryById(categoryFilter) : null;
  const filterBrand = brandFilter ? getBrandById(brandFilter) : null;

  const list = useMemo(() => {
    let result = parts;
    if (categoryFilter) result = result.filter((p) => p.categoryId === categoryFilter);
    if (brandFilter) {
      const modelIds = getModelsByBrand(brandFilter).map((m) => m.id);
      result = result.filter((p) => p.compatibleModelIds.some((id) => modelIds.includes(id)));
    }
    if (vehicle && !showAll) result = result.filter((p) => isCompatible(p, vehicle));
    return result;
  }, [categoryFilter, brandFilter, vehicle, showAll]);

  const vehicleBrand = vehicle ? getBrandById(vehicle.brandId) : null;
  const vehicleModel = vehicle ? getModelById(vehicle.modelId) : null;

  const hasFilters = Boolean(categoryFilter || brandFilter || (vehicle && !showAll));

  let heading = "كل القطع";
  if (vehicle && !showAll) {
    heading = `القطع المتوافقة مع ${vehicleBrand?.name} ${vehicleModel?.name} ${vehicle.year}`;
  } else if (filterBrand) {
    heading = `قطع ${filterBrand.name}`;
  }
  if (category) heading += ` — ${category.name}`;

  return (
    <section id="products" className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-data text-xs uppercase tracking-wide text-accent">
            {list.length} قطعة
          </p>
          <h2 className="mt-2 font-editorial text-3xl font-bold text-text sm:text-4xl">
            {heading}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {vehicle && !showAll && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="rounded-diqa-sm border border-line px-4 py-2 text-xs text-text-soft transition-colors hover:border-accent hover:text-accent"
            >
              عرض كل القطع
            </button>
          )}
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setCategoryFilter(null);
                setBrandFilter(null);
                setShowAll(false);
              }}
              className="rounded-diqa-sm border border-line px-4 py-2 text-xs text-text-soft transition-colors hover:border-accent hover:text-accent"
            >
              مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="rounded-diqa border border-dashed border-line py-16 text-center text-text-soft">
          ما لقينا قطع مطابقة. جرّب تمسح الفلاتر أو غيّر سيارتك.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => (
            <PartCard key={p.id} part={p} />
          ))}
        </div>
      )}
    </section>
  );
}
