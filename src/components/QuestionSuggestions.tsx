import { useState } from "react";
import { Check, Loader2, Plus, Wand2 } from "lucide-react";
import clsx from "clsx";
import AiLockedCard from "./AiLockedCard";
import { StatusChip } from "./ui/page";
import { useAuth } from "../context/AuthContext";
import { runProjectAgent, type AgentResult } from "../hooks/useProjectAgent";
import SourceList from "./ui/SourceList";
import { hasAiAccess } from "../lib/plans";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { tre, trxe } from "../lib/i18n";

const STORE_KEY = "wesync.questions.grounded";

function load(): AgentResult | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as AgentResult) : null;
  } catch {
    return null;
  }
}

/** «اقترحوا لنا أسئلة بحث»: الذكاء يقرأ عنوانكم وفجوتكم ودراساتكم ويرجّع أقرب الأسئلة لموضوعكم مرتّبة من الأنسب،
    وتضيفونها لأسئلة البحث بضغطة. القفل الحقيقي بالسيرفر (باقة AI)، هنا بس عرض. */
export default function QuestionSuggestions({
  topic,
  existing,
  canWrite,
  onAdd,
}: {
  topic: string;
  existing: string[];
  canWrite: boolean;
  onAdd: (text: string) => void;
}) {
  const { team } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState(load);

  if (!isSupabaseConfigured) return null;
  if (!hasAiAccess(team)) return <AiLockedCard feature={tre("اقتراح أسئلة البحث")} />;

  const generate = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const r = await runProjectAgent("questions", topic, existing);
    setBusy(false);
    if (r.message || !r.data) {
      setMessage(r.message ?? tre("تعذّر الاقتراح — حاولوا مرة ثانية."));
      return;
    }
    const next = r.data;
    setResult(next);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      // بدون تخزين محلي: تختفي الاقتراحات عند تحديث الصفحة، مو مشكلة
    }
  };

  const taken = new Set(existing.map((q) => q.trim()));

  return (
    <div className="mt-3 rounded-2xl border border-brand-500/30 bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-brand-950">{tre("أفضل أسئلة بحث لموضوعكم — من دراسات حقيقية")}</p>
          <p className="mt-0.5 text-xs text-brand-950/55">{tre("نبحث عنكم بدراسات منشورة (PubMed وOpenAlex)، ونطلع أسئلة تتبع مما تركته هذي الدراسات مفتوح، مرتبة من الأقرب لموضوعكم. ما تحتاجون تجمعون شي بأنفسكم.")}</p>
        </div>
        <button
          onClick={generate}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-l from-amber-accent-400 to-brand-500 px-5 py-2.5 text-sm font-bold text-[#1a0f00] hover:brightness-110 disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
          {busy ? tre("ندوّر بالدراسات… (حوالي ٣٠ ثانية)") : result ? tre("اقتراحات جديدة") : tre("اقترحوا لنا أسئلة")}
        </button>
      </div>

      {message && <p className="mt-3 rounded-xl bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-500">{message}</p>}

      {result && (
        <ol className="mt-4 space-y-2.5">
          {result.questions.map((q, i) => {
            const added = taken.has(q.question.trim());
            return (
              <li key={i} className={clsx("rounded-2xl bg-black/25 p-4", i === 0 && "ring-1 ring-amber-accent-400/50")}>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {i === 0 && <StatusChip tone="active">{tre("الأقرب لموضوعكم")}</StatusChip>}
                  {q.type && <StatusChip tone="neutral">{q.type}</StatusChip>}
                  <span className="flex items-center gap-1 text-brand-950/50" title={tre("قرب من موضوعكم: {0} من ٥", q.fit)}>
                    {Array.from({ length: 5 }).map((_, d) => (
                      <span key={d} className={clsx("h-1.5 w-4 rounded-full", d < q.fit ? "bg-amber-accent-400" : "bg-brand-950/15")} />
                    ))}
                  </span>
                </div>
                <p className="mt-2 text-[15px] font-semibold leading-relaxed text-brand-950">{q.question}</p>
                {q.why && <p className="mt-1 text-sm text-brand-950/60">{q.why}</p>}
                <SourceList papers={result.papers} sources={q.sources} />
                {(q.design || q.variables) && (
                  <p className="mt-1 text-xs text-brand-950/45">
                    {q.design && <>{trxe("التصميم: {0}", q.design)}</>}
                    {q.design && q.variables && " · "}
                    {q.variables && <>{trxe("المتغيرات: {0}", q.variables)}</>}
                  </p>
                )}
                {canWrite && (
                  <button
                    onClick={() => onAdd(q.question)}
                    disabled={added}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brand-500/40 px-4 py-1.5 text-sm font-semibold text-amber-accent-400 hover:bg-brand-500/10 disabled:opacity-60"
                  >
                    {added ? <Check size={14} /> : <Plus size={14} />}
                    {added ? tre("انضاف لأسئلتكم") : tre("أضيفوه لأسئلة البحث")}
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {result?.fallback && (
        <p className="mt-3 text-xs text-brand-950/50">{tre("هذي اقتراحات من عنوانكم وفجوتكم فقط (البحث بالدراسات غير متاح الحين).")}</p>
      )}
      {result && result.papers.length > 0 && (
        <details className="mt-3 rounded-xl bg-black/20 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-brand-950/80">{trxe("الدراسات اللي بنينا عليها ({0})", result.papers.length)}</summary>
          <ul className="mt-2 space-y-2">
            {result.papers.map((p, i) => (
              <li key={i} className="text-xs text-brand-950/65">
                <a href={p.url} target="_blank" rel="noreferrer" className="font-semibold text-amber-accent-400 hover:underline" dir="ltr">
                  {p.title}
                </a>
                <span className="text-brand-950/45"> · {[p.authors.split(",")[0], p.year, p.journal].filter(Boolean).join(" · ")}</span>
                {p.keyFinding && <span className="block text-brand-950/55">{p.keyFinding}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
      {result?.noveltyNote && <p className="mt-3 text-xs text-brand-950/55">💡 {result.noveltyNote}</p>}
      <p className="mt-2 text-[11px] text-brand-950/40">{tre("اقتراحات مساعدة فقط — اعرضوها على المشرف/ة قبل اعتماد أي سؤال.")}</p>
    </div>
  );
}
