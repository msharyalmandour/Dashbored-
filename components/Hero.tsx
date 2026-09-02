export default function Hero() {
  return (
    <section id="top" className="mx-auto max-w-6xl px-6 pb-16 pt-14 sm:pt-20">
      <div className="grid items-center gap-10 sm:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="font-data text-xs uppercase tracking-[0.3em] text-accent">
            دِقّة · قطع غيار سيارات
          </p>
          <h1 className="mt-4 font-editorial text-5xl leading-[1.15] text-text sm:text-6xl">
            القطعة الصحيحة، لسيارتك بالضبط
            <span className="block text-primary">من غير تخمين</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-text-soft">
            أدخل رقم شاصي سيارتك (VIN) أو صوّر القطعة العطلانة، ودِقّة تطابقها
            بدقة مع قطع الغيار المتوافقة فعلياً — بدون بحث عشوائي وبدون قطع
            غلط.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#explorer"
              className="rounded-diqa border border-primary bg-primary px-6 py-3 text-sm font-medium text-bg transition-colors hover:bg-transparent hover:text-primary"
            >
              استكشف السيارة
            </a>
            <a
              href="#identify"
              className="rounded-diqa border border-line bg-panel px-6 py-3 text-sm font-medium text-text transition-colors hover:border-accent hover:text-accent"
            >
              اسأل الذكاء الاصطناعي
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
              className="rounded-diqa border border-line bg-panel p-5"
            >
              <div className="font-data text-2xl text-primary">
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
