"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const GENDERS = [
  { value: "", label: "الكل" },
  { value: "men", label: "رجالي" },
  { value: "women", label: "نسائي" },
  { value: "unisex", label: "مشترك" },
];

const SORTS = [
  { value: "", label: "الأحدث" },
  { value: "price-asc", label: "السعر: من الأقل للأعلى" },
  { value: "price-desc", label: "السعر: من الأعلى للأقل" },
];

export function ShopFilters({ categories }: { categories: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const gender = searchParams.get("gender") ?? "";
  const category = searchParams.get("category") ?? "";
  const sort = searchParams.get("sort") ?? "";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(params.size ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="mb-3 text-sm font-bold text-gold">الجنس</h3>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setParam("gender", g.value)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs transition-colors",
                gender === g.value
                  ? "border-gold bg-gold text-background"
                  : "border-border text-muted hover:border-gold hover:text-gold",
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-gold">الفئة</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setParam("category", "")}
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs transition-colors",
              !category
                ? "border-gold bg-gold text-background"
                : "border-border text-muted hover:border-gold hover:text-gold",
            )}
          >
            الكل
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setParam("category", c)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs transition-colors",
                category === c
                  ? "border-gold bg-gold text-background"
                  : "border-border text-muted hover:border-gold hover:text-gold",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-bold text-gold">الترتيب</h3>
        <select
          value={sort}
          onChange={(e) => setParam("sort", e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-foreground focus:border-gold focus:outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
