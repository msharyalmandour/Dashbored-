import { Star } from "lucide-react";

const TESTIMONIALS = [
  {
    name: "سارة العتيبي",
    text: "عطر ليالي الحرير أصبح توقيعي الخاص، الثبات ممتاز والرائحة فخمة جداً.",
  },
  {
    name: "فهد القحطاني",
    text: "عود الملوك تحفة حقيقية، التغليف فاخر والتوصيل كان سريع جداً.",
  },
  {
    name: "نورة الدوسري",
    text: "تجربة تسوق راقية من البداية للنهاية، وخدمة العملاء متعاونة جداً.",
  },
];

export function Testimonials() {
  return (
    <section className="border-y border-border bg-surface/60">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col items-center gap-3 text-center">
          <span className="text-xs tracking-[0.3em] text-gold">آراء عملائنا</span>
          <h2 className="font-display text-3xl text-foreground sm:text-4xl">
            ثقة تستحق الأثر
          </h2>
          <div className="gold-divider w-16" />
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl border border-border bg-surface-raised p-8 text-center"
            >
              <div className="mb-4 flex justify-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} className="fill-gold text-gold" />
                ))}
              </div>
              <p className="text-sm leading-7 text-foreground/85">“{t.text}”</p>
              <p className="mt-5 text-sm font-bold text-gold">{t.name}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
