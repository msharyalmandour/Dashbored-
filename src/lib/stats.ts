/** مكتبة إحصاء صغيرة بلا اعتماديات — تحسب بالمتصفح، وما ترسل بيانات الطالبات لأي سيرفر.
    كل الدوال نقية (pure) وتنختبر بـ Node. مرجع القيم: جداول التوزيعات القياسية. */

// ───────────────────────── دوال رياضية أساسية ─────────────────────────

function lgamma(x: number): number {
  // Lanczos approximation
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Regularized incomplete beta I_x(a,b) */
function betainc(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  const cf = (xx: number, aa: number, bb: number) => {
    const MAXIT = 300;
    const EPS = 3e-14;
    const FPMIN = 1e-300;
    const qab = aa + bb;
    const qap = aa + 1;
    const qam = aa - 1;
    let c = 1;
    let d = 1 - (qab * xx) / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= MAXIT; m++) {
      const m2 = 2 * m;
      let aa2 = (m * (bb - m) * xx) / ((qam + m2) * (aa + m2));
      d = 1 + aa2 * d;
      if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa2 / c;
      if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      h *= d * c;
      aa2 = (-(aa + m) * (qab + m) * xx) / ((aa + m2) * (qap + m2));
      d = 1 + aa2 * d;
      if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa2 / c;
      if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < EPS) break;
    }
    return h;
  };
  return x < (a + 1) / (a + b + 2) ? (bt * cf(x, a, b)) / a : 1 - (bt * cf(1 - x, b, a)) / b;
}

/** Regularized lower incomplete gamma P(a,x) */
function gammainc(a: number, x: number): number {
  if (x <= 0) return 0;
  const gln = lgamma(a);
  if (x < a + 1) {
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 0; n < 500; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 3e-14) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - gln);
  }
  let b = x + 1 - a;
  let c = 1 / 1e-300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-14) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - gln) * h;
}

export function tCdf(t: number, df: number): number {
  const x = df / (df + t * t);
  const p = 0.5 * betainc(x, df / 2, 0.5);
  return t > 0 ? 1 - p : p;
}
export const tTwoTailP = (t: number, df: number) => Math.min(1, 2 * (1 - tCdf(Math.abs(t), df)));

export const chi2P = (chi2: number, df: number) => Math.max(0, 1 - gammainc(df / 2, chi2 / 2));

export const fP = (f: number, d1: number, d2: number) =>
  f <= 0 ? 1 : Math.min(1, Math.max(0, betainc(d2 / (d2 + d1 * f), d2 / 2, d1 / 2)));

