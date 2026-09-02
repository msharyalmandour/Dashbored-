"use client";

import { useRef } from "react";
import { brands, cars } from "@/lib/cars-data";
import { CarArt, BrandGlyph } from "./CarArt";
import { usePlatform } from "./PlatformContext";

const HUE_BY_BRAND: Record<string, number> = {};
brands.forEach((b, i) => {
  HUE_BY_BRAND[b.name] = (i * 47) % 360;
});

export default function Brands() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const { toggleFilterValue, scrollToDiscover } = usePlatform();

  function scrollBy(delta: number) {
    scrollerRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  }

  return (
    <section id="brands" className="py-24">
      <div className="mx-auto max-w-[1400px] px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-4xl text-text sm:text-5xl">EXPLORE THE BRANDS</h2>
            <p className="mt-3 max-w-md text-text-soft">Every brand has a personality. Find yours.</p>
          </div>
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              aria-label="Scroll brands left"
              onClick={() => scrollBy(-360)}
              className="grid h-10 w-10 place-items-center rounded-full border border-line text-text-soft hover:border-accent hover:text-accent"
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Scroll brands right"
              onClick={() => scrollBy(360)}
              className="grid h-10 w-10 place-items-center rounded-full border border-line text-text-soft hover:border-accent hover:text-accent"
            >
              →
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollerRef} className="no-scrollbar mt-10 flex gap-4 overflow-x-auto px-6 pb-4 sm:px-[calc((100vw-1400px)/2+24px)]">
        {brands.map((brand) => {
          const brandCars = cars.filter((c) => c.brand === brand.name);
          const hero = brandCars[0];
          const hue = HUE_BY_BRAND[brand.name];
          return (
            <button
              key={brand.name}
              type="button"
              onClick={() => {
                toggleFilterValue("brands", brand.name);
                scrollToDiscover();
              }}
              className="group relative h-64 w-56 shrink-0 overflow-hidden rounded-2xl border border-line bg-bg-2 text-left transition-colors hover:border-accent"
            >
              <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                {hero && <CarArt car={hero} className="h-full w-full" />}
                <div className="absolute inset-0 bg-gradient-to-t from-bg-2 via-bg-2/60 to-transparent" />
              </div>

              <div className="relative flex h-full flex-col justify-between p-5">
                <BrandGlyph hue={hue} initial={brand.name[0]} />
                <div>
                  <p className="font-display text-xl text-text">{brand.name.toUpperCase()}</p>
                  <p className="mt-1 font-data text-xs text-text-soft">
                    {brandCars.length} {brandCars.length === 1 ? "MODEL" : "MODELS"} AVAILABLE
                  </p>
                  <p className="mt-3 text-xs font-semibold tracking-wide text-accent opacity-0 transition-opacity group-hover:opacity-100">
                    Explore →
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
