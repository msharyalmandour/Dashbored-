export default function Hero() {
  return (
    <section
      id="top"
      className="relative overflow-hidden px-6 pb-16 pt-14 sm:pt-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-1/2 h-[560px] w-[560px] translate-x-1/2 rounded-full bg-accent/10 blur-[120px] sm:right-0 sm:translate-x-1/4"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 sm:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="font-data text-xs uppercase tracking-[0.3em] text-accent">
            دِقّة · قطع غيار سيارات
          </p>
          <h1 className="mt-4 font-editorial text-5xl font-extrabold leading-[1.1] text-text sm:text-6xl">
            القطعة الصحيحة، لسيارتك بالضبط
            <span className="block text-primary">من غير تخمين</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-text-soft">
            صوّر القطعة العطلانة أو أدخل رقم شاصي سيارتك (VIN)، ودِقّة تطابقها
            بدقة مع قطع الغيار المتوافقة فعلياً — بدون بحث عشوائي وبدون قطع
            غلط.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#identify"
              className="rounded-diqa border border-primary bg-primary px-6 py-3 text-sm font-semibold text-bg transition-all hover:scale-[1.03] hover:bg-transparent hover:text-primary"
            >
              صوّر قطعتك الآن
            </a>
            <a
              href="#explorer"
              className="rounded-diqa border border-line bg-panel px-6 py-3 text-sm font-semibold text-text transition-colors hover:border-accent hover:text-accent"
            >
              استكشف السيارة
            </a>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-4">
          {[
            { value: "+120", label: "ألف قطعة مفهرسة" },
            { value: "17", label: "رقم — دقة VIN" },
            { value: "٪93", label: "متوسط دقة التعرف" },
            { value: "24/7", label: "بحث ذكي متاح" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-diqa border border-line bg-panel p-5 transition-colors hover:border-accent/50"
            >
              <div className="font-data text-2xl font-semibold text-primary">
                {stat.value}
              </div>
              <div className="mt-1 text-xs text-text-soft">{stat.label}</div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
