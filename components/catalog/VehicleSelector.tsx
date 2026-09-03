"use client";

import { useState } from "react";
import {
  brands,
  getBrandById,
  getModelById,
  getModelsByBrand,
  getYearsForModel,
  partsCountForModel,
  parts,
} from "@/lib/catalog-data";
import { isCompatible } from "@/lib/types";
import { PartCard } from "./PartCard";
import { usePlatform } from "./PlatformContext";

type Step = 1 | 2 | 3 | 4;

export default function VehicleSelector() {
  const { vehicle, setVehicle } = usePlatform();
  const [step, setStep] = useState<Step>(1);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);

  const brand = brandId ? getBrandById(brandId) : null;
  const model = modelId ? getModelById(modelId) : null;

  function pickBrand(id: string) {
    setBrandId(id);
    setModelId(null);
    setVehicle(null);
    setStep(2);
  }

  function pickModel(id: string) {
    setModelId(id);
    setVehicle(null);
    setStep(3);
  }

  function pickYear(year: number) {
    if (!brandId || !modelId) return;
    setVehicle({ brandId, modelId, year });
    setStep(4);
  }

  function reset() {
    setBrandId(null);
    setModelId(null);
    setVehicle(null);
    setStep(1);
  }

  const compatibleParts = vehicle ? parts.filter((p) => isCompatible(p, vehicle)) : [];
  const popularParts = compatibleParts.slice(0, 4);

  return (
    <section id="selector" className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-8 text-center">
        <h2 className="font-editorial text-4xl font-bold text-text">
          وش تسوق؟
        </h2>
        <p className="mt-3 text-text-soft">
          اختر سيارتك بثلاث خطوات، ونطلع لك القطع المتوافقة معها فوراً.
        </p>
      </div>

      {/* شريط التقدّم + ملخص الاختيارات */}
      <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
        <SummaryChip
          label="الماركة"
          value={brand?.name}
          active={step === 1}
          onClick={() => setStep(1)}
        />
        <Arrow />
        <SummaryChip
          label="الموديل"
          value={model?.name}
          active={step === 2}
          disabled={!brand}
          onClick={() => brand && setStep(2)}
        />
        <Arrow />
        <SummaryChip
          label="السنة"
          value={vehicle?.year?.toString()}
          active={step === 3}
          disabled={!model}
          onClick={() => model && setStep(3)}
        />
      </div>

      <div className="rounded-diqa border border-line bg-panel p-6 sm:p-8">
        {step === 1 && (
          <div>
            <p className="mb-5 text-sm font-medium text-text-soft">
              الخطوة 1 — اختر ماركة سيارتك
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {brands.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => pickBrand(b.id)}
                  className="rounded-diqa border border-line bg-panel-strong px-4 py-5 text-center font-editorial text-lg font-bold text-text transition-colors hover:border-primary hover:text-primary"
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && brand && (
          <div>
            <p className="mb-5 text-sm font-medium text-text-soft">
              الخطوة 2 — اختر موديل {brand.name}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {getModelsByBrand(brand.id).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => pickModel(m.id)}
                  className="rounded-diqa border border-line bg-panel-strong px-4 py-5 text-center font-editorial text-lg font-bold text-text transition-colors hover:border-primary hover:text-primary"
                >
                  {m.name}
                  <span className="mt-1 block font-data text-[11px] font-normal text-text-soft">
                    {partsCountForModel(m.id)} قطعة متوافقة
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mt-5 text-sm text-text-soft hover:text-accent"
            >
              ← رجوع لاختيار الماركة
            </button>
          </div>
        )}

        {step === 3 && model && (
          <div>
            <p className="mb-5 text-sm font-medium text-text-soft">
              الخطوة 3 — اختر سنة الصنع
            </p>
            <div className="flex flex-wrap gap-2.5">
              {getYearsForModel(model.id).map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => pickYear(y)}
                  className="rounded-diqa-sm border border-line bg-panel-strong px-5 py-3 font-data text-sm font-medium text-text transition-colors hover:border-primary hover:text-primary"
                >
                  {y}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="mt-5 text-sm text-text-soft hover:text-accent"
            >
              ← رجوع لاختيار الموديل
            </button>
          </div>
        )}

        {step === 4 && vehicle && brand && model && (
          <div>
            <div className="flex items-center gap-2 text-primary">
              <span className="text-xl">✓</span>
              <p className="font-medium">
                جاهز! سيارتك: {brand.name} {model.name} {vehicle.year}
              </p>
            </div>
            <p className="mt-2 text-sm text-text-soft">
              لقينا {compatibleParts.length} قطعة متوافقة مع سيارتك.
            </p>

            {popularParts.length > 0 && (
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {popularParts.map((p) => (
                  <PartCard key={p.id} part={p} compact />
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#products"
                className="rounded-diqa border border-primary bg-primary px-6 py-3 text-sm font-semibold text-bg transition-all hover:scale-[1.03] hover:bg-transparent hover:text-primary"
              >
                شوف كل القطع المتوافقة
              </a>
              <button
                type="button"
                onClick={reset}
                className="rounded-diqa border border-line px-6 py-3 text-sm font-medium text-text-soft transition-colors hover:border-accent hover:text-accent"
              >
                غيّر السيارة
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SummaryChip({
  label,
  value,
  active,
  disabled,
  onClick,
}: {
  label: string;
  value?: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-bg"
          : value
            ? "border-line bg-panel text-text hover:border-primary"
            : "border-line bg-panel text-text-soft"
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {value ?? label}
    </button>
  );
}

function Arrow() {
  return <span className="text-text-soft">←</span>;
}
