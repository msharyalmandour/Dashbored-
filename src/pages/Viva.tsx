import { useState } from "react";
import { Check, Copy, GraduationCap, Lightbulb, Loader2, Presentation, Sparkles } from "lucide-react";
import Card from "../components/ui/Card";
import AiLockedCard from "../components/AiLockedCard";
import { useAuth } from "../context/AuthContext";
import { callStudy } from "../hooks/useStudyTools";
import { hasAiAccess } from "../lib/plans";
import { isSupabaseConfigured } from "../lib/supabaseClient";

interface VivaQuestion {
  category: string;
  question: string;
  why: string;
  hint: string;
}
interface Slide {
  title: string;
  points: string[];
}
interface VivaResult {
  questions: VivaQuestion[];
  slides: Slide[];
}

const STORE_KEY = "wesync.viva.last";

function readSaved(): VivaResult | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as VivaResult) : null;
  } catch {
    return null;
  }
}

export default function Viva() {
  const { team } = useAuth();
  const aiOk = hasAiAccess(team) && isSupabaseConfigured;
  const [result, setResult] = useState<VivaResult | null>(readSaved);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showHint, setShowHint] = useState<Record<number, boolean>>({});
  const [ready, setReady] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const r = await callStudy<VivaResult>({ action: "viva" });
    setBusy(false);
    if (r.message || !r.data?.questions) {
      setMessage(r.message ?? "تعذّر التوليد — حاولوا مرة ثانية.");
      return;
    }
    const next = { questions: r.data.questions, slides: r.data.slides ?? [] };
    setResult(next);
    setAnswers({});
    setShowHint({});
    setReady({});
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      // بدون تخزين محلي: تختفي الأسئلة عند تحديث الصفحة، مو مشكلة
    }
  };

  const readyCount = result ? result.questions.filter((_, i) => ready[i]).length : 0;
  const slidesText = result?.slides.map((s, i) => `${i + 1}. ${s.title}\n${s.points.map((p) => `   - ${p}`).join("\n")}`).join("\n\n") ?? "";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-brand-950">تدريب المناقشة</h1>
        <p className="mt-1 text-sm leading-relaxed text-brand-950/55">
          الذكاء يقرأ مقترحكم الفعلي ويسألكم مثل اللجنة تمامًا: أسئلة متوقعة من محتواكم أنتم (وأسئلة على النقاط الضعيفة أو الناقصة)، مع تلميح لاتجاه
          الجواب — بدون ما يكتب الجواب عنكم. وفيه مخطط شرائح لعرضكم.
        </p>
      </div>

      {!hasAiAccess(team) && isSupabaseConfigured && <AiLockedCard feature="تدريب المناقشة" />}
      {!isSupabaseConfigured && (
        <Card>
          <p className="text-sm text-brand-950/60">هذي الميزة متاحة فقط بالوضع الحقيقي (مع حساب فريقكم).</p>
        </Card>
      )}

      {aiOk && (
        <Card tone="cream" className="space-y-3">
          <p className="text-sm text-brand-950/70">
            الأفضل تكتبون مقترحكم ومنهجيتكم أولًا (كل ما كانوا أوضح كانت الأسئلة أدق). المتاح ٨ جلسات بالشهر لكل فريق.
          </p>
          <button
            onClick={generate}
            disabled={busy}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {busy ? "اللجنة تقرأ مقترحكم... (حوالي ٣٠ ثانية)" : result ? "جلسة جديدة" : "ابدأوا التدريب"}
          </button>
          {message && <p className="rounded-xl bg-amber-accent-50 px-3 py-2 text-sm font-medium text-amber-accent-700">{message}</p>}
        </Card>
      )}

      {result && (
        <>
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-brand-100">
              <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${(readyCount / result.questions.length) * 100}%` }} />
            </div>
            <span className="text-xs font-extrabold text-brand-950/60">
              جاهزين لـ {readyCount} / {result.questions.length}
            </span>
          </div>

          <div className="space-y-3">
            {result.questions.map((q, i) => (
              <Card key={i} className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-extrabold text-white">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    {q.category && <p className="text-[11px] font-bold text-brand-600">{q.category}</p>}
                    <p className="text-sm font-extrabold leading-relaxed text-brand-950">{q.question}</p>
                    {q.why && <p className="mt-1 text-xs text-brand-950/45">اللجنة تختبر: {q.why}</p>}
                  </div>
                </div>
                <textarea
                  value={answers[i] ?? ""}
                  onChange={(e) => setAnswers((p) => ({ ...p, [i]: e.target.value }))}
                  rows={3}
                  placeholder="اكتبوا جوابكم هنا (يبقى عندكم فقط، ما ينحفظ)..."
                  className="w-full rounded-lg border border-brand-100 bg-paper px-3 py-2 text-sm outline-none focus:border-brand-300"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowHint((p) => ({ ...p, [i]: !p[i] }))}
                    className="flex items-center gap-1.5 rounded-xl border border-brand-200 bg-paper px-3 py-1.5 text-xs font-bold text-brand-950/70 hover:bg-surface-muted"
                  >
                    <Lightbulb size={13} />
                    {showHint[i] ? "أخفوا التلميح" : "تلميح"}
                  </button>
                  <button
                    onClick={() => setReady((p) => ({ ...p, [i]: !p[i] }))}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold ${
                      ready[i] ? "bg-brand-500 text-white" : "border border-brand-200 bg-paper text-brand-950/70 hover:bg-surface-muted"
                    }`}
                  >
                    <Check size={13} />
                    {ready[i] ? "جاهزين" : "علّموها جاهزة"}
                  </button>
                </div>
                {showHint[i] && q.hint && <p className="rounded-xl bg-brand-500/10 px-3 py-2 text-xs leading-relaxed text-brand-950/75">{q.hint}</p>}
              </Card>
            ))}
          </div>

          {result.slides.length > 0 && (
            <Card className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-base font-bold text-brand-950">
                  <Presentation size={18} className="text-brand-500" />
                  مخطط شرائح العرض
                </h3>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(slidesText);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1600);
                    } catch {
                      // نسخ يدوي
                    }
                  }}
                  className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:underline"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? "تم النسخ" : "نسخ المخطط"}
                </button>
              </div>
              <ol className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                {result.slides.map((s, i) => (
                  <li key={i} className="rounded-2xl bg-surface-muted p-3">
                    <p className="text-sm font-extrabold text-brand-950">
                      {i + 1}. {s.title}
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {s.points.map((p) => (
                        <li key={p} className="flex gap-2 text-xs text-brand-950/70">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </Card>
          )}
          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-brand-950/40">
            <GraduationCap size={13} />
            الأسئلة اقتراحات مبنية على مقترحكم، مو أسئلة لجنتكم الفعلية — اسألوا المشرفة عن توقعاتها.
          </p>
        </>
      )}
    </div>
  );
}
