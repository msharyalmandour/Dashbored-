"use client";

import { partCategories } from "@/lib/mock-data";
import type { PartCategoryId } from "@/lib/types";

export default function CategorySidebar({
  active,
  onSelect,
}: {
  active: PartCategoryId | null;
  onSelect: (id: PartCategoryId | null) => void;
}) {
  return (
    <div className="rounded-diqa border border-line bg-panel p-3 lg:sticky lg:top-24">
      <p className="px-2 pb-2 text-xs text-text-soft">فئات القطع</p>
      <ul className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
        <li>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={`w-full whitespace-nowrap rounded-diqa-sm px-3 py-2 text-right text-sm transition-colors ${
              active === null
                ? "bg-primary text-bg"
                : "text-text hover:bg-panel-strong"
            }`}
          >
            الكل
          </button>
        </li>
        {partCategories.map((cat) => (
          <li key={cat.id}>
            <button
              type="button"
              onClick={() => onSelect(cat.id)}
              className={`w-full whitespace-nowrap rounded-diqa-sm px-3 py-2 text-right text-sm transition-colors ${
                active === cat.id
                  ? "bg-primary text-bg"
                  : "text-text hover:bg-panel-strong"
              }`}
            >
              {cat.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
