// حدود «ارموا أي شي» — كل الأرقام هنا بمكان واحد.

/** قراءات الذكاء لكل فريق بالشهر، حسب الباقة (teams.plan). الكاش ما ينحسب. */
export const MONTHLY_AI_READS: Record<string, number> = {
  basic: 20, // المجانية
  trial: 20, // فترة التجربة
  ai: 150, // باقة المساعد الذكي
};

export const MAX_FILES_PER_DROP = 10;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
/** أكبر صورة تقبلها القراءة (الواجهة تصغّر الصور قبل الرفع) */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
/** أكبر PDF ممسوح نرسله للقراءة كصفحات (النصي يروح نص) */
export const MAX_SCANNED_PDF_BYTES = 20 * 1024 * 1024;
/** مجموع الصفحات/الصور المرفقة بنداء واحد (حد الطلب ٣٢ ميغا بعد base64) */
export const MAX_ATTACH_BYTES = 20 * 1024 * 1024;
/** نص كل عنصر للتصنيف */
export const MAX_ITEM_CHARS = 40_000;
/** مجموع النص لكل رمية */
export const MAX_DROP_CHARS = 120_000;
/** أقل من كذا حرف بالصفحة = PDF ممسوح (نقراه صفحات) */
export const MIN_TEXT_PER_PAGE = 200;
/** روابط نفتحها من النص الملصوق */
export const MAX_LINKS = 3;

/** أرخص نموذج أول، والأكبر بس لو الرد مو سليم أو الثقة واطية */
export const MODEL_FAST = "claude-haiku-5-5";
export const MODEL_STRONG = "claude-sonnet-5-5";
export const ESCALATE_BELOW = 0.75;
/** «متأكدين» من .75 وفوق، وتحتها «تأكدوا منها» */
export const CONFIDENT_AT = 0.75;

export function monthlyLimit(plan: string | null | undefined, onTrial: boolean | null | undefined): number {
  if (plan === "ai") return MONTHLY_AI_READS.ai;
  if (onTrial) return MONTHLY_AI_READS.trial;
  return MONTHLY_AI_READS.basic;
}