/** الكمّي الحرج لتوزيع t (ثنائي الذيل) بالتنصيف — يكفي لفترات الثقة */
export function tCritical(df: number, alpha = 0.05): number {
  let lo = 0;
  let hi = 200;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (tTwoTailP(mid, df) > alpha) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** الكمّي المعياري z للتوزيع الطبيعي (Acklam) */
export function zQuantile(p: number): number {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - pl) return -zQuantile(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

// ───────────────────────── حجم العينة ─────────────────────────

export interface SampleSizeResult {
  /** الحجم المطلوب قبل تعويض الانسحاب */
  n: number;
  /** الحجم بعد إضافة نسبة الانسحاب/الاستبيانات الناقصة */
  withAttrition: number;
  formula: string;
}

const withLoss = (n: number, loss: number) => Math.ceil(n / (1 - Math.min(Math.max(loss, 0), 0.9)));

/** كوكران لنسبة (استبيانات/انتشار) مع تصحيح المجتمع المحدود */
export function sampleSizeProportion(opts: {
  population?: number | null;
  p?: number;
  margin?: number;
  confidence?: number;
  loss?: number;
}): SampleSizeResult {
  const p = opts.p ?? 0.5;
  const e = opts.margin ?? 0.05;
  const z = zQuantile(1 - (1 - (opts.confidence ?? 0.95)) / 2);
  const n0 = (z * z * p * (1 - p)) / (e * e);
  const N = opts.population && opts.population > 0 ? opts.population : null;
  const n = Math.ceil(N ? n0 / (1 + (n0 - 1) / N) : n0);
  return {
    n: N ? Math.min(n, N) : n,
    withAttrition: N ? Math.min(withLoss(n, opts.loss ?? 0), N) : withLoss(n, opts.loss ?? 0),
    formula: N
      ? "كوكران للنسبة مع تصحيح المجتمع المحدود: n₀ = z²·p·(1−p) / e² ثم n = n₀ / (1 + (n₀−1)/N)"
      : "كوكران للنسبة: n = z²·p·(1−p) / e²",
  };
}

/** تقدير متوسط بهامش خطأ محدد */
export function sampleSizeMean(opts: { sd: number; margin: number; confidence?: number; population?: number | null; loss?: number }): SampleSizeResult {
  const z = zQuantile(1 - (1 - (opts.confidence ?? 0.95)) / 2);
  const n0 = (z * opts.sd) ** 2 / (opts.margin * opts.margin);
  const N = opts.population && opts.population > 0 ? opts.population : null;
  const n = Math.ceil(N ? n0 / (1 + (n0 - 1) / N) : n0);
  return {
    n,
    withAttrition: withLoss(n, opts.loss ?? 0),
    formula: "تقدير متوسط: n = (z·σ / e)² (مع تصحيح المجتمع المحدود لو حددتم المجتمع)",
  };
}

/** مقارنة متوسطين (مجموعتين مستقلتين) بحجم أثر d — الحجم لكل مجموعة (تقريب طبيعي؛ يطابق G*Power تقريبًا) */
export function sampleSizeTwoGroups(opts: { effectSize: number; alpha?: number; power?: number; loss?: number }): SampleSizeResult {
  const za = zQuantile(1 - (opts.alpha ?? 0.05) / 2);
  const zb = zQuantile(opts.power ?? 0.8);
  const n = Math.ceil((2 * (za + zb) ** 2) / (opts.effectSize * opts.effectSize)) + 1;
  return {
    n,
    withAttrition: withLoss(n, opts.loss ?? 0),
    formula: "مقارنة مجموعتين: n لكل مجموعة ≈ 2·(z_α/2 + z_β)² / d²  (تقريب — تأكدوا بـ G*Power لو المشرفة تطلب)",
  };
}

/** ارتباط بيرسون: الحجم الكلي لكشف r بقوة معينة (تحويل فيشر) */
export function sampleSizeCorrelation(opts: { r: number; alpha?: number; power?: number; loss?: number }): SampleSizeResult {
  const za = zQuantile(1 - (opts.alpha ?? 0.05) / 2);
  const zb = zQuantile(opts.power ?? 0.8);
  const fz = 0.5 * Math.log((1 + opts.r) / (1 - opts.r));
  const n = Math.ceil(((za + zb) / fz) ** 2 + 3);
  return { n, withAttrition: withLoss(n, opts.loss ?? 0), formula: "ارتباط بيرسون: n = ((z_α/2 + z_β) / atanh(r))² + 3" };
}

// ───────────────────────── وصفي وتنظيف بيانات ─────────────────────────

const ARABIC_DIGITS: Record<string, string> = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9", "٫": ".", "٬": "" };

export function toNumber(raw: string): number | null {
  const t = raw
    .trim()
    .replace(/[٠-٩٫٬]/g, (c) => ARABIC_DIGITS[c] ?? c)
    .replace(/,(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  if (t === "" || !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export interface Column {
  name: string;
  values: string[];
  numeric: boolean;
  nums: (number | null)[];
}
export interface Dataset {
  columns: Column[];
  rows: number;
}

/** يقرأ جدول ملصوق من Excel (Tab) أو CSV (، ; ,) — أول سطر = عناوين الأعمدة */
export function parseTable(text: string): Dataset {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) return { columns: [], rows: 0 };
  const count = (ch: string) => (lines[0].match(new RegExp(ch === "\t" ? "\t" : `\\${ch}`, "g")) ?? []).length;
  const delim = [
    ["\t", count("\t")],
    [";", count(";")],
    [",", count(",")],
    ["،", count("،")],
  ].sort((a, b) => (b[1] as number) - (a[1] as number))[0][0] as string;

  const splitLine = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (q && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = !q;
      } else if (ch === delim && !q) {
        out.push(cur);
        cur = "";
      } else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const header = splitLine(lines[0]);
  const body = lines.slice(1).map(splitLine);
  const columns: Column[] = header.map((name, j) => {
    const values = body.map((r) => r[j] ?? "");
    const nums = values.map((v) => (v === "" ? null : toNumber(v)));
    const nonEmpty = values.filter((v) => v !== "").length;
    const numericCount = nums.filter((n) => n !== null).length;
    return { name: name || `عمود ${j + 1}`, values, numeric: nonEmpty > 0 && numericCount / nonEmpty >= 0.9, nums };
  });
  return { columns, rows: body.length };
}

const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);
export const mean = (a: number[]) => sum(a) / a.length;
export function variance(a: number[]): number {
  if (a.length < 2) return NaN;
  const m = mean(a);
  return sum(a.map((v) => (v - m) ** 2)) / (a.length - 1);
}
export const sd = (a: number[]) => Math.sqrt(variance(a));
export function median(a: number[]): number {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
export function skewness(a: number[]): number {
  const n = a.length;
  if (n < 3) return NaN;
  const m = mean(a);
  const s = sd(a);
  return (n / ((n - 1) * (n - 2))) * sum(a.map((v) => ((v - m) / s) ** 3));
}

export const clean = (nums: (number | null)[]) => nums.filter((n): n is number => n !== null);

export interface Descriptive {
  n: number;
  missing: number;
  mean: number;
  sd: number;
  median: number;
  min: number;
  max: number;
  skew: number;
}
export function describe(nums: (number | null)[]): Descriptive {
  const v = clean(nums);
  return {
    n: v.length,
    missing: nums.length - v.length,
    mean: mean(v),
    sd: sd(v),
    median: median(v),
    min: Math.min(...v),
    max: Math.max(...v),
    skew: skewness(v),
  };
}

export function frequencies(values: string[]): { value: string; count: number; percent: number }[] {
  const vals = values.filter((v) => v !== "");
  const map = new Map<string, number>();
  for (const v of vals) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()]
    .map(([value, count]) => ({ value, count, percent: (count / vals.length) * 100 }))
    .sort((a, b) => b.count - a.count);
}

// ───────────────────────── الاختبارات ─────────────────────────

export interface TTestResult {
  kind: "t-independent" | "t-paired";
  t: number;
  df: number;
  p: number;
  meanDiff: number;
  ci: [number, number];
  cohenD: number;
  groups: { label: string; n: number; mean: number; sd: number }[];
}

/** Welch's t-test (لا يفترض تساوي التباين — الأأمن كافتراضي) */
export function tTestIndependent(a: number[], b: number[], labels: [string, string] = ["المجموعة ١", "المجموعة ٢"]): TTestResult {
  const [n1, n2] = [a.length, b.length];
  const [m1, m2] = [mean(a), mean(b)];
  const [v1, v2] = [variance(a), variance(b)];
  const se = Math.sqrt(v1 / n1 + v2 / n2);
  const t = (m1 - m2) / se;
  const df = (v1 / n1 + v2 / n2) ** 2 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));
  const crit = tCritical(df);
  const pooled = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
  return {
    kind: "t-independent",
    t,
    df,
    p: tTwoTailP(t, df),
    meanDiff: m1 - m2,
    ci: [m1 - m2 - crit * se, m1 - m2 + crit * se],
    cohenD: (m1 - m2) / pooled,
    groups: [
      { label: labels[0], n: n1, mean: m1, sd: Math.sqrt(v1) },
      { label: labels[1], n: n2, mean: m2, sd: Math.sqrt(v2) },
    ],
  };
}

export function tTestPaired(a: number[], b: number[], labels: [string, string] = ["القياس ١", "القياس ٢"]): TTestResult {
  const d = a.map((v, i) => v - b[i]);
  const n = d.length;
  const md = mean(d);
  const sdd = sd(d);
  const se = sdd / Math.sqrt(n);
  const t = md / se;
  const df = n - 1;
  const crit = tCritical(df);
  return {
    kind: "t-paired",
    t,
    df,
    p: tTwoTailP(t, df),
    meanDiff: md,
    ci: [md - crit * se, md + crit * se],
    cohenD: md / sdd,
    groups: [
      { label: labels[0], n, mean: mean(a), sd: sd(a) },
      { label: labels[1], n, mean: mean(b), sd: sd(b) },
    ],
  };
}

export interface AnovaResult {
  F: number;
  df1: number;
  df2: number;
  p: number;
  etaSq: number;
  groups: { label: string; n: number; mean: number; sd: number }[];
}
export function anovaOneWay(groups: { label: string; values: number[] }[]): AnovaResult {
  const all = groups.flatMap((g) => g.values);
  const grand = mean(all);
  const k = groups.length;
  const N = all.length;
  const ssb = sum(groups.map((g) => g.values.length * (mean(g.values) - grand) ** 2));
  const ssw = sum(groups.map((g) => sum(g.values.map((v) => (v - mean(g.values)) ** 2))));
  const df1 = k - 1;
  const df2 = N - k;
  const F = ssb / df1 / (ssw / df2);
  return {
    F,
    df1,
    df2,
    p: fP(F, df1, df2),
    etaSq: ssb / (ssb + ssw),
    groups: groups.map((g) => ({ label: g.label, n: g.values.length, mean: mean(g.values), sd: sd(g.values) })),
  };
}

export interface ChiSquareResult {
  chi2: number;
  df: number;
  p: number;
  cramersV: number;
  n: number;
  rows: string[];
  cols: string[];
  observed: number[][];
  lowExpectedShare: number;
}
export function chiSquare(a: string[], b: string[]): ChiSquareResult {
  const pairs = a.map((v, i) => [v, b[i]] as const).filter(([x, y]) => x !== "" && y !== "");
  const rows = [...new Set(pairs.map((p) => p[0]))];
  const cols = [...new Set(pairs.map((p) => p[1]))];
  const observed = rows.map((r) => cols.map((c) => pairs.filter((p) => p[0] === r && p[1] === c).length));
  const rowT = observed.map(sum);
  const colT = cols.map((_, j) => sum(observed.map((r) => r[j])));
  const n = sum(rowT);
  let chi2 = 0;
  let low = 0;
  rows.forEach((_, i) =>
    cols.forEach((__, j) => {
      const e = (rowT[i] * colT[j]) / n;
      if (e < 5) low++;
      chi2 += (observed[i][j] - e) ** 2 / e;
    }),
  );
  const df = (rows.length - 1) * (cols.length - 1);
  return {
    chi2,
    df,
    p: chi2P(chi2, df),
    cramersV: Math.sqrt(chi2 / (n * (Math.min(rows.length, cols.length) - 1))),
    n,
    rows,
    cols,
    observed,
    lowExpectedShare: low / (rows.length * cols.length),
  };
}

export interface CorrelationResult {
  method: "pearson" | "spearman";
  r: number;
  df: number;
  p: number;
  n: number;
}
function rank(a: number[]): number[] {
  const idx = a.map((v, i) => [v, i] as const).sort((x, y) => x[0] - y[0]);
  const ranks = new Array<number>(a.length);
  for (let i = 0; i < idx.length; ) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const r = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[idx[k][1]] = r;
    i = j + 1;
  }
  return ranks;
}
export function correlation(x: number[], y: number[], method: "pearson" | "spearman" = "pearson"): CorrelationResult {
  const [xs, ys] = method === "spearman" ? [rank(x), rank(y)] : [x, y];
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < xs.length; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  const r = sxy / Math.sqrt(sxx * syy);
  const n = xs.length;
  const df = n - 2;
  const t = (r * Math.sqrt(df)) / Math.sqrt(Math.max(1e-15, 1 - r * r));
  return { method, r, df, p: Math.abs(r) >= 1 ? 0 : tTwoTailP(t, df), n };
}

/** ألفا كرونباخ لمقياس (أعمدة = فقرات) — يستخدم فقط الصفوف المكتملة */
export function cronbachAlpha(items: (number | null)[][]): { alpha: number; k: number; n: number } {
  const k = items.length;
  const n = items[0]?.length ?? 0;
  const rows: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row = items.map((c) => c[i]);
    if (row.every((v) => v !== null)) rows.push(row as number[]);
  }
  const vars = items.map((_, j) => variance(rows.map((r) => r[j])));
  const totals = rows.map(sum);
  const alpha = (k / (k - 1)) * (1 - sum(vars) / variance(totals));
  return { alpha, k, n: rows.length };
}

