import { anovaOneWay, chiSquare, correlation, describe, interpretAnova, interpretChi, interpretCorr, interpretT, tTestIndependent, type Descriptive } from "./stats";
import type { Question } from "./surveyCoach";
import type { SurveyResponse } from "../hooks/useSurveys";
import { tr } from "./i18n";

/** «اسألوا بياناتكم»: الذكاء يختار الاختبار المناسب من سؤالكم، لكن كل الأرقام والصياغة تنحسب هنا
    بمكتبة الإحصاء نفسها اللي بصفحة الإحصاء — ما يخترع الذكاء أي رقم. */

export const SCALE_ID = "__scale__";
const MIN_PER_GROUP = 3;

export interface AskColumn {
  id: string;
  label: string;
  kind: "numeric" | "category";
  /** مقياس ليكرت (ترتيبي) — نستخدم سبيرمان بدل بيرسون */
  ordinal?: boolean;
  levels?: string[];
  n: number;
}

export interface AskPlan {
  test: "describe" | "compare_groups" | "correlate" | "associate" | "unsupported";
  outcome?: string;
  group?: string;
  x?: string;
  y?: string;
  reason: string;
}

export interface AskResult {
  title: string;
  /** جدول صغير: أول صف عناوين */
  table: string[][];
  plain: string;
  apa: string;
  notes: string[];
}

type Answers = SurveyResponse["answers"];

const likertItems = (qs: Question[]) => qs.filter((q) => q.type === "likert");

/** الدرجة الكلية لعبارات ليكرت: متوسط ما أجاب عليه المشارك (لازم يجاوب نصها على الأقل) */
function scaleScore(qs: Question[], a: Answers): number | null {
  const items = likertItems(qs);
  const vals = items.map((q) => Number(a[q.id])).filter((x) => Number.isFinite(x) && x >= 1 && x <= 5);
  return vals.length >= Math.ceil(items.length / 2) ? vals.reduce((s, x) => s + x, 0) / vals.length : null;
}

