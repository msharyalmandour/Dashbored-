import { brandOrigins } from "@/lib/mock-data";

export default function BrandOrigins() {
  return (
    <section id="brands" className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-8 flex flex-col gap-3">
        <h2 className="font-editorial text-4xl text-text">
          نغطي سيارتك أياً كان منشأها
        </h2>
        <p className="max-w-xl text-text-soft">
          يابانية، صينية، أو ألمانية — عندنا قطع متوافقة لأشهر العلامات في كل
          فئة. اضغط على أي فئة وابدأ بفحص قطعتك.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {brandOrigins.map((origin) => (
          <a
            key={origin.id}
            href="#identify"
            className="group flex flex-col rounded-diqa border border-line bg-panel p-6 transition-colors hover:border-accent"
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl">{origin.flag}</span>
              <span className="rounded-full border border-line bg-bg px-3 py-1 font-data text-xs text-primary">
                +{origin.partsAvailable} قطعة
              </span>
            </div>
            <h3 className="mt-4 font-editorial text-2xl text-text group-hover:text-accent">
              {origin.label}
            </h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {origin.brands.map((brand) => (
                <span
                  key={brand}
                  className="rounded-full border border-line bg-bg px-2.5 py-1 text-xs text-text-soft"
                >
                  {brand}
                </span>
              ))}
            </div>
            <span className="mt-4 text-sm font-medium text-accent">
              افحص قطعة الآن ←
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
