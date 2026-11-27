import type { Team } from "../data/types";
import { tr } from "./i18n";

/** "basic" باقي بس للفرق القديمة — من 2026-11-19 كل اشتراك مدفوع = "ai" (الويبهوك يثبّته) */
export type PlanId = "basic" | "ai";

/** السعر (قرار المالك 2026-11-27، المرة الثانية): لكل طالب، شامل كل شي (الوكيل داخل)، والدكتورة مجانًا.
    ثلاث شرائح حسب الفريق، وثلاث مدد — «الفصل» موجود عشان يبيّن إن «السنة الدراسية» هي الأوفر.
    - solo: لحالك · team: فريق من شخصين أو أكثر · founding: الفرق المؤسِّسة (أول FOUNDING_TEAMS فريق، is_founder)
    - legacy: الفرق اللي دفعت قبل التغيير — وعد «سعرك ثابت لين تتخرجون» (teams.price_tier = 'legacy')
    لازم يطابق moyasar-webhook و ai-assist/billing.ts و public.team_monthly_total(). */
export type PriceTier = "solo" | "team" | "founding" | "legacy";
export const TIER_PRICES: Record<PriceTier, Record<"month" | "semester" | "year", number>> = {
  solo: { month: 37, semester: 129, year: 249 },
  team: { month: 29, semester: 99, year: 199 },
  founding: { month: 27, semester: 89, year: 179 },
  legacy: { month: 15, semester: 49, year: 99 },
};
export const FOUNDING_TEAMS = 50;
/** سعر الطالب الشهري للفريق العادي (للعرض العام) */
export const PRICE_PER_PERSON = TIER_PRICES.team.month;
/** خصم الاستمرار: فريق اشتغل كل أسبوع آخر ٤ أسابيع → الشهري ينقص 3 ريال (السيرفر يتحقق: team_streak_ok) */
export const STREAK_DISCOUNT = 3;
/** «مقعد لزميل محتاج»: إضافة اختيارية عند الدفع تروح لصندوق المنح */
export const GRANT_DONATION = 5;
export const MAX_TEAM_MEMBERS = 5;
export const TRIAL_DAYS = 14;

export type BillingPeriod = "month" | "semester" | "year";
export interface PlanOption {
  id: BillingPeriod;
  days: number;
  months: number;
}
export const PLAN_OPTIONS: PlanOption[] = [
  { id: "month", days: 30, months: 1 },
  { id: "semester", days: 120, months: 4 },
  { id: "year", days: 270, months: 9 },
];
export const BEST_PLAN: BillingPeriod = "year";

export const planOf = (id: BillingPeriod): PlanOption => PLAN_OPTIONS.find((p) => p.id === id) ?? PLAN_OPTIONS[0];

/** شريحة الفريق: legacy تغلب، بعدها لحالك، بعدها المؤسسين */
export function tierOf(members: number, isFounder = false, priceTier?: string | null): PriceTier {
  if (priceTier === "legacy") return "legacy";
  if (members <= 1) return "solo";
  return isFounder ? "founding" : "team";
}

/** سعر الطالب لهالمدة (الشهري ينقص مع خصم الاستمرار) */
export function personPrice(period: BillingPeriod, streak = false, tier: PriceTier = "team"): number {
  const base = TIER_PRICES[tier][period];
  return period === "month" && streak ? base - STREAK_DISCOUNT : base;
}

/** كم يوفّر الطالب بالمدة الطويلة مقارنة بالدفع الشهري لنفس الشهور */
export function planSaving(period: BillingPeriod, tier: PriceTier = "team"): number {
  return planOf(period).months * TIER_PRICES[tier].month - TIER_PRICES[tier][period];
}

/** سعر الشهر للمقارنة */
export const perMonth = (period: BillingPeriod, tier: PriceTier = "team"): number =>
  Math.round((TIER_PRICES[tier][period] / planOf(period).months) * 100) / 100;

/** اشتراك الفريق بالشهر (للعرض ولوحة الأدمن) */
export function teamMonthlyTotal(members: number, isFounder = false, priceTier?: string | null): number {
  const m = Math.max(members, 1);
  return TIER_PRICES[tierOf(m, isFounder, priceTier)].month * m;
}

/** كم يوم تمدد دفعة للفريق — نفس معادلة moyasar-webhook: المبلغ × أيام المدة ÷ (الأعضاء × سعر الطالب) */
export function daysForPayment(amount: number, period: BillingPeriod, members: number, streak = false, tier: PriceTier = "team"): number {
  const plan = planOf(period);
  return Math.max(Math.round((amount * plan.days) / (Math.max(members, 1) * personPrice(period, streak, tier))), 1);
}

/** ميزات الوكيل — داخل الاشتراك */
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
