"use client";

import { useState } from "react";
import { mockVinCheck } from "@/lib/mock-data";
import type { VinCheckResult } from "@/lib/types";

const SAMPLE_VIN = "JTNBE46K473012345";

export default function VinCheckTab() {
  const [vin, setVin] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [result, setResult] = useState<VinCheckResult | null>(null);

  const vinDigits = vin.replace(/\s/g, "");
  const isValid = vinDigits.length === 17;

  function runCheck(value: string) {
    setStatus("loading");
    setResult(null);
    window.setTimeout(() => {
      setResult(mockVinCheck(value));
      setStatus("done");
    }, 900);
  }

  return (
    <div>
      <label htmlFor="vin-input" className="block text-sm text-text-soft">
        رقم الشاصي (VIN) — 17 خانة
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id="vin-input"
          value={vin}
          onChange={(e) => setVin(e.target.value.toUpperCase().slice(0, 17))}
          placeholder={SAMPLE_VIN}
          maxLength={17}
          dir="ltr"
          className="w-full rounded-diqa-sm border border-line bg-bg px-4 py-3 text-left font-data text-sm tracking-widest text-text placeholder:text-text-soft/60 focus:border-accent focus:outline-none"
        />
        <button
          type="button"
          disabled={!isValid || status === "loading"}
          onClick={() => runCheck(vinDigits)}
          className="shrink-0 rounded-diqa-sm border border-primary bg-primary px-6 py-3 text-sm font-medium text-bg transition-colors hover:bg-transparent hover:text-primary disabled:cursor-not-allowed disabled:border-line disabled:bg-line disabled:text-text-soft"
        >
          {status === "loading" ? "جارِ الفحص…" : "افحص"}
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-text-soft">
        <span>{vinDigits.length}/17</span>
        <button
          type="button"
          onClick={() => setVin(SAMPLE_VIN)}
          className="text-accent hover:underline"
        >
          استخدم رقم شاصي تجريبي
        </button>
      </div>

      {status === "loading" && (
        <div className="mt-6 animate-pulse rounded-diqa border border-line bg-panel p-6 text-sm text-text-soft">
          جارِ مطابقة رقم الشاصي مع قاعدة البيانات الوهمية…
        </div>
      )}

      {status === "done" && result && (
        <div className="mt-6 rounded-diqa border border-line bg-panel p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-editorial text-2xl text-text">
              {result.car.make} {result.car.model} {result.car.year}
            </h3>
            <span className="font-data text-xs text-text-soft" dir="ltr">
              {result.car.vin}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-soft">
            <span>الفئة: {result.car.trim}</span>
            <span>المحرك: {result.car.engine}</span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {result.car.compatibleParts.map((c) => (
              <div
                key={c.categoryId}
                className="rounded-diqa-sm border border-line bg-bg p-3 text-center"
              >
                <div className="font-data text-lg text-primary">
                  {c.count}
                </div>
                <div className="mt-1 text-[11px] text-text-soft">
                  {c.categoryLabel}
                </div>
              </div>
            ))}
          </div>
          <a
            href="#explorer"
            className="mt-5 inline-block text-sm text-accent hover:underline"
          >
            استكشف قطع هذه السيارة على المخطط ←
          </a>
        </div>
      )}
    </div>
  );
}
