import type { Team } from "../data/types";
import { tr } from "./i18n";

/** "basic" باقي بس للفرق القديمة — من 2026-11-19 كل اشتراك مدفوع = "ai" (الويبهوك يثبّته) */
export type PlanId = "basic" | "ai";

/** السعر (2026-11-27): لكل شخص، شامل كل شي (المساعد الذكي داخل)، والدكتورة مجانًا.
    ثلاث مدد — «الفصل» موجود عشان يبيّن إن «السنة الدراسية» هي الأوفر (أثر الطُعم).
    لازم يطابق moyasar-webhook و public.team_monthly_total() (= 15 × الأعضاء).
    وعد «سعرك ثابت لين تتخرجون»: أي تغيير مستقبلي ما يطبّق على فريق دفع قبله (الويبهوك يحسب بالسعر المكتوب بالدفعة). */
export const PRICE_PER_PERSON = 15;
/** خصم الاستمرار: فريق اشتغل كل أسبوع آخر ٤ أسابيع → الشهري بـ 12 (السيرفر يتحقق: team_streak_ok) */
export const STREAK_PRICE = 12;
/** «مقعد لزميل محتاج»: إضافة اختيارية عند الدفع تروح لصندوق المنح */
export const GRANT_DONATION = 5;
export const MAX_TEAM_MEMBERS = 5;
export const TRIAL_DAYS = 14;

export type BillingPeriod = "month" | "semester" | "year";
export interface PlanOption {
  id: BillingPeriod;
  price: number;
  days: number;
  months: number;
}
export const PLAN_OPTIONS: PlanOption[] = [
  { id: "month", price: 15, days: 30, months: 1 },
  { id: "semester", price: 49, days: 120, months: 4 },
  { id: "year", price: 99, days: 270, months: 9 },
];
export const BEST_PLAN: BillingPeriod = "year";

export const planOf = (id: BillingPeriod): PlanOption => PLAN_OPTIONS.find((p) => p.id === id) ?? PLAN_OPTIONS[0];

/** سعر الشخص لهالمدة (الشهري ينزل لـ 12 مع خصم الاستمرار) */
export function personPrice(period: BillingPeriod, streak = false): number {
  return period === "month" && streak ? STREAK_PRICE : planOf(period).price;
}

/** كم يوفّر الشخص بالمدة الطويلة مقارنة بالدفع الشهري لنفس الشهور */
export function planSaving(period: BillingPeriod): number {
  const p = planOf(period);
  return p.months * PRICE_PER_PERSON - p.price;
}

/** سعر الشهر للمقارنة (11 للسنة الدراسية، 12.25 للفصل) */
export const perMonth = (period: BillingPeriod): number => Math.round((planOf(period).price / planOf(period).months) * 100) / 100;

/** اشتراك الفريق بالشهر (للعرض ولوحة الأدمن) */
export function teamMonthlyTotal(members: number): number {
  return PRICE_PER_PERSON * Math.max(members, 1);
}

/** كم يوم تمدد دفعة للفريق — نفس معادلة moyasar-webhook: المبلغ × أيام المدة ÷ (الأعضاء × سعر الشخص) */
export function daysForPayment(amount: number, period: BillingPeriod, members: number, streak = false): number {
  const plan = planOf(period);
  return Math.max(Math.round((amount * plan.days) / (Math.max(members, 1) * personPrice(period, streak))), 1);
}

/** ميزات المساعد الذكي — داخل الاشتراك */
export const aiFeatures = [
  {
    title: tr("كوتش الفريق (مساعد بحثي)"),
    desc: tr("يعرف وضع فريقكم الفعلي (مهامكم، مراحلكم، موعد التسليم) وينصحكم بالأولويات، ويجاوب أسئلتكم ويشرح المنهجية ويفهم الصور (زي تعليمات المشرفة)، مع سجل لمحادثاتكم. 7 رسائل يوميًا للفريق (حوالي 200 بالشهر)."),
  },
  {
    title: tr("ملاحظات المشرفة وتدريب المناقشة"),
    desc: tr("يقسّم ملاحظات المشرفة لمهام واضحة ويكتب مسودة رسالة لها، ويسألكم أسئلة مناقشة متوقعة من مقترحكم الفعلي مع مخطط شرائح العرض."),
  },
  {
    title: tr("ويسي للبحث العلمي"),
    desc: tr("يبحث بالويب عن دراسات حقيقية قريبة من عنوان بحثكم، مع ملخص عربي وسبب الصلة وتصنيف المصدر، ويقول لكم وش الجديد بدراستكم. عمليتين بحث شهريًا للفريق."),
  },
  {
    title: tr("تحسين الصياغة الأكاديمية"),
    desc: tr("بضغطة زر يحوّل نصكم لصياغة أوضح وأدق بنفس لغته."),
  },
  {
    title: tr("صوت طبيعي"),
    desc: tr("قراءة صوتية بصوت مشاري الطبيعي بدل صوت المتصفح الآلي."),
  },
] as const;

/** أدوات إدارة البحث — مكتوبة كفوائد */
export const basicHighlights = [
  tr("لوحة فريقكم: مهام وتوزيع أعمال وتنبيه بالمتأخر — بدون قروب واتساب ضايع"),
  tr("المقترح والمنهجية ومراجعة الأدبيات مرتبة خطوة بخطوة، مع مكتبة أدلتكم"),
  tr("استوديو الإحصاء: اختاروا الاختبار الصح واحسبوه وفسّروه بالعربي"),
  tr("منشئ استبيان تعليمي: يعلّمكم صياغة الأسئلة ويجمع الردود ويحلّلها ويحسب الثبات"),
  tr("ملاحظات المشرفة: رابط محادثة لها بدون حساب، وتتحوّل لقائمة مهام تخلّصونها وحدة وحدة"),
  tr("حقيبة الاستبيان والموافقات: نماذج الإذن والموافقة وقوائم التحقق وخطوات الترجمة"),
  tr("مخطط الموعد: من يوم التسليم يوزّع لكم الأسابيع للخلف"),
  tr("تقويم جوالكم: مهامكم ومواعيدكم تنزل على تقويم آيفون/أندرويد وقوقل"),
  tr("تصدير Word ومحاضر الاجتماعات، ودعوة كل الفريق بدون حد"),
] as const;

/** هل فريق المستخدم يقدر يستخدم ميزات الـ AI؟ — أيام التجربة كاملة المزايا.
    (السيرفر هو اللي يفرض القفل فعليًا؛ هذي للواجهة فقط.) */
export function hasAiAccess(team: Pick<Team, "plan" | "isOnTrial"> | null | undefined): boolean {
  if (!team) return true;
  return team.plan === "ai" || team.isOnTrial;
}
