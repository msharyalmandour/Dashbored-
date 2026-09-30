import { cronbachAlpha, describe, type Descriptive } from "./stats";
import { likertOptions, type Question } from "./surveyCoach";
import type { SurveyResponse } from "../hooks/useSurveys";

export type QSummary =
  | { kind: "freq"; q: Question; n: number; rows: { label: string; count: number; percent: number }[] }
  | { kind: "likert"; q: Question; n: number; rows: { label: string; count: number; percent: number }[]; stats: Descriptive | null }
  | { kind: "number"; q: Question; n: number; stats: Descriptive | null }
  | { kind: "text"; q: Question; n: number; latest: string[] };

const pct = (c: number, n: number) => (n ? Math.round((c / n) * 1000) / 10 : 0);

export function summarize(questions: Question[], responses: SurveyResponse[]): QSummary[] {
  return questions.map((q): QSummary => {
    const vals = responses.map((r) => r.answers[q.id]).filter((v) => v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0));
    const n = vals.length;
    if (q.type === "single" || q.type === "multi") {
      const opts = (q.options ?? []).filter((o) => o.trim());
      const counts = new Map<string, number>(opts.map((o) => [o, 0]));
      for (const v of vals) for (const x of Array.isArray(v) ? v : [String(v)]) counts.set(x, (counts.get(x) ?? 0) + 1);
      return { kind: "freq", q, n, rows: [...counts].map(([label, count]) => ({ label, count, percent: pct(count, n) })) };
    }
    if (q.type === "likert") {
      const nums = vals.map((v) => Number(v)).filter((x) => !Number.isNaN(x));
      const rows = likertOptions.map((label, k) => {
        const score = 5 - k;
        const count = nums.filter((x) => x === score).length;
        return { label: `${label} (${score})`, count, percent: pct(count, nums.length) };
      });
      return { kind: "likert", q, n, rows, stats: nums.length ? describe(nums) : null };
    }
    if (q.type === "number") {
      const nums = vals.map((v) => Number(v)).filter((x) => !Number.isNaN(x));
      return { kind: "number", q, n, stats: nums.length ? describe(nums) : null };
    }
    return { kind: "text", q, n, latest: vals.slice(-20).reverse().map(String) };
  });
}

/** ألفا كرونباخ لكل عبارات ليكرت (تفترض أنها تقيس مفهومًا واحدًا — الباحثة تقرر) */
export function likertAlpha(questions: Question[], responses: SurveyResponse[]) {
  const items = questions.filter((q) => q.type === "likert");
  if (items.length < 3 || responses.length < 5) return null;
  const cols = items.map((q) => responses.map((r) => (r.answers[q.id] === undefined ? null : Number(r.answers[q.id]))));
  const res = cronbachAlpha(cols);
  if (!Number.isFinite(res.alpha)) return null;
  return { ...res, items: items.length };
}

export function alphaLabel(a: number): string {
  if (a >= 0.9) return "ممتاز (تأكدوا ما فيه عبارات مكررة)";
  if (a >= 0.8) return "جيد جدًا";
  if (a >= 0.7) return "مقبول";
  if (a >= 0.6) return "ضعيف — راجعوا العبارات";
  return "غير مقبول — العبارات ما تقيس نفس الفكرة";
}

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function rowValues(questions: Question[], r: SurveyResponse): string[] {
  return questions.map((q) => {
    const v = r.answers[q.id];
    return Array.isArray(v) ? v.join("؛ ") : v === undefined ? "" : String(v);
  });
}

/** CSV بترميز UTF-8 مع BOM عشان إكسل يقرأ العربي صح */
export function toCsv(questions: Question[], responses: SurveyResponse[]): string {
  const head = questions.map((q, i) => csvCell(`س${i + 1}: ${q.text}`)).join(",");
  const rows = responses.map((r) => rowValues(questions, r).map(csvCell).join(","));
  return "﻿" + [head, ...rows].join("\r\n");
}

/** جدول مفصول بـ Tab جاهز للصق بـ«استوديو الإحصاء» */
export function toTsv(questions: Question[], responses: SurveyResponse[]): string {
  const head = questions.map((_, i) => `س${i + 1}`).join("\t");
  const rows = responses.map((r) => rowValues(questions, r).map((v) => v.replace(/[\t\r\n]+/g, " ")).join("\t"));
  return [head, ...rows].join("\n");
}

export function downloadText(filename: string, text: string, mime = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