// ───────────────────────── صياغة النتائج ─────────────────────────

/** يعزل مقطعًا إحصائيًا (أرقام/رموز لاتينية) داخل جملة عربية عشان ما ينقلب ترتيبه بالعرض (LRI…PDI) */
const L = (t: string) => `\u2066${t}\u2069`;
const f2 = (n: number) => (Math.round(n * 100) / 100).toFixed(2);
export const fmtP = (p: number) => (p < 0.001 ? "< .001" : `= ${p.toFixed(3).replace(/^0/, "")}`);
const sig = (p: number) => p < 0.05;

export function effectLabel(kind: "d" | "r" | "eta" | "v", v: number): string {
  const a = Math.abs(v);
  const t =
    kind === "d" ? [0.2, 0.5, 0.8] : kind === "r" ? [0.1, 0.3, 0.5] : kind === "eta" ? [0.01, 0.06, 0.14] : [0.1, 0.3, 0.5];
  return a < t[0] ? "ضئيل" : a < t[1] ? "صغير" : a < t[2] ? "متوسط" : "كبير";
}

export function interpretT(r: TTestResult, varName: string): { plain: string; apa: string } {
  const [g1, g2] = r.groups;
  const df = r.kind === "t-paired" ? r.df : Math.round(r.df * 10) / 10;
  const apa = `${r.kind === "t-paired" ? "أظهر اختبار t للعينات المترابطة" : "أظهر اختبار t (Welch) للعينات المستقلة"} ${
    sig(r.p) ? "وجود فرق ذي دلالة إحصائية" : "عدم وجود فرق ذي دلالة إحصائية"
  } في ${varName} بين ${g1.label} (${L(`M = ${f2(g1.mean)}, SD = ${f2(g1.sd)}`)}) و${g2.label} (${L(`M = ${f2(g2.mean)}, SD = ${f2(g2.sd)}`)})، ${L(`t(${df}) = ${f2(r.t)}, p ${fmtP(r.p)}, d = ${f2(r.cohenD)}`)}.`;
  const plain = sig(r.p)
    ? `الفرق بين المجموعتين حقيقي إحصائيًا (${L("p < .05")}) وحجم الأثر ${effectLabel("d", r.cohenD)} (${L(`d = ${f2(r.cohenD)}`)}). ${
        r.meanDiff > 0 ? g1.label : g2.label
      } أعلى بمتوسط ${f2(Math.abs(r.meanDiff))}. فترة الثقة 95% للفرق: ${L(`[${f2(r.ci[0])}, ${f2(r.ci[1])}]`)}.`
    : `ما ظهر فرق ذو دلالة بين المجموعتين (${L(`p ${fmtP(r.p)}`)}). هذا ما يعني إنهم متطابقين، يعني ما عندنا دليل كافي على فرق — وقد يكون السبب صغر العينة. فترة الثقة 95%: ${L(`[${f2(r.ci[0])}, ${f2(r.ci[1])}]`)}.`;
  return { plain, apa };
}