function numericOf(col: AskColumn, qs: Question[], a: Answers): number | null {
  if (col.id === SCALE_ID) return scaleScore(qs, a);
  const v = a[col.id];
  if (v === undefined || v === "" || Array.isArray(v)) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function categoryOf(col: AskColumn, a: Answers): string {
  const v = a[col.id];
  return typeof v === "string" ? v : "";
}

export function buildColumns(qs: Question[], responses: SurveyResponse[]): AskColumn[] {
  const cols: AskColumn[] = [];
  for (const q of qs) {
    if (q.type === "likert" || q.type === "number") {
      const n = responses.filter((r) => numericOf({ id: q.id, label: q.text, kind: "numeric", n: 0 }, qs, r.answers) !== null).length;
      if (n > 0) cols.push({ id: q.id, label: q.text, kind: "numeric", ordinal: q.type === "likert", n });
    } else if (q.type === "single") {
      const counts = new Map<string, number>();
      for (const r of responses) {
        const v = categoryOf({ id: q.id, label: q.text, kind: "category", n: 0 }, r.answers);
        if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      const levels = [...counts].filter(([, c]) => c > 0).map(([l]) => l);
      const n = [...counts.values()].reduce((s, c) => s + c, 0);
      if (levels.length >= 2) cols.push({ id: q.id, label: q.text, kind: "category", levels, n });
    }
  }
  if (likertItems(qs).length >= 3) {
    const probe: AskColumn = { id: SCALE_ID, label: tr("الدرجة الكلية (متوسط كل عبارات ليكرت)"), kind: "numeric", ordinal: true, n: 0 };
    const n = responses.filter((r) => scaleScore(qs, r.answers) !== null).length;
    if (n > 0) cols.unshift({ ...probe, n });
  }
  return cols;
}

const f2 = (x: number) => (Math.round(x * 100) / 100).toString();
const row = (g: { label: string; n: number; mean: number; sd: number }) => [g.label, String(g.n), f2(g.mean), f2(g.sd)];

function descRows(label: string, d: Descriptive): string[][] {
  return [
    [tr("المتغير"), "N", tr("المتوسط"), tr("الانحراف"), tr("الوسيط"), tr("أقل"), tr("أعلى")],
    [label, String(d.n), f2(d.mean), f2(d.sd), f2(d.median), f2(d.min), f2(d.max)],
  ];
}

/** يتحقق من خطة الذكاء ضد الأعمدة الفعلية ثم ينفّذ الاختبار — أي تعارض يرجّع رسالة بدل نتيجة غلط */
export function runPlan(plan: AskPlan, cols: AskColumn[], qs: Question[], responses: SurveyResponse[]): AskResult | { error: string } {
  const byId = new Map(cols.map((c) => [c.id, c]));
  const get = (id?: string) => (id ? byId.get(id) : undefined);

  if (plan.test === "unsupported") return { error: plan.reason || tr("هذا السؤال ما أقدر أجاوبه من بيانات الاستبيان الحالية.") };

  if (plan.test === "describe") {
    const c = get(plan.outcome);
    if (!c || c.kind !== "numeric") return { error: tr("ما قدرت أحدد المتغير الرقمي للوصف — جرّبوا تذكرون اسمه بسؤالكم.") };
    const nums = responses.map((r) => numericOf(c, qs, r.answers)).filter((x): x is number => x !== null);
    if (nums.length < 2) return { error: tr("الردود قليلة جدًا للوصف.") };
    const d = describe(nums);
    return {
      title: tr("وصف: {0}", c.label),
      table: descRows(c.label, d),
      plain: tr("متوسط الإجابات {0} (انحراف معياري {1}) من {2} مشارك/ة، والوسيط {3}.", f2(d.mean), f2(d.sd), d.n, f2(d.median)),
      apa: tr("بلغ متوسط {0} (M = {1}, SD = {2}, N = {3}).", c.label, f2(d.mean), f2(d.sd), d.n),
      notes: c.ordinal ? [tr("مقياس ليكرت ترتيبي — المتوسط للوصف، وفضّلوا الوسيط عند التفسير لو التوزيع ملتوي.")] : [],
    };
  }

  if (plan.test === "compare_groups") {
    const o = get(plan.outcome);
    const g = get(plan.group);
    if (!o || o.kind !== "numeric" || !g || g.kind !== "category") return { error: tr("للمقارنة أحتاج متغير رقمي (مثل درجة ليكرت) ومتغير فئات (مثل المرحلة). جرّبوا تصيغون السؤال بوضوح.") };
    const buckets = new Map<string, number[]>();
    for (const r of responses) {
      const lv = categoryOf(g, r.answers);
      const x = numericOf(o, qs, r.answers);
      if (lv && x !== null) buckets.set(lv, [...(buckets.get(lv) ?? []), x]);
    }
    const groups = [...buckets].map(([label, values]) => ({ label, values })).filter((b) => b.values.length >= MIN_PER_GROUP);
    const dropped = buckets.size - groups.length;
    if (groups.length < 2) return { error: tr("كل مجموعة لازم فيها {0} ردود على الأقل، وما تحقق هذا لمجموعتين أو أكثر. اجمعوا ردود أكثر.", MIN_PER_GROUP) };
    const notes = [
      ...(dropped > 0 ? [tr("استبعدنا {0} مجموعة لأن ردودها أقل من {1}.", dropped, MIN_PER_GROUP)] : []),
      ...(o.ordinal ? [tr("ليكرت ترتيبي: اختبار t/ANOVA شائع بالأبحاث الجامعية، لكن لو العينة صغيرة أو التوزيع ملتوي اسألوا المشرف/ة عن البديل اللاعلمي (Mann-Whitney / Kruskal-Wallis).")] : []),
    ];
    if (groups.length === 2) {
      const r = tTestIndependent(groups[0].values, groups[1].values, [groups[0].label, groups[1].label]);
      const i = interpretT(r, o.label);
      return {
        title: tr("مقارنة {0} حسب {1}", o.label, g.label),
        table: [[tr("المجموعة"), "N", tr("المتوسط"), tr("الانحراف")], ...r.groups.map(row), [tr("الاختبار"), `t(${f2(r.df)}) = ${f2(r.t)}`, `p ${r.p < 0.001 ? "< .001" : "= " + r.p.toFixed(3)}`, `d = ${f2(r.cohenD)}`]],
        plain: i.plain,
        apa: i.apa,
        notes,
      };
    }
    const r = anovaOneWay(groups);
    const i = interpretAnova(r, o.label);
    return {
      title: tr("مقارنة {0} حسب {1}", o.label, g.label),
      table: [[tr("المجموعة"), "N", tr("المتوسط"), tr("الانحراف")], ...r.groups.map(row), [tr("الاختبار"), `F(${r.df1}, ${r.df2}) = ${f2(r.F)}`, `p ${r.p < 0.001 ? "< .001" : "= " + r.p.toFixed(3)}`, `η² = ${f2(r.etaSq)}`]],
      plain: i.plain,
      apa: i.apa,
      notes,
    };
  }

  if (plan.test === "correlate") {
    const a = get(plan.x);
    const b = get(plan.y);
    if (!a || !b || a.kind !== "numeric" || b.kind !== "numeric" || a.id === b.id) return { error: tr("للارتباط أحتاج متغيرين رقميين مختلفين (ليكرت أو أرقام).") };
    const xs: number[] = [];
    const ys: number[] = [];
    for (const r of responses) {
      const x = numericOf(a, qs, r.answers);
      const y = numericOf(b, qs, r.answers);
      if (x !== null && y !== null) {
        xs.push(x);
        ys.push(y);
      }
    }
    if (xs.length < 5) return { error: tr("الردود المكتملة للمتغيرين أقل من ٥ — اجمعوا ردود أكثر.") };
    if (new Set(xs).size < 2 || new Set(ys).size < 2) return { error: tr("أحد المتغيرين كل إجاباته متطابقة، فما يمدي نحسب ارتباط.") };
    const method = a.ordinal || b.ordinal ? "spearman" : "pearson";
    const r = correlation(xs, ys, method);
    const i = interpretCorr(r, a.label, b.label);
    return {
      title: tr("الارتباط بين {0} و{1}", a.label, b.label),
      table: [[tr("الاختبار"), tr("المعامل"), "df", "p", "N"], [method === "pearson" ? "Pearson r" : "Spearman ρ", f2(r.r), String(r.df), r.p < 0.001 ? "< .001" : r.p.toFixed(3), String(r.n)]],
      plain: i.plain,
      apa: i.apa,
      notes: method === "spearman" ? [tr("استخدمنا سبيرمان لأن أحد المتغيرين مقياس ليكرت (ترتيبي).")] : [],
    };
  }

  if (plan.test === "associate") {
    const a = get(plan.x);
    const b = get(plan.y);
    if (!a || !b || a.kind !== "category" || b.kind !== "category" || a.id === b.id) return { error: tr("لعلاقة بين فئتين أحتاج سؤالين من نوع «اختيار واحد».") };
    const av: string[] = [];
    const bv: string[] = [];
    for (const r of responses) {
      const x = categoryOf(a, r.answers);
      const y = categoryOf(b, r.answers);
      if (x && y) {
        av.push(x);
        bv.push(y);
      }
    }
    if (av.length < 10) return { error: tr("الردود المكتملة أقل من ١٠ — اجمعوا ردود أكثر لاختبار العلاقة.") };
    const r = chiSquare(av, bv);
    if (!Number.isFinite(r.chi2)) return { error: tr("الجدول ما يسمح بحساب مربع كاي (فئة وحدة فقط بأحد السؤالين؟).") };
    const i = interpretChi(r, a.label, b.label);
    return {
      title: tr("العلاقة بين {0} و{1}", a.label, b.label),
      table: [["", ...r.cols], ...r.rows.map((rw, k) => [rw, ...r.observed[k].map(String)])],
      plain: i.plain,
      apa: i.apa,
      notes: [],
    };
  }

  return { error: tr("ما قدرت أحدد الاختبار المناسب لسؤالكم.") };
}
