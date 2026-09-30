/** المخطط العكسي: من تاريخ التسليم النهائي نرجع للخلف ونوزّع الوقت المتبقي على المراحل غير المنتهية بأوزان واقعية،
    مع هامش أمان قبل التسليم. أوزان المراحل تقديرية (من توزيع وقت رسائل التخرج الشائع) — تعدّلونها بالاتفاق مع المشرفة. */

export const STAGE_WEIGHTS: Record<string, number> = {
  topic: 3,
  proposal: 12,
  "literature-review": 15,
  "research-gap": 5,
  "research-questions": 4,
  methodology: 12,
  "data-collection": 20,
  analysis: 10,
  writing: 15,
  "final-submission": 0,
};

export interface PlanInputStage {
  id: string;
  stageKey: string;
  titleAr: string;
  order: number;
  status: "upcoming" | "active" | "done";
}
export interface PlanRow {
  id: string;
  stageKey: string;
  titleAr: string;
  start: string;
  target: string;
  days: number;
  isBuffer?: boolean;
}

const DAY = 86_400_000;
const toMs = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const daysBetweenIso = (a: string, b: string) => Math.round((toMs(b) - toMs(a)) / DAY);

export function backwardPlan(opts: {
  stages: PlanInputStage[];
  startISO: string;
  endISO: string;
  bufferPct: number;
}): { rows: PlanRow[]; totalDays: number; bufferDays: number; warnings: string[] } {
  const warnings: string[] = [];
  const total = daysBetweenIso(opts.startISO, opts.endISO);
  if (total < 14) return { rows: [], totalDays: total, bufferDays: 0, warnings: ["الفترة بين البداية والتسليم أقل من أسبوعين — عدّلوا التواريخ."] };

  const remaining = opts.stages.filter((s) => s.status !== "done").sort((a, b) => a.order - b.order);
  const final = remaining.find((s) => s.stageKey === "final-submission");
  const regular = remaining.filter((s) => s.stageKey !== "final-submission");
  const finalDays = final ? Math.min(5, Math.max(2, Math.round(total * 0.03))) : 0;
  const bufferDays = Math.round(total * (opts.bufferPct / 100));
  const usable = total - bufferDays - finalDays;
  const wSum = regular.reduce((s, r) => s + (STAGE_WEIGHTS[r.stageKey] ?? 5), 0) || 1;

  // توزيع نسبي بحد أدنى ٣ أيام لكل مرحلة، ثم نضبط الفرق على أكبر مرحلة
  const raw = regular.map((s) => Math.max(3, Math.round((usable * (STAGE_WEIGHTS[s.stageKey] ?? 5)) / wSum)));
  let drift = usable - raw.reduce((a, b) => a + b, 0);
  if (raw.length) {
    const big = raw.indexOf(Math.max(...raw));
    raw[big] = Math.max(3, raw[big] + drift);
    drift = usable - raw.reduce((a, b) => a + b, 0);
  }

  const rows: PlanRow[] = [];
  let cursor = toMs(opts.startISO);
  regular.forEach((s, i) => {
    const start = cursor;
    const end = start + raw[i] * DAY - DAY;
    rows.push({ id: s.id, stageKey: s.stageKey, titleAr: s.titleAr, start: toIso(start), target: toIso(end), days: raw[i] });
    cursor = end + DAY;
  });
  if (bufferDays > 0 && regular.length) {
    rows.push({
      id: "buffer",
      stageKey: "buffer",
      titleAr: "هامش أمان (تأخيرات ومراجعة المشرفة)",
      start: toIso(cursor),
      target: toIso(cursor + bufferDays * DAY - DAY),
      days: bufferDays,
      isBuffer: true,
    });
  }
  if (final) {
    rows.push({
      id: final.id,
      stageKey: final.stageKey,
      titleAr: final.titleAr,
      start: toIso(toMs(opts.endISO) - (finalDays - 1) * DAY),
      target: opts.endISO,
      days: finalDays,
    });
  }

  if (total < 8 * 7) warnings.push("الوقت المتبقي أقل من ٨ أسابيع — ضيق جدًا لبحث تخرج كامل. ناقشوا مع المشرفة تقليص النطاق أو تمديد الموعد.");
  const dc = rows.find((r) => r.stageKey === "data-collection");
  if (dc && dc.days < 14) warnings.push(`جمع البيانات ياخذ ${dc.days} يوم فقط — غالبًا ما يكفي (المتوقع ٣ أسابيع فأكثر مع الموافقات).`);
  const lit = rows.find((r) => r.stageKey === "literature-review");
  if (lit && lit.days < 10) warnings.push(`مراجعة الأدبيات ${lit.days} أيام فقط — قليلة.`);
  return { rows, totalDays: total, bufferDays, warnings };
}