export function interpretAnova(r: AnovaResult, varName: string): { plain: string; apa: string } {
  const apa = `أظهر تحليل التباين الأحادي ${sig(r.p) ? "وجود فروق ذات دلالة إحصائية" : "عدم وجود فروق ذات دلالة إحصائية"} في ${varName} بين المجموعات، ${L(`F(${r.df1}, ${r.df2}) = ${f2(r.F)}, p ${fmtP(r.p)}, η² = ${f2(r.etaSq)}`)}.`;
  const plain = sig(r.p)
    ? `فيه فرق دال بين المجموعات (${L("p < .05")}) بحجم أثر ${effectLabel("eta", r.etaSq)} (${L(`η² = ${f2(r.etaSq)}`)}). ANOVA يقول إن فيه فرق بين مجموعتين على الأقل، لكن ما يقول أي مجموعتين — تحتاجون اختبار لاحق (Post-hoc مثل Tukey) لتحديدها.`
    : `ما ظهر فرق دال بين المجموعات (${L(`p ${fmtP(r.p)}`)}).`;
  return { plain, apa };
}

export function interpretChi(r: ChiSquareResult, a: string, b: string): { plain: string; apa: string } {
  const apa = `أظهر اختبار مربع كاي ${sig(r.p) ? "وجود علاقة ذات دلالة إحصائية" : "عدم وجود علاقة ذات دلالة إحصائية"} بين ${a} و${b}، ${L(`χ²(${r.df}, N = ${r.n}) = ${f2(r.chi2)}, p ${fmtP(r.p)}, V = ${f2(r.cramersV)}`)}.`;
  const warn = r.lowExpectedShare > 0.2 ? ` تنبيه: ${Math.round(r.lowExpectedShare * 100)}% من الخلايا تكرارها المتوقع أقل من 5، فالنتيجة قد تكون غير دقيقة — ادمجوا فئات أو استخدموا اختبار فيشر الدقيق (Fisher's exact) لو الجدول 2×2.` : "";
  const plain = (sig(r.p)
    ? `فيه علاقة حقيقية إحصائيًا بين ${a} و${b} (${L("p < .05")}) بقوة ${effectLabel("v", r.cramersV)} (${L(`V = ${f2(r.cramersV)}`)}).`
    : `ما ظهرت علاقة دالة بين ${a} و${b} (${L(`p ${fmtP(r.p)}`)}).`) + warn;
  return { plain, apa };
}

