"use client";

import { useEffect, useState } from "react";
import { cars } from "@/lib/cars-data";
import { formatPrice } from "@/lib/format";
import { interiorFacts } from "@/lib/interior-facts";
import type { Car } from "@/lib/types";
import { CarArt } from "./CarArt";
import { InteriorArt } from "./InteriorArt";
import AnimatedNumber from "./AnimatedNumber";
import CarCard from "./CarCard";
import { usePlatform } from "./PlatformContext";

type Tab = "exterior" | "interior" | "performance" | "details";
const TABS: { id: Tab; label: string }[] = [
  { id: "exterior", label: "Exterior" },
  { id: "interior", label: "Interior" },
  { id: "performance", label: "Performance" },
  { id: "details", label: "Details" },
];

export default function CarDetailOverlay() {
  const { detailSlug, closeDetail } = usePlatform();
  const car = detailSlug ? cars.find((c) => c.slug === detailSlug) : null;

  useEffect(() => {
    if (!car) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [car]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeDetail();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeDetail]);

  if (!car) return null;
  return <DetailBody key={car.slug} car={car} />;
}

function DetailBody({ car }: { car: Car }) {
  const { closeDetail, favorites, toggleFavorite, isComparing, toggleCompare } = usePlatform();
  const [tab, setTab] = useState<Tab>("exterior");
  const [testDriveSent, setTestDriveSent] = useState(false);
  const favored = favorites.has(car.slug);
  const comparing = isComparing(car.slug);
  const related = car.related.map((slug) => cars.find((c) => c.slug === slug)).filter(Boolean) as Car[];
  const facts = interiorFacts(car);

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-bg">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/90 px-6 py-4 backdrop-blur-xl">
        <button
          type="button"
          onClick={closeDetail}
          className="flex items-center gap-2 text-sm text-text-soft transition-colors hover:text-accent"
        >
          <span aria-hidden="true">←</span> Back
        </button>
        <p className="font-display text-sm tracking-wide text-text">
          {car.brand} {car.model}
        </p>
        <button
          type="button"
          onClick={closeDetail}
          aria-label="Close"
          className="grid h-9 w-9 place-items-center rounded-full border border-line text-text-soft hover:text-accent"
        >
          ✕
        </button>
      </div>

      <div className="mx-auto max-w-[1200px] px-6 pb-24 pt-10">
        <p className="font-data text-xs tracking-[0.3em] text-accent">{car.brand.toUpperCase()}</p>
        <h1 className="mt-2 font-display text-4xl text-text sm:text-6xl">{car.model}</h1>
        <p className="mt-3 max-w-xl text-lg text-text-soft">{car.tagline}</p>

        {/* gallery */}
        <div className="mt-8 flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full border px-4 py-2 text-xs font-bold tracking-wide transition-colors ${
                tab === t.id ? "border-accent bg-accent text-accent-ink" : "border-line text-text-soft hover:text-text"
              }`}
            >
              {t.label.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="mt-4 aspect-[16/9] overflow-hidden rounded-2xl border border-line bg-bg-2">
          {tab === "exterior" && <CarArt car={car} className="h-full w-full" />}
          {tab === "interior" && <InteriorArt car={car} />}
          {tab === "performance" && <PerformanceGallery car={car} />}
          {tab === "details" && <DetailsGallery car={car} facts={facts} />}
        </div>

        {/* quick specs */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <QuickSpec label="Starting From" value={formatPrice(car.priceFrom)} />
          <QuickSpec label="Horsepower" value={`${car.horsepower} HP`} />
          <QuickSpec label="0–100 km/h" value={`${car.zeroToHundred}s`} />
          <QuickSpec label="Top Speed" value={`${car.topSpeed} km/h`} />
        </div>

        {/* CTAs */}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setTab("performance")}
            className="rounded-full bg-accent px-6 py-3 text-sm font-bold text-accent-ink transition-transform hover:scale-[1.03]"
          >
            EXPLORE THIS CAR
          </button>
          <button
            type="button"
            onClick={() => setTestDriveSent(true)}
            disabled={testDriveSent}
            className="rounded-full border border-line px-6 py-3 text-sm font-bold text-text transition-colors hover:border-accent hover:text-accent disabled:cursor-default disabled:border-accent disabled:text-accent"
          >
            {testDriveSent ? "REQUEST SENT ✓" : "BOOK A TEST DRIVE"}
          </button>
          <button
            type="button"
            onClick={() => toggleCompare(car.slug)}
            className={`rounded-full border px-6 py-3 text-sm font-bold transition-colors ${
              comparing ? "border-accent text-accent" : "border-line text-text hover:border-accent hover:text-accent"
            }`}
          >
            {comparing ? "COMPARING ✓" : "COMPARE"}
          </button>
          <button
            type="button"
            onClick={() => toggleFavorite(car.slug)}
            className={`rounded-full border px-6 py-3 text-sm font-bold transition-colors ${
              favored ? "border-accent text-accent" : "border-line text-text hover:border-accent hover:text-accent"
            }`}
          >
            {favored ? "SAVED ♥" : "SAVE TO FAVORITES"}
          </button>
        </div>

        {/* performance numbers */}
        <div className="mt-20 border-t border-line-soft pt-14">
          <p className="font-data text-xs tracking-[0.3em] text-accent">PERFORMANCE</p>
          <div className="mt-6 grid grid-cols-2 gap-8 sm:grid-cols-4">
            <BigNumber value={car.horsepower} label="HORSEPOWER" />
            <BigNumber value={car.torqueNm} label="NM TORQUE" />
            <BigNumber value={car.zeroToHundred} decimals={1} label="SECONDS 0–100" />
            <BigNumber value={car.topSpeed} label="KM/H TOP SPEED" />
          </div>
        </div>

        {/* design & interior */}
        <div className="mt-20 grid grid-cols-1 gap-10 border-t border-line-soft pt-14 md:grid-cols-2">
          <div className="aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-bg-2">
            <InteriorArt car={car} />
          </div>
          <div>
            <h2 className="font-display text-3xl text-text sm:text-4xl">DESIGNED AROUND THE DRIVER.</h2>
            <p className="mt-4 text-base leading-relaxed text-text-soft">{car.interiorNote}</p>
            <dl className="mt-6 grid grid-cols-2 gap-5">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="font-data text-[11px] uppercase tracking-[0.15em] text-text-faint">{f.label}</dt>
                  <dd className="mt-1 text-sm text-text">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* description */}
        <div className="mt-20 border-t border-line-soft pt-14">
          <p className="max-w-2xl text-base leading-relaxed text-text-soft">{car.description}</p>
        </div>

        {/* related */}
        {related.length > 0 && (
          <div className="mt-20 border-t border-line-soft pt-14">
            <h2 className="font-display text-3xl text-text">YOU MIGHT ALSO LIKE</h2>
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((c) => (
                <CarCard key={c.slug} car={c} compact />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickSpec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg-2 p-4">
      <p className="font-data text-lg text-text">{value}</p>
      <p className="mt-1 text-[11px] text-text-faint">{label}</p>
    </div>
  );
}

function BigNumber({ value, label, decimals = 0 }: { value: number; label: string; decimals?: number }) {
  return (
    <div>
      <p className="font-display text-5xl text-accent sm:text-6xl">
        <AnimatedNumber value={value} decimals={decimals} />
      </p>
      <p className="mt-2 font-data text-xs tracking-[0.15em] text-text-faint">{label}</p>
    </div>
  );
}

function PerformanceGallery({ car }: { car: Car }) {
  return (
    <div className="grid h-full grid-cols-2 gap-px bg-line-soft sm:grid-cols-4">
      {[
        { v: car.horsepower, l: "HP" },
        { v: car.torqueNm, l: "NM" },
        { v: car.zeroToHundred, l: "0-100", d: 1 },
        { v: car.topSpeed, l: "KM/H" },
      ].map((s) => (
        <div key={s.l} className="flex flex-col items-center justify-center bg-bg-2">
          <p className="font-display text-3xl text-accent sm:text-4xl">
            <AnimatedNumber value={s.v} decimals={s.d ?? 0} />
          </p>
          <p className="mt-2 font-data text-[10px] tracking-[0.2em] text-text-faint">{s.l}</p>
        </div>
      ))}
    </div>
  );
}

function DetailsGallery({ car, facts }: { car: Car; facts: { label: string; value: string }[] }) {
  return (
    <div className="flex h-full flex-col justify-center gap-6 bg-bg-2 p-8 sm:p-12">
      <p className="max-w-xl text-sm leading-relaxed text-text-soft">{car.description}</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label}>
            <p className="font-data text-[10px] uppercase tracking-[0.15em] text-text-faint">{f.label}</p>
            <p className="mt-1 text-xs text-text">{f.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
