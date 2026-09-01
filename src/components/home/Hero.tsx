import Link from "next/link";
import { PerfumeBottle } from "@/components/ui/PerfumeBottle";
import { SITE } from "@/lib/constants";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 20%, rgba(202,161,77,0.18), transparent 55%), radial-gradient(circle at 80% 70%, rgba(202,161,77,0.12), transparent 50%)",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-32 lg:px-8">
        <div className="order-2 text-center lg:order-1 lg:text-right">
          <span className="inline-block rounded-full border border-gold/40 px-4 py-1 text-xs tracking-[0.25em] text-gold">
            دار عطور سعودية فاخرة
          </span>

          <h1 className="font-display mt-6 text-4xl leading-tight text-foreground sm:text-5xl lg:text-6xl">
            عطور تُصاغ لتترك{" "}
            <span className="gold-gradient-text">أثراً</span> لا يُنسى
          </h1>

          <p className="mx-auto mt-6 max-w-lg text-base leading-8 text-muted lg:mr-0">
            {SITE.description} اكتشف تشكيلة {SITE.name} من العطور الشرقية
            والعودية والزهرية، المصنوعة من أجود الخامات العالمية.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-end">
            <Link
              href="/shop"
              className="w-full rounded-full bg-gold px-8 py-3.5 text-center text-sm font-bold tracking-wide text-background transition-transform hover:scale-[1.02] sm:w-auto"
            >
              تسوق المجموعة
            </Link>
            <Link
              href="/#story"
              className="w-full rounded-full border border-border px-8 py-3.5 text-center text-sm tracking-wide text-foreground transition-colors hover:border-gold hover:text-gold sm:w-auto"
            >
              قصتنا
            </Link>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted lg:justify-end">
            <span>✦ خامات أصلية 100%</span>
            <span>✦ شحن لكافة مناطق المملكة</span>
            <span>✦ دفع آمن</span>
          </div>
        </div>

        <div className="order-1 flex justify-center lg:order-2">
          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-full bg-gold/10 blur-3xl" />
            <PerfumeBottle
              accentColor="#caa14d"
              className="h-72 w-auto drop-shadow-[0_30px_60px_rgba(202,161,77,0.25)] sm:h-96"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
