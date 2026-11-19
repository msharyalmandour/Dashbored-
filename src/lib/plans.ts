import type { Team } from "../data/types";
import { tr } from "./i18n";

/** "basic" باقي بس للفرق القديمة — من 2026-11-19 كل اشتراك مدفوع = "ai" (الويبهوك يثبّته) */
export type PlanId = "basic" | "ai";

/** السعر (2026-11-19): اشتراك واحد شامل كل شي (المساعد الذكي داخل) — للفريق كامل بالشهر مو لكل عضو.
    لازم يطابق public.team_monthly_total() بقاعدة البيانات وحسبة moyasar-webhook. */
export const SOLO_PRICE = 19;
export const DUO_PRICE = 39;
export const TEAM_PRICE = 60;
export const MAX_TEAM_MEMBERS = 5;
export const TRIAL_DAYS = 14;

/** السنوي: تدفعون 10 شهور وتاخذون 12 (شهرين مجانًا) */
export type BillingPeriod = "month" | "year";
export const ANNUAL_MONTHS = 10;
export const FREE_MONTHS = 12 - ANNUAL_MONTHS;

export function teamMonthlyTotal(members: number): number {
  return members <= 1 ? SOLO_PRICE : members === 2 ? DUO_PRICE : TEAM_PRICE;
}

export function teamAnnualTotal(members: number): number {
  return teamMonthlyTotal(members) * ANNUAL_MONTHS;
}

export function periodTotal(members: number, period: BillingPeriod): number {
  return period === "year" ? teamAnnualTotal(members) : teamMonthlyTotal(members);
}

/** نصيب العضو لما كل واحد يدفع لحاله — يتقرّب لفوق عشان يغطي رسوم الدفع الإضافية */
export function memberShare(total: number, members: number): number {
  return Math.ceil(total / Math.max(members, 1));
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
