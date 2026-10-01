import type { Survey } from "../hooks/useSurveys";

export interface CollectionSummary {
  collected: number;
  target: number | null;
  /** من وين جا الهدف: أهداف الاستبيانات نفسها، أو حجم العينة بالمنهجية */
  targetSource: "surveys" | "methodology" | null;
  perSurvey: { id: string; title: string; status: Survey["status"]; isPilot: boolean; count: number; targetN: number | null }[];
}

/** أول رقم بنص حجم العينة («384» أو «حوالي 300 مشارك») — null لو ما فيه رقم */
export function parseSampleSize(text: string): number | null {
  const m = text.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).match(/\d+/);
  return m ? Number(m[0]) : null;
}

/** تقدّم جمع البيانات الحقيقي من ردود الاستبيانات (التجريبية Pilot ما تُحسب — ما تدخل بالعينة النهائية). */
export function summarizeCollection(surveys: Survey[], counts: Record<string, number>, sampleSizeText: string): CollectionSummary {
  const perSurvey = surveys.map((s) => ({ id: s.id, title: s.title, status: s.status, isPilot: s.isPilot, count: counts[s.id] ?? 0, targetN: s.targetN }));
  const main = perSurvey.filter((s) => !s.isPilot);
  const collected = main.reduce((sum, s) => sum + s.count, 0);
  const surveyTarget = main.reduce((sum, s) => sum + (s.targetN ?? 0), 0);
  if (surveyTarget > 0) return { collected, target: surveyTarget, targetSource: "surveys", perSurvey };
  const sample = parseSampleSize(sampleSizeText);
  if (sample && sample > 0) return { collected, target: sample, targetSource: "methodology", perSurvey };
  return { collected, target: null, targetSource: null, perSurvey };
}
