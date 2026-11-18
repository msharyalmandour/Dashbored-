import type { WesyOutfit, WesyState } from "../vendor/wesy-real";

/* مزاج ويسي وملابسه (brand-kit-demo · 5–7):
   - الوقت المحلي للطالب: 5–11 الصبح = زي الصباح (بخار القهوة) · 12 الليل–5 الفجر = يتثاوب «ناموا، أنا أكمل».
   - أقل من 24 ساعة على أي موعد تسليم = زي التسليم + حالة deadline.
   - المناسبات: 23 سبتمبر = اليوم الوطني · رمضان كامل (تقويم أم القرى) · التسليم النهائي = التخرّج.
   - يكبر مع الفريق: 0 لين 30%، 2 (كتب) لين 70%، 3 (كتب + كأس) بعدها. */

export interface WesyMoodInput {
  now?: Date;
  /** مواعيد التسليم الجاية (ISO) */
  deadlines?: string[];
  /** الفريق سلّم البحث النهائي */
  submitted?: boolean;
  /** تقدّم الفريق 0..100 */
  progress?: number;
}
export interface WesyMood {
  outfit: WesyOutfit;
  state?: WesyState;
  stage: number;
  line?: string;
}

export function isRamadan(d: Date): boolean {
  try {
    const m = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura", { month: "numeric", timeZone: "Asia/Riyadh" }).format(d);
    return Number(m) === 9;
  } catch {
    return false;
  }
}

export function stageOf(progress = 0): number {
  return progress >= 70 ? 3 : progress >= 30 ? 2 : 0;
}

export function wesyMood({ now = new Date(), deadlines = [], submitted = false, progress = 0 }: WesyMoodInput = {}): WesyMood {
  const stage = stageOf(progress);
  if (submitted) return { outfit: "grad", state: "celebrate", stage };
  const soon = deadlines.some((iso) => {
    const ms = Date.parse(iso) - now.getTime();
    return ms > 0 && ms < 24 * 3600e3;
  });
  if (soon) return { outfit: "deadline", state: "deadline", stage, line: "باقي أقل من يوم. خطوة وحدة وتخلصون." };
  const h = now.getHours();
  if (h < 5) return { outfit: occasion(now) ?? "normal", state: "yawn", stage, line: "ناموا، أنا أكمل" };
  const occ = occasion(now);
  if (occ) return { outfit: occ, stage };
  if (h >= 5 && h < 11) return { outfit: "morning", stage };
  return { outfit: "normal", stage };
}

function occasion(d: Date): WesyOutfit | null {
  if (d.getMonth() === 8 && d.getDate() === 23) return "national";
  if (isRamadan(d)) return "ramadan";
  return null;
}
