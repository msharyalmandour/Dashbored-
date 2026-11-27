import type { Team } from "../data/types";
import { tr } from "./i18n";

export type PlanId = "basic" | "ai";

/** التسعيرة (قرار المالك 2026-11-27): السعر للطالب، والوكيل داخل السعر (ما فيه باقة بدون وكيل).
    - لحالك: PER_MEMBER_MONTHLY بالشهر.
    - فريق (عضوين أو أكثر): TEAM_MONTHLY للطالب، والفرق المؤسِّسة (أول FOUNDING_TEAMS فريق) FOUNDING_TEAM_MONTHLY ثابت.
    - باقة البحث كامل: دفعة وحدة للطالب تغطي RESEARCH_MONTHS شهور.
    لازم يطابق public.team_monthly_total() / public.team_research_total() بقاعدة البيانات وحسبة moyasar-webhook و ai-assist/billing.ts. */
export const PER_MEMBER_MONTHLY = 37;
export const TEAM_MONTHLY = 29;
export const FOUNDING_TEAM_MONTHLY = 27;
export const FOUNDING_TEAMS = 50;
export const RESEARCH_MONTHS = 8;
export const PER_MEMBER_RESEARCH = 249;
export const TEAM_RESEARCH = 199;
export const FOUNDING_TEAM_RESEARCH = 179;
export const MAX_TEAM_MEMBERS = 5;
export const TRIAL_DAYS = 14;

export type BillingPeriod = "monthly" | "research";

/** سعر الطالب الواحد بالشهر */
export function perMemberMonthly(members: number, isFounder: boolean): number {
  if (members <= 1) return PER_MEMBER_MONTHLY;
  return isFounder ? FOUNDING_TEAM_MONTHLY : TEAM_MONTHLY;
}

/** سعر الطالب الواحد لباقة البحث كامل */
export function perMemberResearch(members: number, isFounder: boolean): number {
  if (members <= 1) return PER_MEMBER_RESEARCH;
  return isFounder ? FOUNDING_TEAM_RESEARCH : TEAM_RESEARCH;
}

/** إجمالي اشتراك الفريق بالشهر (plan باقي للتوافق، وما يغيّر السعر) */
export function teamMonthlyTotal(_plan: PlanId, isFounder: boolean, members: number): number {
  return perMemberMonthly(members, isFounder) * Math.max(members, 1);
}

/** إجمالي باقة البحث كامل للفريق */
export function teamResearchTotal(isFounder: boolean, members: number): number {
  return perMemberResearch(members, isFounder) * Math.max(members, 1);
}

/** التوفير بالباقة مقارنة بالدفع الشهري طول مدة البحث، للطالب */
export function researchSaving(members: number, isFounder: boolean): number {
  return perMemberMonthly(members, isFounder) * RESEARCH_MONTHS - perMemberResearch(members, isFounder);
}

/** نصيب العضو لما كل واحد يدفع لحاله — يتقرّب لفوق عشان يغطي رسوم الدفع الإضافية */
export function memberShare(total: number, members: number): number {
  return Math.ceil(total / Math.max(members, 1));
}

/** ميزات الذكاء الاصطناعي الحصرية لباقة AI — تُعرض بصفحة الباقات والصفحة الرئيسية */
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

/** كل اللي بباقة Basic — مكتوبة كفوائد، تُعرض بصفحة الباقات والصفحة الرئيسية */
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

export interface CompareRow {
  label: string;
  /** true = ✓ / false = ✗ / نص = وصف مختصر لمستوى الميزة بهالباقة */
  basic: boolean | string;
  ai: boolean | string;
}

export interface CompareGroup {
  title: string;
  rows: CompareRow[];
}

/** جدول "وش الفرق بين Basic وAI" — الأرقام لازم تطابق حدود السيرفر (ai-assist / research-agent / study-tools) */
export const planComparison: CompareGroup[] = [
  {
    title: tr("إدارة البحث كاملة"),
    rows: [
      { label: tr("مهام الفريق والتنبيهات والتقويم"), basic: true, ai: true },
      { label: tr("المقترح والمنهجية ومراجعة الأدبيات ومكتبة الأدلة"), basic: true, ai: true },
      { label: tr("استوديو الإحصاء ومخطط الموعد وحقيبة الموافقات"), basic: true, ai: true },
      { label: tr("رابط ومحادثة المشرفة + تقويم الجوال"), basic: true, ai: true },
      { label: tr("تصدير Word ومحاضر الاجتماعات"), basic: true, ai: true },
    ],
  },
  {
    title: tr("الوكيل"),
    rows: [
      { label: tr("كوتش الفريق — يعرف مهامكم ومراحلكم وينصحكم بالأولويات"), basic: false, ai: tr("7 رسائل يوميًا") },
      { label: tr("ويسي للبحث العلمي — دراسات حقيقية قريبة من عنوانكم"), basic: false, ai: tr("عمليتين بحث شهريًا") },
      { label: tr("ملاحظات المشرفة"), basic: tr("تقسيم بسيط (سطر = ملاحظة)"), ai: tr("تقسيم ذكي بالأقسام + مسودة رسالة لها") },
      { label: tr("تدريب المناقشة — أسئلة من مقترحكم الفعلي + شرائح"), basic: false, ai: true },
      { label: tr("تحسين الصياغة الأكاديمية بضغطة زر"), basic: false, ai: true },
      { label: tr("منشئ الاستبيان — مراجعة أسئلتكم بالذكاء مع اقتراح صياغة أوضح"), basic: tr("مدقق تلقائي مجاني"), ai: true },
      { label: tr("القراءة الصوتية"), basic: tr("صوت المتصفح الآلي"), ai: tr("صوت مشاري الطبيعي") },
    ],
  },
];

/** هل فريق المستخدم يقدر يستخدم ميزات الـ AI؟ — أيام التجربة كاملة المزايا.
    (السيرفر هو اللي يفرض القفل فعليًا؛ هذي للواجهة فقط.) */
export function hasAiAccess(team: Pick<Team, "plan" | "isOnTrial"> | null | undefined): boolean {
  if (!team) return true;
  return team.plan === "ai" || team.isOnTrial;
}
