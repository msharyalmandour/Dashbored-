import { tr } from "./i18n";
import type { ResearchType } from "../data/types";

/** محطات «أجمع وأحلّل» الأربع — تنحسب من بيانات موجودة أصلًا (الاستبيانات، الموافقة الأخلاقية،
    قائمة «قبل جمع البيانات»، المنهجية). عرض بس: ما ينحفظ منها شي. */

export type StationKey = "instrument" | "consent" | "field" | "analysis";
export type StationState = "done" | "now" | "next";

export interface StationInput {
  researchType: ResearchType;
  /** فيه استبيان رئيسي (مو تجريبي) فيه أسئلة */
  hasInstrument: boolean;
  /** «إذن الأداة + النسخة النهائية جاهزة» معلّمة بقائمة قبل جمع البيانات */
  toolChecked: boolean;
  ethicsGranted: boolean;
  /** «نموذج الموافقة جاهز» معلّمة بقائمة قبل جمع البيانات */
  consentChecked: boolean;
  collected: number;
  target: number | null;
}

export interface Station {
  key: StationKey;
  state: StationState;
  done: boolean;
}

/** نوع الدراسة كيفي؟ (المختلطة نعاملها ككمية لأن الردود هي اللي عندنا بيانات لها) */
export const isQualitative = (t: ResearchType) => t === "qualitative";

export const unitLabel = (t: ResearchType, n: number) =>
  isQualitative(t) ? (n === 1 ? tr("مقابلة") : tr("مقابلات")) : n === 1 ? tr("رد") : tr("ردود");

export function computeStations(i: StationInput): Station[] {
  const done: Record<StationKey, boolean> = {
    instrument: i.hasInstrument || i.toolChecked,
    consent: i.ethicsGranted || i.consentChecked,
    field: i.target !== null && i.target > 0 && i.collected >= i.target,
    analysis: false,
  };
  const order: StationKey[] = ["instrument", "consent", "field", "analysis"];
  // المحطة الحالية = أول محطة ما خلصت. بس لو بدأ الجمع فعلًا (فيه ردود) فالميدان هو الحالي حتى لو ورقة ناقصة
  let current = order.find((k) => !done[k]) ?? "analysis";
  if (i.collected > 0 && !done.field && (current === "instrument" || current === "consent")) current = "field";
  const curIdx = order.indexOf(current);
  return order.map((key, idx) => ({
    key,
    done: done[key],
    state: key === current ? "now" : done[key] || idx < curIdx ? "done" : "next",
  }));
}

/** ردود تراكمية لآخر `days` أيام فيها ردود (لرسم اكتمال العينة) */
export function cumulativeByDay(dates: string[], days = 8): { day: string; total: number }[] {
  const byDay = new Map<string, number>();
  for (const d of dates) {
    const k = d.slice(0, 10);
    byDay.set(k, (byDay.get(k) ?? 0) + 1);
  }
  const keys = [...byDay.keys()].sort();
  let run = 0;
  const all = keys.map((day) => ({ day, total: (run += byDay.get(day)!) }));
  return all.slice(-days);
}
