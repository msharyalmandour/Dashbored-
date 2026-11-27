import type { DoorSignals } from "./doors";
import type { NextStep } from "./nextSteps";
import { tr } from "./i18n";

export interface Step {
  /** يتغيّر لما الخطوة تخلص — الكرت يحتفل «تم ✓» ويطلع اللي بعدها */
  key: string;
  title: string;
  why: string;
  to: string;
  cta: string;
  /** «تم ✓ …» لما تخلص */
  done: string;
}

const left = (n: number) => (n === 1 ? tr("دراسة وحدة كمان") : n === 2 ? tr("دراستين كمان") : tr("{0} دراسات كمان", n));

/** خطوة الرحلة الجاية من الشغل الحقيقي: سطر واحد، مكان واحد، وكل وحدة تفتح اللي بعدها */
export function journeyNext(s: DoorSignals): Step {
  if (s.papers < 3) {
    return s.papers === 0
      ? { key: "papers-0", title: tr("جيبوا أول 3 دراسات عن موضوعكم"), why: tr("المقترح ينفتح لكم بعد أول دراسة"), to: "/research-search?tab=studies", cta: tr("يلا نبدأ"), done: tr("تم ✓ أول دراسة") }
      : { key: `papers-${s.papers}`, title: tr("باقي {0} وتكتمل أول 3", left(3 - s.papers)), why: tr("كل دراسة تقوّي الفجوة البحثية"), to: "/research-search?tab=studies", cta: tr("كمّلوا البحث"), done: tr("تم ✓ أول 3 دراسات") };
  }
  if (s.sectionsWritten === 0) return { key: "sec-0", title: tr("اكتبوا أول قسم بالمقترح"), why: tr("ابدأوا بالخلفية — المساعد يكتب لكم مسودة من دراساتكم"), to: "/proposal", cta: tr("اكتبوا الحين"), done: tr("تم ✓ أول قسم") };
  if (s.sectionsWritten < 4) return { key: `sec-${s.sectionsWritten}`, title: tr("كمّلوا المقترح — {0} من 7", s.sectionsWritten), why: tr("المنهجية انفتحت لكم، بس المقترح أول"), to: "/proposal", cta: tr("كمّلوا الكتابة"), done: tr("تم ✓ قسم جديد") };
  if (s.methodReady < 4) return { key: `meth-${s.methodReady}`, title: tr("جهّزوا المنهجية — {0} من 7", s.methodReady), why: tr("جمع البيانات ينفتح لما توصلون 4"), to: "/methodology", cta: tr("افتحوا المنهجية"), done: tr("تم ✓ جزء من المنهجية") };
  if (s.sectionsWritten < 7) return { key: `sec-${s.sectionsWritten}`, title: tr("كمّلوا المقترح — {0} من 7", s.sectionsWritten), why: tr("المقترح الكامل هو اللي تعتمده الدكتورة"), to: "/proposal", cta: tr("كمّلوا الكتابة"), done: tr("تم ✓ قسم جديد") };
  if (s.methodReady < 7) return { key: `meth-${s.methodReady}`, title: tr("كمّلوا المنهجية — {0} من 7", s.methodReady), why: tr("آخر خطوة قبل الموافقة الأخلاقية"), to: "/methodology", cta: tr("افتحوا المنهجية"), done: tr("تم ✓ جزء من المنهجية") };
  if (s.surveys === 0) return { key: "survey", title: tr("جهّزوا أداة جمع البيانات"), why: tr("الاستبيان والموافقات بمكان واحد"), to: "/study-kit", cta: tr("افتحوا الحقيبة"), done: tr("تم ✓ الأداة جاهزة") };
  return { key: "collect", title: tr("اجمعوا البيانات وحلّلوها"), why: tr("تابعوا العدد من المحطات"), to: "/collect", cta: tr("افتحوا المحطات"), done: tr("تم ✓") };
}

/** الأولوية: مهمة متأخرة عليكم أول، وإلا خطوة الرحلة */
export function pickStep(urgent: NextStep | undefined, s: DoorSignals | null, fallback: NextStep | undefined): Step | null {
  // «ادعوا فريقكم» (فريق أقل من 3) أو مهمة متأخرة عليكم: قبل خطوة الرحلة
  if (urgent && urgent.tone === "urgent" && (urgent.id === "my-late" || urgent.id === "invite")) return { key: `u-${urgent.title}`, title: urgent.title, why: urgent.why, to: urgent.to, cta: urgent.cta, done: tr("تم ✓") };
  if (s) return journeyNext(s);
  if (fallback) return { key: `f-${fallback.id}`, title: fallback.title, why: fallback.why, to: fallback.to, cta: fallback.cta, done: tr("تم ✓") };
  return null;
}
