import type { Team } from "../data/types";
import { tr } from "./i18n";

export type PlanId = "basic" | "ai";

/** سعر الإطلاق (2026-10-27): السعر للفريق كامل بالشهر مو لكل عضو.
    لازم يطابق public.team_monthly_total() بقاعدة البيانات وحسبة moyasar-webhook. */
export const SOLO_PRICE = 19;
export const DUO_PRICE = 39;
export const TEAM_PRICE = 49;
/** المساعد الذكي إضافة على اشتراك الفريق */
export const AI_ADDON_SOLO = 19;
export const AI_ADDON_TEAM = 39;
/** الفرق المؤسسة (أول ١٥ فريق) — إضافة المساعد عليهم أرخص مدى اشتراكهم */
export const AI_ADDON_FOUNDER = 19;
export const MAX_TEAM_MEMBERS = 5;
export const TRIAL_DAYS = 14;

/** للعرض بالصفحة الرئيسية: فريق ٣–٥ أعضاء بدون/مع المساعد */
export const BASIC_PRICE = TEAM_PRICE;
export const AI_PRICE = TEAM_PRICE + AI_ADDON_TEAM;

export function basePrice(members: number): number {
  return members <= 1 ? SOLO_PRICE : members === 2 ? DUO_PRICE : TEAM_PRICE;
}

export function aiAddonPrice(members: number, isFounder: boolean): number {
  return members <= 1 ? AI_ADDON_SOLO : isFounder ? AI_ADDON_FOUNDER : AI_ADDON_TEAM;
}

/** إجمالي اشتراك الفريق بالشهر */
export function teamMonthlyTotal(plan: PlanId, isFounder: boolean, members: number): number {
  return basePrice(members) + (plan === "ai" ? aiAddonPrice(members, isFounder) : 0);
}

/** نصيب العضو لما كل واحد يدفع لحاله — يتقرّب لفوق عشان يغطي رسوم الدفع الإضافية */
export function memberShare(total: number, members: number): number {
  return Math.ceil(total / Math.max(members, 1));
}

/** ميزات الذكاء الاصطناعي الحصرية لباقة AI — تُعرض بصفحة الباقات والصفحة الرئيسية */
export const aiFeatures = [
  {
    title: tr("كوتش الفريق (مساعد بحثي)"),
    desc: tr("يعرف وضع فريقكم الفعلي (مهامكم، مراحلكم، موعد التسليم) وينصحكم بالأولويات، ويجاوب أسئلتكم ويشرح المنهجية ويفهم الصور (زي تعليمات المشرفة)، مع سجل لمحادثاتكم. ٧ رسائل يوميًا للفريق (حوالي ٢٠٠ بالشهر)."),
  },
  {
    title: tr("ملاحظات المشرفة وتدريب المناقشة"),
    desc: tr("يقسّم ملاحظات المشرفة لمهام واضحة ويكتب مسودة رسالة لها، ويسألكم أسئلة مناقشة متوقعة من مقترحكم الفعلي مع مخطط شرائح العرض."),
  },
  {
    title: tr("وكيل البحث العلمي"),
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
    title: tr("الذكاء الاصطناعي"),
    rows: [
      { label: tr("كوتش الفريق — يعرف مهامكم ومراحلكم وينصحكم بالأولويات"), basic: false, ai: tr("٧ رسائل يوميًا") },
      { label: tr("وكيل البحث العلمي — دراسات حقيقية قريبة من عنوانكم"), basic: false, ai: tr("عمليتين بحث شهريًا") },
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
