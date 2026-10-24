import { useMemo, useState } from "react";
import { Check, Copy, Loader2, Send } from "lucide-react";
import Card from "../ui/Card";
import AiLockedCard from "../AiLockedCard";
import { useAuth } from "../../context/AuthContext";
import { planSurveyAnalysis } from "../../hooks/useProjectAgent";
import type { SurveyResponse } from "../../hooks/useSurveys";
import { hasAiAccess } from "../../lib/plans";
import type { Question } from "../../lib/surveyCoach";
import { buildColumns, runPlan, SCALE_ID, type AskResult } from "../../lib/surveyAsk";

/** «اسألوا بياناتكم» — تكتبون سؤالكم بالعربي («هل فيه فرق بالرضا بين المراحل؟»)، الذكاء يختار الاختبار المناسب،
    والمتصفح يحسب الأرقام من ردودكم الفعلية ويعطيكم جدول وشرح بسيط وصياغة جاهزة لفصل النتائج. */
export default function AskSurveyData({ questions, responses }: { questions: Question[]; responses: SurveyResponse[] }) {
  const { team } = useAuth();
  const cols = useMemo(() => buildColumns(questions, responses), [questions, responses]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const categories = cols.filter((c) => c.kind === "category");
  const numerics = cols.filter((c) => c.kind === "numeric");
  const short = (s: string) => (s.length > 28 ? `${s.slice(0, 28)}…` : s);
  const examples = [
    numerics[0] && `وش المتوسط العام لـ «${short(numerics[0].label)}»؟`,
    numerics[0] && categories[0] && `هل فيه فرق في «${short(numerics[0].label)}» حسب «${short(categories[0].label)}»؟`,
    numerics.length >= 2 && `هل فيه علاقة بين «${short(numerics[0].label)}» و«${short(numerics[1].label)}»؟`,
    categories.length >= 2 && `هل فيه علاقة بين «${short(categories[0].label)}» و«${short(categories[1].label)}»؟`,
  ].filter(Boolean) as string[];

  if (!hasAiAccess(team)) return <AiLockedCard feature="تحليل بيانات الاستبيان" />;
  if (cols.length === 0) return null;

  const ask = async (q?: string) => {
    const question = (q ?? text).trim();
    if (question.length < 5 || busy) return;
    setText(question);
    setBusy(true);
    setError(null);
    setResult(null);
    const r = await planSurveyAnalysis(question, cols);
    setBusy(false);
    if (!r.plan) return setError(r.message ?? "تعذّر التحليل.");
    const out = runPlan(r.plan, cols, questions, responses);
    if ("error" in out) return setError(out.error);
    setResult(out);
  };

  const copy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.apa);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* النسخ غير متاح بالمتصفح — الصياغة ظاهرة فوق */
    }
  };

  return (
    <Card className="space-y-3">
      <div>
        <p className="text-sm font-extrabold text-brand-950">اسألوا بياناتكم</p>
        <p className="mt-0.5 text-xs text-brand-950/55">اكتبوا سؤالكم بالعربي، ونختار لكم الاختبار المناسب ونحسبه من ردودكم الفعلية.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
        className="flex items-center gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="مثال: هل فيه فرق في الرضا بين المراحل الدراسية؟"
          aria-label="سؤالكم عن البيانات"
          className="min-w-0 flex-1 rounded-xl border border-brand-100 bg-surface-muted px-3 py-2 text-sm outline-none focus:border-brand-300 focus:bg-paper"
        />
        <button type="submit" disabled={busy || text.trim().length < 5} aria-label="حلّل" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white disabled:opacity-50">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </form>

      {!result && !busy && examples.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {examples.map((q) => (
            <button key={q} type="button" onClick={() => ask(q)} className="rounded-full border border-brand-200 px-3 py-1 text-[11px] font-semibold text-brand-800 hover:bg-surface-muted">
              {q}
            </button>
          ))}
        </div>
      )}

      {error && <p className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}

      {result && (
        <div className="space-y-2.5 rounded-2xl border border-brand-100 p-3">
          <p className="text-sm font-extrabold text-brand-950">{result.title}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead>
                <tr className="text-brand-950/50">
                  {result.table[0].map((h, i) => (
                    <th key={i} className="px-2 py-1 text-start font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.table.slice(1).map((r, i) => (
                  <tr key={i} className="border-t border-brand-100">
                    {r.map((c, j) => (
                      <td key={j} className="px-2 py-1.5 font-medium text-brand-950/80" dir={j === 0 ? "auto" : "ltr"} style={{ textAlign: "start" }}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm leading-relaxed text-brand-950/80">{result.plain}</p>
          <div className="rounded-xl bg-surface-muted p-2.5">
            <p className="text-[11px] font-bold text-brand-950/50">صياغة جاهزة لفصل النتائج (عدّلوها بأسلوبكم)</p>
            <p className="mt-1 text-xs leading-relaxed text-brand-950/80">{result.apa}</p>
            <button onClick={copy} className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-brand-700">
              {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "اننسخت" : "نسخ الصياغة"}
            </button>
          </div>
          {result.notes.map((n, i) => (
            <p key={i} className="text-[11px] text-brand-950/55">
              • {n}
            </p>
          ))}
          <p className="text-[11px] text-brand-950/40">الأرقام محسوبة من ردودكم الفعلية، والذكاء اختار الاختبار بس. تأكدوا من الاختبار مع المشرف/ة قبل اعتماده بالبحث.</p>
        </div>
      )}

      {cols.some((c) => c.id === SCALE_ID) && <p className="text-[11px] text-brand-950/40">تقدرون تسألون عن «الدرجة الكلية» لكل عبارات ليكرت مع بعض.</p>}
    </Card>
  );
}
