"use client";

import { categories, partsByCategory } from "@/lib/catalog-data";
import { PartArt } from "./PartArt";
import { usePlatform } from "./PlatformContext";

export default function CategoryGrid() {
  const { setCategoryFilter } = usePlatform();

  return (
    <section id="categories" className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-8 flex flex-col gap-3">
        <h2 className="font-editorial text-4xl font-bold text-text">
          تصفح حسب الفئة
        </h2>
        <p className="max-w-xl text-text-soft">
          ما عندك سيارة محددة؟ تصفح كل الفئات وشوف القطع المتوفرة.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {categories.map((cat) => {
          const count = partsByCategory(cat.id).length;
          return (
            <a
              key={cat.id}
              href="#products"
              onClick={() => setCategoryFilter(cat.id)}
              className="group overflow-hidden rounded-diqa border border-line bg-panel transition-colors hover:border-primary/60"
            >
              <PartArt
                icon={cat.icon as never}
                hue={140}
                className="aspect-[5/3] w-full transition-transform duration-500 group-hover:scale-105"
              />
              <div className="p-4">
                <h3 className="font-editorial text-lg font-bold text-text group-hover:text-accent">
                  {cat.name}
                </h3>
                <p className="mt-1 text-xs text-text-soft">{count} قطعة متوفرة</p>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
