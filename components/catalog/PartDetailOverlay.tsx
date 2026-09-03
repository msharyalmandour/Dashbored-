"use client";

import { useEffect } from "react";
import { getCategoryById, getPartById } from "@/lib/catalog-data";
import { isCompatible } from "@/lib/types";
import type { Part } from "@/lib/types";
import { PartArt } from "./PartArt";
import { PartCard } from "./PartCard";
import { usePlatform } from "./PlatformContext";

export default function PartDetailOverlay() {
  const { openPartId, closePart } = usePlatform();
  const part = openPartId ? getPartById(openPartId) : null;

  useEffect(() => {
    if (!part) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [part]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closePart();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closePart]);

  if (!part) return null;
  return <DetailBody key={part.id} part={part} />;
}

function DetailBody({ part }: { part: Part }) {
  const { vehicle, favorites, toggleFavorite, addToCart, closePart } = usePlatform();
  const category = getCategoryById(part.categoryId);
  const favored = favorites.has(part.id);
  const compatible = vehicle ? isCompatible(part, vehicle) : null;
  const related = part.related.map(getPartById).filter((p): p is Part => Boolean(p));

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-bg">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/90 px-6 py-4 backdrop-blur-xl">
        <button
          type="button"
          onClick={closePart}
          className="flex items-center gap-2 text-sm text-text-soft transition-colors hover:text-accent"
        >
          <span aria-hidden="true">→</span> رجوع
        </button>
        <p className="font-editorial text-sm font-bold text-text">{part.name}</p>
        <button
          type="button"
          onClick={closePart}
          aria-label="إغلاق"
          className="grid h-9 w-9 place-items-center rounded-full border border-line text-text-soft hover:text-accent"
        >
          ✕
        </button>
      </div>

      <div className="mx-auto grid max-w-5xl gap-10 px-6 pb-24 pt-10 sm:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-diqa border border-line">
            <PartArt icon={category?.icon as never} hue={part.hue} className="aspect-[4/3] w-full" />
          </div>
        </div>

        <div>
          <p className="font-data text-xs uppercase tracking-wide text-accent">
            {category?.name} · {part.brandLabel}
          </p>
          <h1 className="mt-2 font-editorial text-3xl font-bold text-text sm:text-4xl">
            {part.name}
          </h1>
          <p className="mt-3 font-data text-2xl text-primary">{part.price} ر.س</p>

          <div className="mt-5 rounded-diqa border border-line bg-panel p-4">
            {vehicle ? (
              <p className={`text-sm font-medium ${compatible ? "text-primary" : "text-text-soft"}`}>
                {compatible
                  ? `✓ متوافقة مع سيارتك المختارة`
                  : `✕ غير متوافقة مع سيارتك المختارة`}
              </p>
            ) : (
              <p className="text-sm text-text-soft">
                اختر سيارتك من أعلى الصفحة لمعرفة مدى توافق هذي القطعة معها.
              </p>
            )}
            <p className="mt-1 text-xs text-text-soft">
              {part.stockCount <= 3
                ? `⚠ آخر ${part.stockCount} قطع بالمخزون`
                : `✓ متوفرة الآن — ${part.stockCount} قطعة بالمخزون`}
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => addToCart(part.id)}
              className="rounded-diqa border border-primary bg-primary px-6 py-3 text-sm font-semibold text-bg transition-all hover:scale-[1.03] hover:bg-transparent hover:text-primary"
            >
              أضف للسلة
            </button>
            <button
              type="button"
              onClick={() => toggleFavorite(part.id)}
              className={`rounded-diqa border px-6 py-3 text-sm font-medium transition-colors ${
                favored ? "border-accent text-accent" : "border-line text-text-soft hover:border-accent hover:text-accent"
              }`}
            >
              {favored ? "محفوظة بالمفضلة ♥" : "احفظ بالمفضلة"}
            </button>
          </div>

          <div className="mt-8 border-t border-line pt-6">
            <h3 className="font-editorial text-lg font-bold text-text">المواصفات</h3>
            <dl className="mt-3 grid grid-cols-2 gap-4">
              {part.specs.map((s) => (
                <div key={s.label}>
                  <dt className="font-data text-[11px] uppercase tracking-wide text-text-soft">
                    {s.label}
                  </dt>
                  <dd className="mt-0.5 text-sm text-text">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="mt-6 border-t border-line pt-6">
            <h3 className="font-editorial text-lg font-bold text-text">الوصف</h3>
            <p className="mt-2 text-sm leading-7 text-text-soft">{part.description}</p>
          </div>

          <div className="mt-6 border-t border-line pt-6">
            <h3 className="font-editorial text-lg font-bold text-text">معلومات التركيب</h3>
            <p className="mt-2 text-sm leading-7 text-text-soft">{part.installNote}</p>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mx-auto max-w-5xl border-t border-line px-6 py-14">
          <h3 className="font-editorial text-2xl font-bold text-text">قطع ذات صلة</h3>
          <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3">
            {related.map((r) => (
              <PartCard key={r.id} part={r} compact />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
