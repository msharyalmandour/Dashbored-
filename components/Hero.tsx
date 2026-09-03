export default function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden px-6 pb-20 pt-20 sm:pt-28"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-1/2 h-[560px] w-[560px] translate-x-1/2 rounded-full bg-accent/10 blur-[120px] sm:right-0 sm:translate-x-1/4"
      />
      <div className="relative mx-auto max-w-4xl text-center">
        <p className="font-data text-xs uppercase tracking-[0.35em] text-accent">
          دِقّة · قطع غيار سيارات
        </p>
        <h1 className="mt-6 font-editorial text-5xl font-extrabold leading-[1.08] text-text sm:text-7xl">
          القطعة المثالية.
          <span className="block text-primary">لسيارتك بالضبط.</span>
        </h1>
        <p className="mx-auto mt-7 max-w-xl text-lg leading-8 text-text-soft">
          سيارتك أكثر من مجرد وسيلة نقل. اختر سيارتك بثلاث خطوات بسيطة،
          ونعرض لك فوراً القطع المصممة لها بالضبط.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#selector"
            className="rounded-diqa border border-primary bg-primary px-7 py-3.5 text-sm font-semibold text-bg transition-all hover:scale-[1.03] hover:bg-transparent hover:text-primary"
          >
            اختر سيارتك
          </a>
          <a
            href="#categories"
            className="rounded-diqa border border-line bg-panel px-7 py-3.5 text-sm font-semibold text-text transition-colors hover:border-accent hover:text-accent"
          >
            تصفح الفئات
          </a>
        </div>
      </div>
    </section>
  );
}
