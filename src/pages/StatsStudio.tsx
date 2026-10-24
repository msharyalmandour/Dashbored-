import { useMemo, useRef, useState, type ReactNode } from "react";
import { BarChart3, Calculator, Check, Copy, Compass, FileUp, FlaskConical, Lightbulb, TableProperties, TriangleAlert } from "lucide-react";
import Card from "../components/ui/Card";
import { PageHeader, Segmented } from "../components/ui/page";
import Term from "../components/Term";
import {
  alphaLabel,
  anovaOneWay,
  chiSquare,
  chooseTest,
  correlation,
  cronbachAlpha,
  describe,
  fmtP,
  frequencies,
  interpretAnova,
  interpretChi,
  interpretCorr,
  interpretT,
  parseTable,
  sampleSizeCorrelation,
  sampleSizeMean,
  sampleSizeProportion,
  sampleSizeTwoGroups,
  tTestIndependent,
  tTestPaired,
  type ChooserInput,
  type Column,
  type Dataset,
  type SampleSizeResult,
} from "../lib/stats";
import { tre, trxe } from "../lib/i18n";

type Tab = "size" | "choose" | "analyze";

const f2 = (n: number) => (Number.isFinite(n) ? (Math.round(n * 100) / 100).toFixed(2) : "—");

const SAMPLE_DATA = tre("الجنس\tالخبرة\tالإجهاد_قبل\tالإجهاد_بعد\tس1\tس2\tس3\tس4\nأنثى\tأقل من 5\t34\t28\t4\t4\t5\t4\nأنثى\t5-10\t38\t30\t3\t4\t3\t4\nذكر\tأكثر من 10\t29\t27\t2\t3\t2\t3\nأنثى\tأقل من 5\t41\t33\t5\t5\t4\t5\nذكر\t5-10\t36\t31\t4\t3\t4\t4\nذكر\tأقل من 5\t44\t36\t5\t4\t5\t5\nأنثى\tأكثر من 10\t27\t25\t2\t2\t3\t2\nأنثى\t5-10\t39\t32\t4\t4\t4\t3\nذكر\tأكثر من 10\t31\t29\t3\t3\t2\t3\nأنثى\tأقل من 5\t42\t34\t5\t4\t5\t5\nذكر\t5-10\t35\t30\t3\t4\t3\t3\nأنثى\tأكثر من 10\t30\t26\t2\t3\t3\t2");

function CopyButton({ text, label = tre("نسخ") }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          // نسخ يدوي لو الحافظة غير متاحة
        }
      }}
      className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:underline"
    >
      {done ? <Check size={12} /> : <Copy size={12} />}
      {done ? tre("تم النسخ") : label}
    </button>
  );
}

function NumberField({
  label,
  hint,
  value,
  onChange,
  step,
  suffix,
}: {
  label: ReactNode;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-brand-950/70">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={Number.isFinite(value) ? value : ""}
          step={step}
          onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
          className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm outline-none focus:border-brand-300"
        />
        {suffix && <span className="shrink-0 text-xs text-brand-950/50">{suffix}</span>}
      </div>
      {hint && <span className="mt-1 block text-[11px] leading-snug text-brand-950/45">{hint}</span>}
    </label>
  );
}