export function interpretCorr(r: CorrelationResult, a: string, b: string): { plain: string; apa: string } {
  const name = r.method === "pearson" ? "بيرسون" : "سبيرمان";
  const sym = r.method === "pearson" ? "r" : "rₛ";
  const apa = `أظهر معامل ارتباط ${name} ${sig(r.p) ? "علاقة ذات دلالة إحصائية" : "عدم وجود علاقة ذات دلالة إحصائية"} بين ${a} و${b}، ${L(`${sym}(${r.df}) = ${f2(r.r).replace(/^0/, "").replace(/^-0/, "-")}, p ${fmtP(r.p)}`)}.`;
  const dir = r.r > 0 ? "طردية (كل ما زاد الأول زاد الثاني)" : "عكسية (كل ما زاد الأول قلّ الثاني)";
  const plain = sig(r.p)
    ? `علاقة ${dir} وقوتها ${effectLabel("r", r.r)} (${L(`${sym} = ${f2(r.r)}`)}). تذكروا: الارتباط ما يعني سببية.`
    : `ما ظهرت علاقة دالة بين المتغيرين (${L(`p ${fmtP(r.p)}, ${sym} = ${f2(r.r)}`)}).`;
  return { plain, apa };
}

export function alphaLabel(a: number): string {
  return a >= 0.9 ? "ممتاز (وقد يعني تكرار فقرات)" : a >= 0.8 ? "جيد جدًا" : a >= 0.7 ? "مقبول" : a >= 0.6 ? "ضعيف (مقبول بحدود للمقاييس القصيرة)" : "غير مقبول";
}

