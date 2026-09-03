"use client";

import { brands, getModelsByBrand, parts } from "@/lib/catalog-data";
import { usePlatform } from "./PlatformContext";

export default function BrandExplorer() {
  const { setBrandFilter, setCategoryFilter } = usePlatform();

  return (
    <section id="brands" className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-8 flex flex-col gap-3">
        <h2 className="font-editorial text-4xl font-bold text-text">
          تصفح حسب الماركة
        </h2>
        <p className="max-w-xl text-text-soft">
          نغطي أشهر الماركات — اضغط على أي ماركة وشوف القطع المتوفرة لها.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {brands.map((brand) => {
          const modelIds = getModelsByBrand(brand.id).map((m) => m.id);
          const count = parts.filter((p) =>
            p.compatibleModelIds.some((id) => modelIds.includes(id))
          ).length;

          return (
            <a
              key={brand.id}
              href="#products"
              onClick={() => {
                setBrandFilter(brand.id);
                setCategoryFilter(null);
              }}
              className="group flex flex-col items-center gap-3 rounded-diqa border border-line bg-panel p-5 text-center transition-colors hover:border-primary/60"
            >
              <span
                className="grid h-12 w-12 place-items-center rounded-full border-2 font-editorial text-lg font-bold"
                style={{
                  borderColor: `hsl(${brand.hue} 60% 55% / 0.5)`,
                  color: `hsl(${brand.hue} 70% 65%)`,
                }}
              >
                {brand.name[0]}
              </span>
              <div>
                <p className="font-editorial text-sm font-bold text-text group-hover:text-accent">
                  {brand.name}
                </p>
                <p className="mt-0.5 font-data text-[10px] text-text-soft">
                  {count} قطعة
                </p>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