function ResultBox({ result, note }: { result: SampleSizeResult | null; note?: string }) {
  if (!result) {
    return <p className="rounded-2xl bg-amber-accent-50 px-4 py-3 text-sm font-medium text-amber-accent-700">{tre("عبّوا القيم بشكل صحيح لتظهر النتيجة.")}</p>;
  }
  return (
    <div className="rounded-2xl bg-brand-500/10 p-4 ring-1 ring-brand-500/25">
      <p className="text-xs font-bold text-brand-950/55">{tre("حجم العينة المطلوب")}</p>
      <p className="mt-1 text-3xl font-extrabold text-brand-950">
        {result.n.toLocaleString("en-GB")} <span className="text-sm font-bold text-brand-950/50">{note ?? tre("مشارك")}</span>
      </p>
      {result.withAttrition !== result.n && (
        <p className="mt-2 text-sm font-semibold text-brand-950/75">{tre("مع تعويض الانسحاب: وزّعوا استبيانات على ")}<b className="text-brand-600">{result.withAttrition.toLocaleString("en-GB")}</b>
        </p>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-brand-950/50">{result.formula}</p>
    </div>
  );
}

// ───────────────────────── تبويب: حجم العينة ─────────────────────────

type SizeKind = "prop" | "mean" | "two" | "corr";

function SampleSizeTab() {
  const [kind, setKind] = useState<SizeKind>("prop");
  const [population, setPopulation] = useState(500);
  const [margin, setMargin] = useState(5);
  const [confidence, setConfidence] = useState(95);
  const [p, setP] = useState(50);
  const [sdev, setSdev] = useState(10);
  const [marginMean, setMarginMean] = useState(2);
  const [d, setD] = useState(0.5);
  const [r, setR] = useState(0.3);
  const [power, setPower] = useState(80);
  const [loss, setLoss] = useState(10);

  const result = useMemo<SampleSizeResult | null>(() => {
    const l = loss / 100;
    const ok = (...v: number[]) => v.every((x) => Number.isFinite(x) && x > 0);
    try {
      if (kind === "prop") {
        if (!ok(margin, confidence, p) || p >= 100 || margin >= 50) return null;
        return sampleSizeProportion({ population: population > 0 ? population : null, p: p / 100, margin: margin / 100, confidence: confidence / 100, loss: l });
      }
      if (kind === "mean") {
        if (!ok(sdev, marginMean, confidence)) return null;
        return sampleSizeMean({ sd: sdev, margin: marginMean, confidence: confidence / 100, population: population > 0 ? population : null, loss: l });
      }
      if (kind === "two") {
        if (!ok(d, power) || power >= 100) return null;
        return sampleSizeTwoGroups({ effectSize: d, power: power / 100, loss: l });
      }
      if (!ok(r, power) || r >= 1 || power >= 100) return null;
      return sampleSizeCorrelation({ r, power: power / 100, loss: l });
    } catch {
      return null;
    }
  }, [kind, population, margin, confidence, p, sdev, marginMean, d, r, power, loss]);

  const kinds: [SizeKind, string, string][] = [
    ["prop", tre("استبيان / نسبة"), tre("أبي أعرف نسبة (مثل نسبة الاحتراق) بهامش خطأ معين")],
    ["mean", tre("تقدير متوسط"), tre("أبي أقدّر متوسط (مثل متوسط درجة الإجهاد)")],
    ["two", tre("مقارنة مجموعتين"), tre("أبي أقارن مجموعتين (ذكور/إناث، قبل/بعد)")],
    ["corr", tre("علاقة بين متغيرين"), tre("أبي أختبر ارتباط بين متغيرين رقميين")],
  ];

  return (
    <div className="space-y-4">
      <Card tone="cream">
        <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-brand-950">
          <Calculator size={18} className="text-brand-500" />{tre("كم مشارك تحتاجون؟")}</h3>
        <p className="mb-4 text-xs leading-relaxed text-brand-950/55">{tre("حجم العينة ما يكون رقم عشوائي — يُحسب بمعادلة، والمشرفة غالبًا تطلب أن تكتبوا كيف حسبتوه. اختاروا نوع دراستكم:")}</p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {kinds.map(([id, label, hint]) => (
            <button
              key={id}
              onClick={() => setKind(id)}
              className={`rounded-2xl border p-3 text-start transition-colors ${
                kind === id ? "border-brand-500 bg-brand-500/10 ring-1 ring-brand-500/40" : "border-brand-100 bg-paper hover:bg-surface-muted"
              }`}
            >
              <span className="block text-sm font-extrabold text-brand-950">{label}</span>
              <span className="mt-0.5 block text-xs text-brand-950/55">{hint}</span>
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="space-y-3">
          {(kind === "prop" || kind === "mean") && (
            <NumberField
              label={tre("حجم المجتمع (اختياري)")}
              hint={tre("إجمالي عدد الممرضات/الطلبة اللي تختارون منهم. اتركوه ٠ لو ما تعرفونه.")}
              value={population}
              onChange={setPopulation}
            />
          )}
          {kind === "prop" && (
            <>
              <NumberField label={tre("النسبة المتوقعة %")} hint={tre("لو ما تعرفون اتركوها ٥٠ — أحفظ خيار يعطي أكبر عينة.")} value={p} onChange={setP} suffix="%" />
              <NumberField label={<Term id="margin">{tre("هامش الخطأ المقبول %")}</Term>} hint={tre("عادةً ٥٪.")} value={margin} onChange={setMargin} suffix="%" />
            </>
          )}
          {kind === "mean" && (
            <>
              <NumberField label={tre("الانحراف المعياري المتوقع")} hint={tre("من دراسة سابقة مشابهة (أو تجربة صغيرة).")} value={sdev} onChange={setSdev} />
              <NumberField label={tre("هامش الخطأ المقبول (بنفس وحدة المتوسط)")} value={marginMean} onChange={setMarginMean} />
            </>
          )}
          {(kind === "prop" || kind === "mean") && (
            <NumberField label={<Term id="confidence">{tre("مستوى الثقة %")}</Term>} hint={tre("عادةً ٩٥٪.")} value={confidence} onChange={setConfidence} suffix="%" />
          )}
          {kind === "two" && (
            <NumberField
              label={<Term id="effect-size">{tre("حجم الأثر المتوقع (d)")}</Term>}
              hint={tre("٠٫٢ صغير، ٠٫٥ متوسط (الأشهر)، ٠٫٨ كبير. الأفضل تأخذونه من دراسة مشابهة.")}
              value={d}
              onChange={setD}
              step={0.1}
            />
          )}
          {kind === "corr" && (
            <NumberField label={tre("قوة الارتباط المتوقعة (r)")} hint={tre("٠٫١ ضعيف، ٠٫٣ متوسط، ٠٫٥ قوي.")} value={r} onChange={setR} step={0.05} />
          )}
          {(kind === "two" || kind === "corr") && (
            <NumberField label={<Term id="power">{tre("قوة الاختبار (Power) %")}</Term>} hint={tre("عادةً ٨٠٪.")} value={power} onChange={setPower} suffix="%" />
          )}
          <NumberField
            label={tre("نسبة الانسحاب أو الاستبيانات الناقصة %")}
            hint={tre("عادةً ١٠–٢٠٪. نزيدها على العينة عشان تضمنون الحجم المطلوب.")}
            value={loss}
            onChange={setLoss}
            suffix="%"
          />
        </Card>
        <div className="space-y-3">
          <ResultBox result={result} note={kind === "two" ? tre("لكل مجموعة") : tre("مشارك")} />
          <Card tone="teal" className="text-xs leading-relaxed text-brand-950/65">
            <p className="mb-1 flex items-center gap-1.5 font-bold text-brand-950">
              <Lightbulb size={14} className="text-brand-600" />{tre(" كيف تكتبونها بالمقترح؟")}</p>{tre("اكتبوا نوع المعادلة والقيم اللي استخدمتوها (مستوى الثقة، هامش الخطأ، الحجم المتوقع للأثر، نسبة الانسحاب) ثم الرقم النهائي. لو المشرفة تطلب برنامج معين (مثل G*Power) تأكدوا من الرقم فيه — نتائجنا تقريبية وتطابقه غالبًا.")}</Card>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── تبويب: أي اختبار؟ ─────────────────────────

function Opt<T extends string | number | boolean>({ v, cur, set, children }: { v: T; cur: T | null; set: (v: T) => void; children: React.ReactNode }) {
return (
  <button
    onClick={() => set(v)}
    className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
      cur === v ? "border-brand-500 bg-brand-500 text-white" : "border-brand-100 bg-paper text-brand-950/70 hover:bg-surface-muted"
    }`}
  >
    {children}
  </button>
);
}

function ChooserTab({ goToAnalyze }: { goToAnalyze: () => void }) {
  const [goal, setGoal] = useState<ChooserInput["goal"] | null>(null);
  const [outcome, setOutcome] = useState<"numeric" | "categorical" | null>(null);
  const [groups, setGroups] = useState<2 | 3 | null>(null);
  const [paired, setPaired] = useState<boolean | null>(null);
  const [other, setOther] = useState<"numeric" | "categorical" | null>(null);
  const [normal, setNormal] = useState<boolean | null>(null);

  const needOutcome = goal !== null;
  const needGroups = goal === "difference" && outcome === "numeric";
  const needPaired = needGroups && groups === 2;
  const needOther = goal === "relation" && outcome !== null;
  const needNormal =
    (goal === "difference" && outcome === "numeric" && groups !== null && (groups === 3 || paired !== null)) ||
    (goal === "relation" && outcome === "numeric" && other === "numeric");

  const ready =
    goal === "describe"
      ? outcome !== null
      : goal === "difference"
        ? outcome === "categorical" || (outcome === "numeric" && groups !== null && (groups === 3 || paired !== null) && normal !== null)
        : goal === "relation"
          ? outcome !== null && other !== null && (!(outcome === "numeric" && other === "numeric") || normal !== null)
          : false;

  const advice = ready
    ? chooseTest({
        goal: goal!,
        outcome: outcome!,
        groups: groups ?? undefined,
        paired: paired ?? undefined,
        other: other ?? undefined,
        normal: normal ?? undefined,
      })
    : null;

  const reset = () => {
    setOutcome(null);
    setGroups(null);
    setPaired(null);
    setOther(null);
    setNormal(null);
  };

  return (
    <div className="space-y-4">
      <Card tone="cream" className="space-y-5">
        <div>
          <h3 className="mb-1 flex items-center gap-2 text-base font-bold text-brand-950">
            <Compass size={18} className="text-brand-500" />{tre("وش الاختبار الإحصائي المناسب؟")}</h3>
          <p className="text-xs text-brand-950/55">{tre("جاوبوا بالأسئلة ونعطيكم الاختبار وليش، وأحيانًا نحلّله لكم مباشرة.")}</p>
        </div>

        <div>
          <p className="mb-2 text-sm font-bold text-brand-950">{tre("١. وش تبون تسوون؟")}</p>
          <div className="flex flex-wrap gap-2">
            <Opt v={"describe" as const} cur={goal} set={(v) => { setGoal(v); reset(); }}>{tre("أوصف عينتي (متوسط، نسب)")}</Opt>
            <Opt v={"difference" as const} cur={goal} set={(v) => { setGoal(v); reset(); }}>{tre("أقارن بين مجموعات")}</Opt>
            <Opt v={"relation" as const} cur={goal} set={(v) => { setGoal(v); reset(); }}>{tre("أشوف علاقة بين متغيرين")}</Opt>
          </div>
        </div>

        {needOutcome && (
          <div>
            <p className="mb-2 text-sm font-bold text-brand-950">{trxe("٢. {0}", goal === "relation" ? tre("نوع المتغير الأول؟") : tre("نوع الشي اللي تقيسونه (النتيجة)؟"))}</p>
            <div className="flex flex-wrap gap-2">
              <Opt v={"numeric" as const} cur={outcome} set={setOutcome}>{tre("رقمي (درجة، عمر، سنوات خبرة)")}</Opt>
              <Opt v={"categorical" as const} cur={outcome} set={setOutcome}>{tre("فئوي (نعم/لا، جنس، مستوى)")}</Opt>
            </div>
          </div>
        )}

        {needOther && (
          <div>
            <p className="mb-2 text-sm font-bold text-brand-950">{tre("٣. نوع المتغير الثاني؟")}</p>
            <div className="flex flex-wrap gap-2">
              <Opt v={"numeric" as const} cur={other} set={setOther}>{tre("رقمي")}</Opt>
              <Opt v={"categorical" as const} cur={other} set={setOther}>{tre("فئوي")}</Opt>
            </div>
          </div>
        )}

        {needGroups && (
          <div>
            <p className="mb-2 text-sm font-bold text-brand-950">{tre("٣. كم مجموعة؟")}</p>
            <div className="flex flex-wrap gap-2">
              <Opt v={2 as const} cur={groups} set={setGroups}>{tre("مجموعتان")}</Opt>
              <Opt v={3 as const} cur={groups} set={setGroups}>{tre("ثلاث أو أكثر")}</Opt>
            </div>
          </div>
        )}

        {needPaired && (
          <div>
            <p className="mb-2 text-sm font-bold text-brand-950">{tre("٤. نفس الأشخاص قيستوا مرتين (قبل وبعد)؟")}</p>
            <div className="flex flex-wrap gap-2">
              <Opt v={true} cur={paired} set={setPaired}>{tre("إيه، نفس الأشخاص")}</Opt>
              <Opt v={false} cur={paired} set={setPaired}>{tre("لا، مجموعات مختلفة")}</Opt>
            </div>
          </div>
        )}

        {needNormal && (
          <div>
            <p className="mb-2 text-sm font-bold text-brand-950">{tre("هل بياناتكم ")}<Term id="normal">{tre("موزعة طبيعيًا")}</Term>{tre(" تقريبًا (أو العينة ٣٠ فأكثر بكل مجموعة)؟")}</p>
            <div className="flex flex-wrap gap-2">
              <Opt v={true} cur={normal} set={setNormal}>{tre("إيه / ما أدري")}</Opt>
              <Opt v={false} cur={normal} set={setNormal}>{tre("لا (ملتوية أو رتبية أو عينة صغيرة)")}</Opt>
            </div>
            <p className="mt-1.5 text-[11px] text-brand-950/45">{tre("مقياس ليكرت بفقرة واحدة يُعتبر رتبيًا — اختاروا «لا».")}</p>
          </div>
        )}
      </Card>

      {advice && (
        <Card tone="teal" className="space-y-3">
          <p className="text-xs font-bold text-brand-950/50">{tre("الاختبار المقترح")}</p>
          <p className="text-xl font-extrabold text-brand-950">{advice.test}</p>
          <p className="text-sm text-brand-950/75">{advice.why}</p>
          <p className="rounded-xl bg-paper/60 px-3 py-2 text-xs text-brand-950/65">
            <b className="text-brand-950/80">{tre("شروطه: ")}</b>
            {advice.assumptions}
          </p>
          {advice.alternative && (
            <p className="text-xs text-brand-950/55">
              <b>{tre("بديل: ")}</b>
              {advice.alternative}
            </p>
          )}
          {advice.inApp ? (
            <button onClick={goToAnalyze} className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600">{tre("حلّلوه الحين ببياناتكم ←")}</button>
          ) : (
            <p className="flex items-start gap-2 text-xs font-semibold text-amber-accent-700">
              <TriangleAlert size={14} className="mt-0.5 shrink-0" />{tre("هذا الاختبار لسا مو مضاف للموقع — استخدموه من SPSS أو jamovi (مجاني) أو اسألوا المشرفة.")}</p>
          )}
        </Card>
      )}
    </div>
  );
}

// ───────────────────────── تبويب: حلّلوا بياناتكم ─────────────────────────

type Analysis = "describe" | "difference" | "relation" | "paired" | "alpha";

function ColumnSelect({
  label,
  cols,
  value,
  onChange,
  only,
}: {
  label: string;
  cols: Column[];
  value: number;
  onChange: (i: number) => void;
  only?: "numeric" | "categorical";
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-brand-950/70">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-brand-100 bg-paper px-3 py-2 text-sm outline-none focus:border-brand-300"
      >
        <option value={-1}>{tre("— اختاروا عمود —")}</option>
        {cols.map((c, i) =>
          only === "numeric" && !c.numeric ? null : only === "categorical" && c.numeric && new Set(c.values).size > 8 ? null : (
            <option key={i} value={i}>
              {c.name} {c.numeric ? tre("(رقمي)") : tre("(فئوي)")}
            </option>
          ),
        )}
      </select>
    </label>
  );
}

function ResultTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-brand-100">
      <table className="w-full text-sm">
        <thead className="bg-surface-muted text-xs text-brand-950/55">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2 text-start font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-brand-100/70">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 text-brand-950/80">
                  {j === 0 ? c : <bdi dir="ltr">{c}</bdi>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Interpretation({ plain, apa, warnings }: { plain: string; apa: string; warnings?: string[] }) {
  return (
    <div className="space-y-3">
      {warnings?.map((w) => (
        <p key={w} className="flex items-start gap-2 rounded-xl bg-amber-accent-50 px-3 py-2 text-xs font-semibold text-amber-accent-700">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          {w}
        </p>
      ))}
      <div className="rounded-2xl bg-brand-500/10 p-4 ring-1 ring-brand-500/25">
        <p className="mb-1 text-xs font-bold text-brand-950/55">{tre("وش تعني النتيجة (بلغة بسيطة)")}</p>
        <p className="text-sm leading-relaxed text-brand-950/85">{plain}</p>
      </div>
      <div className="rounded-2xl bg-surface-muted p-4">
        <div className="mb-1 flex items-center justify-between">
          <p className="text-xs font-bold text-brand-950/55">{tre("صياغة جاهزة للبحث (شبيهة بـ APA)")}</p>
          <CopyButton text={apa} />
        </div>
        <p className="text-sm leading-relaxed text-brand-950/80">{apa}</p>
      </div>
    </div>
  );
}

function AnalyzeTab({ data, setData }: { data: Dataset; setData: (d: Dataset) => void }) {
  const [raw, setRaw] = useState("");
  const [analysis, setAnalysis] = useState<Analysis>("describe");
  const [a, setA] = useState(-1);
  const [b, setB] = useState(-1);
  const [method, setMethod] = useState<"pearson" | "spearman">("pearson");
  const [alphaCols, setAlphaCols] = useState<number[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = (text: string) => {
    setRaw(text);
    const d = parseTable(text);
    setData(d);
    setA(-1);
    setB(-1);
    setAlphaCols(d.columns.map((c, i) => (c.numeric && /^(س|q|item)/i.test(c.name) ? i : -1)).filter((i) => i >= 0));
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => load(String(reader.result ?? ""));
    reader.readAsText(file, "utf-8");
  };

  const cols = data.columns;
  const analyses: [Analysis, string][] = [
    ["describe", tre("وصف العينة")],
    ["difference", tre("فرق بين مجموعات")],
    ["paired", tre("قبل / بعد")],
    ["relation", tre("علاقة بين متغيرين")],
    ["alpha", tre("ثبات المقياس (ألفا)")],
  ];

  const output = (() => {
    if (cols.length === 0) return null;

    if (analysis === "describe") {
      const nums = cols.filter((c) => c.numeric);
      const cats = cols.filter((c) => !c.numeric || new Set(c.values.filter(Boolean)).size <= 5);
      return (
        <div className="space-y-4">
          {nums.length > 0 && (
            <ResultTable
              head={[tre("المتغير"), "N", tre("المتوسط"), tre("الانحراف"), tre("الوسيط"), tre("أقل"), tre("أعلى"), tre("ناقص")]}
              rows={nums.map((c) => {
                const d = describe(c.nums);
                return [c.name, d.n, f2(d.mean), f2(d.sd), f2(d.median), f2(d.min), f2(d.max), d.missing];
              })}
            />
          )}
          {cats
            .filter((c) => !c.numeric)
            .map((c) => (
              <div key={c.name}>
                <p className="mb-1.5 text-xs font-extrabold text-brand-950/70">{c.name}</p>
                <ResultTable
                  head={[tre("الفئة"), tre("التكرار"), tre("النسبة %")]}
                  rows={frequencies(c.values).map((f) => [f.value, f.count, f2(f.percent)])}
                />
              </div>
            ))}
          <p className="text-[11px] text-brand-950/45">{tre("استخدموا المتوسط ± الانحراف للمتغيرات الرقمية، والتكرار والنسبة للفئوية. لو الوسيط بعيد عن المتوسط فالبيانات ملتوية.")}</p>
        </div>
      );
    }

    if (analysis === "difference") {
      if (a < 0 || b < 0) return <p className="text-sm text-brand-950/55">{tre("اختاروا عمود النتيجة (رقمي) وعمود المجموعات (فئوي).")}</p>;
      const outcome = cols[a];
      const group = cols[b];
      const byGroup = new Map<string, number[]>();
      group.values.forEach((g, i) => {
        const v = outcome.nums[i];
        if (g !== "" && v !== null) byGroup.set(g, [...(byGroup.get(g) ?? []), v]);
      });
      const groups = [...byGroup.entries()].map(([label, values]) => ({ label, values }));
      if (groups.length < 2) return <p className="text-sm text-amber-accent-700">{tre("عمود المجموعات فيه فئة وحدة بس — تحتاجون فئتين على الأقل.")}</p>;
      if (groups.length > 8) return <p className="text-sm text-amber-accent-700">{trxe("عمود المجموعات فيه {0} فئة — يبدو رقمي مو فئوي. اختاروا عمود بفئات قليلة.", groups.length)}</p>;
      const small = groups.filter((g) => g.values.length < 5).map((g) => tre("المجموعة «{0}» فيها {1} فقط", g.label, g.values.length));
      const tiny = groups.some((g) => g.values.length < 2);
      if (tiny) return <p className="text-sm text-amber-accent-700">{tre("كل مجموعة تحتاج مشاهدتين على الأقل.")}</p>;
      const warnings = small.length ? [...small, tre("العينة الصغيرة تضعف موثوقية الاختبار — تفسروا بحذر.")] : [];
      if (groups.length === 2) {
        const r = tTestIndependent(groups[0].values, groups[1].values, [groups[0].label, groups[1].label]);
        const i = interpretT(r, outcome.name);
        return (
          <div className="space-y-4">
            <ResultTable head={[tre("المجموعة"), "N", tre("المتوسط"), tre("الانحراف")]} rows={r.groups.map((g) => [g.label, g.n, f2(g.mean), f2(g.sd)])} />
            <ResultTable
              head={[tre("الاختبار"), "t", "df", "p", tre("فرق المتوسطين"), "CI 95%", "Cohen's d"]}
              rows={[["t-test (Welch)", f2(r.t), f2(r.df), fmtP(r.p), f2(r.meanDiff), `[${f2(r.ci[0])}, ${f2(r.ci[1])}]`, f2(r.cohenD)]]}
            />
            <Interpretation {...i} warnings={warnings} />
          </div>
        );
      }
      const r = anovaOneWay(groups);
      const i = interpretAnova(r, outcome.name);
      return (
        <div className="space-y-4">
          <ResultTable head={[tre("المجموعة"), "N", tre("المتوسط"), tre("الانحراف")]} rows={r.groups.map((g) => [g.label, g.n, f2(g.mean), f2(g.sd)])} />
          <ResultTable head={[tre("الاختبار"), "F", "df", "p", "η²"]} rows={[["ANOVA", f2(r.F), `${r.df1}, ${r.df2}`, fmtP(r.p), f2(r.etaSq)]]} />
          <Interpretation {...i} warnings={warnings} />
        </div>
      );
    }

    if (analysis === "paired") {
      if (a < 0 || b < 0 || a === b) return <p className="text-sm text-brand-950/55">{tre("اختاروا عمودين رقميين مختلفين: القياس الأول والثاني.")}</p>;
      const x: number[] = [];
      const y: number[] = [];
      cols[a].nums.forEach((v, i) => {
        const w = cols[b].nums[i];
        if (v !== null && w !== null) {
          x.push(v);
          y.push(w);
        }
      });
      if (x.length < 3) return <p className="text-sm text-amber-accent-700">{tre("تحتاجون 3 أزواج على الأقل.")}</p>;
      const r = tTestPaired(x, y, [cols[a].name, cols[b].name]);
      const i = interpretT(r, tre("الفرق بين القياسين"));
      return (
        <div className="space-y-4">
          <ResultTable head={[tre("القياس"), "N", tre("المتوسط"), tre("الانحراف")]} rows={r.groups.map((g) => [g.label, g.n, f2(g.mean), f2(g.sd)])} />
          <ResultTable
            head={[tre("الاختبار"), "t", "df", "p", tre("متوسط الفرق"), "CI 95%", "Cohen's d"]}
            rows={[[tre("t المترابط"), f2(r.t), r.df, fmtP(r.p), f2(r.meanDiff), `[${f2(r.ci[0])}, ${f2(r.ci[1])}]`, f2(r.cohenD)]]}
          />
          <Interpretation {...i} warnings={x.length < 10 ? [tre("عدد الأزواج قليل — تفسروا بحذر.")] : []} />
        </div>
      );
    }

    if (analysis === "relation") {
      if (a < 0 || b < 0 || a === b) return <p className="text-sm text-brand-950/55">{tre("اختاروا متغيرين مختلفين.")}</p>;
      const A = cols[a];
      const B = cols[b];
      if (A.numeric && B.numeric) {
        const x: number[] = [];
        const y: number[] = [];
        A.nums.forEach((v, i) => {
          const w = B.nums[i];
          if (v !== null && w !== null) {
            x.push(v);
            y.push(w);
          }
        });
        if (x.length < 4) return <p className="text-sm text-amber-accent-700">{tre("تحتاجون 4 أزواج على الأقل.")}</p>;
        const r = correlation(x, y, method);
        const i = interpretCorr(r, A.name, B.name);
        return (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(["pearson", "spearman"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${method === m ? "bg-brand-500 text-white" : "bg-surface-muted text-brand-950/60"}`}
                >
                  {m === "pearson" ? tre("بيرسون (بيانات طبيعية)") : tre("سبيرمان (رتبية/ملتوية)")}
                </button>
              ))}
            </div>
            <ResultTable head={[tre("الاختبار"), tre("المعامل"), "df", "p", "N"]} rows={[[method === "pearson" ? "Pearson r" : "Spearman ρ", f2(r.r), r.df, fmtP(r.p), r.n]]} />
            <Interpretation {...i} warnings={x.length < 10 ? [tre("عدد الأزواج قليل — تفسروا بحذر.")] : []} />
          </div>
        );
      }
      if (!A.numeric && !B.numeric) {
        const r = chiSquare(A.values, B.values);
        if (r.df < 1) return <p className="text-sm text-amber-accent-700">{tre("كل متغير يحتاج فئتين على الأقل.")}</p>;
        const i = interpretChi(r, A.name, B.name);
        return (
          <div className="space-y-4">
            <ResultTable head={[`${A.name} \\ ${B.name}`, ...r.cols]} rows={r.rows.map((row, ri) => [row, ...r.observed[ri]])} />
            <ResultTable head={[tre("الاختبار"), "χ²", "df", "p", tre("V كرامر"), "N"]} rows={[[tre("مربع كاي"), f2(r.chi2), r.df, fmtP(r.p), f2(r.cramersV), r.n]]} />
            <Interpretation {...i} />
          </div>
        );
      }
      return <p className="text-sm text-amber-accent-700">{tre("متغير رقمي مع فئوي = مقارنة متوسطات. استخدموا خيار «فرق بين مجموعات».")}</p>;
    }

    // alpha
    const picked = alphaCols.map((i) => cols[i]).filter(Boolean);
    return (
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-bold text-brand-950/70">{tre("اختاروا أعمدة فقرات المقياس (نفس البُعد):")}</p>
          <div className="flex flex-wrap gap-2">
            {cols.map((c, i) =>
              c.numeric ? (
                <button
                  key={i}
                  onClick={() => setAlphaCols((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]))}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${alphaCols.includes(i) ? "bg-brand-500 text-white" : "bg-surface-muted text-brand-950/60"}`}
                >
                  {c.name}
                </button>
              ) : null,
            )}
          </div>
        </div>
        {picked.length >= 2 ? (
          (() => {
            const r = cronbachAlpha(picked.map((c) => c.nums));
            if (r.n < 5 || !Number.isFinite(r.alpha)) return <p className="text-sm text-amber-accent-700">{tre("تحتاجون 5 صفوف مكتملة على الأقل.")}</p>;
            return (
              <div className="space-y-3">
                <ResultTable head={[tre("عدد الفقرات"), tre("عدد المشاركين المكتملين"), tre("ألفا كرونباخ")]} rows={[[r.k, r.n, f2(r.alpha)]]} />
                <Interpretation
                  plain={tre("ألفا = {0} → ثبات {1}. القيمة ٠٫٧ فأكثر تُعتبر مقبولة عادةً. لو الفقرات معكوسة الصياغة اعكسوا درجاتها قبل الحساب.", f2(r.alpha), alphaLabel(r.alpha))}
                  apa={tre("بلغ معامل الثبات ألفا كرونباخ لمقياس ({0} فقرة) {1} مما يدل على ثبات {2} (N = {3}).", picked.length, f2(r.alpha), alphaLabel(r.alpha), r.n)}
                  warnings={r.n < 30 ? [tre("الثبات بعينة أقل من ٣٠ غير مستقر — الأفضل تجربة استطلاعية (Pilot) بـ٣٠ مشارك فأكثر.")] : []}
                />
              </div>
            );
          })()
        ) : (
          <p className="text-sm text-brand-950/55">{tre("اختاروا فقرتين على الأقل.")}</p>
        )}
      </div>
    );
  })();

  return (
    <div className="space-y-4">
      <Card tone="cream" className="space-y-3">
        <h3 className="flex items-center gap-2 text-base font-bold text-brand-950">
          <TableProperties size={18} className="text-brand-500" />{tre("١. ضعوا بياناتكم")}</h3>
        <p className="text-xs leading-relaxed text-brand-950/55">{tre("انسخوا الجدول من Excel أو Google Sheets (أول سطر = أسماء الأعمدة) والصقوه هنا، أو ارفعوا ملف CSV. البيانات تتحلل بمتصفحكم ولا تنرفع لأي سيرفر. لا تحطون أسماء المشاركين.")}</p>
        <textarea
          value={raw}
          onChange={(e) => load(e.target.value)}
          rows={6}
          dir="auto"
          placeholder={tre("الجنس\tالعمر\tالدرجة\nأنثى\t25\t34\nذكر\t28\t29")}
          className="w-full rounded-lg border border-brand-100 bg-paper px-3 py-2 font-mono text-xs outline-none focus:border-brand-300"
        />
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" onChange={onFile} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-paper px-3.5 py-2 text-xs font-bold text-brand-950/70 hover:bg-surface-muted"
          >
            <FileUp size={14} />{tre("رفع ملف CSV")}</button>
          <button onClick={() => load(SAMPLE_DATA)} className="rounded-xl px-3 py-2 text-xs font-bold text-brand-600 hover:bg-surface-muted">{tre("جرّبوا بيانات تجريبية")}</button>
          {cols.length > 0 && (
            <span className="text-xs font-semibold text-brand-950/50">{trxe("{0} صف · {1} عمود ({2} رقمي)", data.rows, cols.length, cols.filter((c) => c.numeric).length)}</span>
          )}
        </div>
      </Card>

      {cols.length > 0 && (
        <>
          <Card className="space-y-3">
            <h3 className="flex items-center gap-2 text-base font-bold text-brand-950">
              <FlaskConical size={18} className="text-brand-500" />{tre("٢. وش تبون تحللون؟")}</h3>
            <div className="flex flex-wrap gap-2">
              {analyses.map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => {
                    setAnalysis(id);
                    setA(-1);
                    setB(-1);
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${analysis === id ? "bg-brand-500 text-white" : "bg-surface-muted text-brand-950/60 hover:bg-brand-100"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {analysis === "difference" && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <ColumnSelect label={tre("النتيجة اللي تقيسونها (رقمي)")} cols={cols} value={a} onChange={setA} only="numeric" />
                <ColumnSelect label={tre("تقارنون حسب (فئوي: جنس، مستوى…)")} cols={cols} value={b} onChange={setB} only="categorical" />
              </div>
            )}
            {analysis === "paired" && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <ColumnSelect label={tre("القياس الأول (قبل)")} cols={cols} value={a} onChange={setA} only="numeric" />
                <ColumnSelect label={tre("القياس الثاني (بعد)")} cols={cols} value={b} onChange={setB} only="numeric" />
              </div>
            )}
            {analysis === "relation" && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <ColumnSelect label={tre("المتغير الأول")} cols={cols} value={a} onChange={setA} />
                <ColumnSelect label={tre("المتغير الثاني")} cols={cols} value={b} onChange={setB} />
              </div>
            )}
          </Card>
          <Card className="space-y-3">
            <h3 className="flex items-center gap-2 text-base font-bold text-brand-950">
              <BarChart3 size={18} className="text-brand-500" />{tre("٣. النتيجة")}</h3>
            {output}
          </Card>
        </>
      )}
    </div>
  );
}

// ───────────────────────── الصفحة ─────────────────────────

export default function StatsStudio() {
  const [tab, setTab] = useState<Tab>("size");
  const [data, setData] = useState<Dataset>({ columns: [], rows: 0 });

  const tabs: { id: Tab; label: string; when: string; icon: typeof Calculator }[] = [
    { id: "size", label: tre("حجم العينة"), when: tre("كم مشارك أحتاج؟"), icon: Calculator },
    { id: "choose", label: tre("أي اختبار؟"), when: tre("وش الاختبار المناسب لبحثي؟"), icon: Compass },
    { id: "analyze", label: tre("حلّلوا بياناتكم"), when: tre("الصق بياناتك واحصل على النتيجة"), icon: BarChart3 },
  ];

  return (
    <div dir="ltr" lang="en" className="space-y-6">
      <PageHeader
        kicker={tre("اجمع وحلّل")}
        title={tre("استوديو الإحصاء")}
        subtitle={tre("حلّلوا بياناتكم وخذوا النتيجة مكتوبة بالعربي وجاهزة للبحث — بدون SPSS.")}
        action={<Segmented items={tabs.map((t) => ({ id: t.id, label: t.label }))} value={tab} onChange={setTab} />}
      />
      <p className="-mt-3 text-sm text-brand-950/50">{tabs.find((t) => t.id === tab)?.when}</p>

      {tab === "size" && <SampleSizeTab />}
      {tab === "choose" && <ChooserTab goToAnalyze={() => setTab("analyze")} />}
      {tab === "analyze" && <AnalyzeTab data={data} setData={setData} />}

      <p className="text-center text-[11px] text-brand-950/40">{tre("الحسابات تعمل بمتصفحكم وتمّ التحقق منها بقيم مرجعية معروفة، لكنها أداة مساعدة: راجعوا نتائجكم النهائية مع المشرفة أو برنامج معتمد.")}</p>
    </div>
  );
}