// ───────────────────────── مساعد اختيار الاختبار ─────────────────────────

export type Goal = "difference" | "relation" | "describe";
export interface ChooserInput {
  goal: Goal;
  /** نوع المتغير المعتمد/النتيجة */
  outcome: "numeric" | "categorical";
  /** لهدف الفرق: عدد المجموعات */
  groups?: 2 | 3;
  /** نفس الأشخاص قيسوا مرتين؟ */
  paired?: boolean;
  /** لهدف العلاقة: نوع المتغير الثاني */
  other?: "numeric" | "categorical";
  /** البيانات تقريبًا طبيعية (أو العينة ≥ 30)؟ */
  normal?: boolean;
}
export interface TestAdvice {
  test: string;
  inApp: boolean;
  why: string;
  assumptions: string;
  alternative?: string;
}
export function chooseTest(i: ChooserInput): TestAdvice {
  if (i.goal === "describe") {
    return {
      test: i.outcome === "numeric" ? "إحصاء وصفي: المتوسط والانحراف المعياري (أو الوسيط لو البيانات ملتوية)" : "التكرارات والنسب المئوية",
      inApp: true,
      why: "تصف عينتكم كما هي بدون استدلال.",
      assumptions: "لا شي.",
    };
  }
  if (i.goal === "relation") {
    if (i.outcome === "numeric" && i.other === "numeric")
      return i.normal === false
        ? { test: "ارتباط سبيرمان", inApp: true, why: "علاقة بين متغيرين رقميين والبيانات غير طبيعية أو رتبية (مثل مقياس ليكرت أحادي).", assumptions: "علاقة رتبية أحادية الاتجاه (monotonic)." }
        : { test: "ارتباط بيرسون", inApp: true, why: "علاقة بين متغيرين رقميين.", assumptions: "علاقة خطية، وتوزيع طبيعي تقريبًا، وبلا قيم متطرفة كبيرة.", alternative: "سبيرمان لو البيانات غير طبيعية" };
    if (i.outcome === "categorical" && i.other === "categorical")
      return { test: "مربع كاي للاستقلالية (χ²)", inApp: true, why: "علاقة بين متغيرين فئويين (مثل الجنس والمستوى الدراسي).", assumptions: "كل خلية تكرارها المتوقع ≥ 5 (لو 2×2 وأقل استخدموا Fisher).", alternative: "Fisher's exact لو العينة صغيرة" };
    return { test: "t-test أو ANOVA (متغير فئوي مقابل رقمي)", inApp: true, why: "علاقة بين متغير فئوي ومتغير رقمي تعني مقارنة المتوسطات بين الفئات — اختاروا «فرق بين مجموعات».", assumptions: "راجعوا خيار الفرق." };
  }
  // difference
  if (i.outcome === "categorical")
    return { test: "مربع كاي (χ²)", inApp: true, why: "مقارنة نسب بين مجموعات.", assumptions: "كل خلية متوقعة ≥ 5.", alternative: i.paired ? "اختبار مكنمار (McNemar) للقياسات المترابطة — غير مضاف بالموقع حاليًا" : "Fisher لو 2×2 وعينة صغيرة" };
  if (i.groups === 2)
    return i.paired
      ? i.normal === false
        ? { test: "اختبار ويلككسون للرتب المُوقّعة (Wilcoxon signed-rank)", inApp: false, why: "قياسان لنفس الأشخاص وبيانات غير طبيعية.", assumptions: "فروق متماثلة تقريبًا.", alternative: "t المترابط لو العينة كبيرة (≥ 30)" }
        : { test: "اختبار t للعينات المترابطة (Paired t-test)", inApp: true, why: "قياسان لنفس الأشخاص (قبل/بعد مثلًا).", assumptions: "الفروق موزعة تقريبًا طبيعيًا." }
      : i.normal === false
        ? { test: "مان-ويتني (Mann-Whitney U)", inApp: false, why: "مجموعتان مستقلتان وبيانات غير طبيعية أو رتبية.", assumptions: "شكل توزيع متشابه.", alternative: "Welch t لو العينة كبيرة (≥ 30 لكل مجموعة)" }
        : { test: "اختبار t للعينات المستقلة (Welch)", inApp: true, why: "مقارنة متوسط مجموعتين مستقلتين (مثل ذكور/إناث).", assumptions: "توزيع طبيعي تقريبًا أو عينة ≥ 30 لكل مجموعة." };
  return i.normal === false
    ? { test: "كروسكال-واليس (Kruskal-Wallis)", inApp: false, why: "ثلاث مجموعات فأكثر وبيانات غير طبيعية.", assumptions: "شكل توزيع متشابه.", alternative: "ANOVA لو العينة كبيرة" }
    : { test: "تحليل التباين الأحادي (One-way ANOVA)", inApp: true, why: "مقارنة متوسطات ٣ مجموعات فأكثر (مثل مستويات الخبرة).", assumptions: "توزيع طبيعي تقريبًا وتباين متقارب بين المجموعات.", alternative: "بعده اختبار لاحق (Tukey) لتحديد أي مجموعتين تختلفان" };
}
