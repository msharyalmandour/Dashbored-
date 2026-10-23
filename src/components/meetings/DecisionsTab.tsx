import { useState } from "react";
import { CheckCircle2, Clock, HelpCircle, Loader2, MessageCircle, Plus, Send, Trash2, X } from "lucide-react";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import ThreeDotsMenu from "../ui/ThreeDotsMenu";
import { useToast } from "../../context/ToastContext";
import { formatDateShort, relativeDayLabel, toISODate } from "../../lib/date";
import { decisionRequestMessage, whatsappUrl } from "../../lib/meetings";
import { notifySupervisor } from "../../lib/supervisorNotify";
import type { DecisionRequestRow, SupervisorAvailabilityRow } from "../../data/types";

interface DecisionsTabProps {
  decisions: DecisionRequestRow[];
  availability: SupervisorAvailabilityRow | null;
  supervisorUrl: string | null;
  canWrite: boolean;
  onAsk: (input: { question: string; options: string[]; neededBy?: string }) => Promise<{ id?: string; error?: string }>;
  onCancel: (id: string) => Promise<{ error?: string }>;
}

const inputClass = "w-full rounded-xl border border-brand-100 bg-paper/60 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-brand-300";

/** «طلب قرار»: سؤال بخيارين إلى أربعة تجاوب عليه المشرف/ة بضغطة (من إيميل أو رابطها)، بدل اجتماع كامل. */
export default function DecisionsTab({ decisions, availability, supervisorUrl, canWrite, onAsk, onCancel }: DecisionsTabProps) {
  const { showToast } = useToast();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [neededBy, setNeededBy] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
  const valid = question.trim().length >= 3 && cleanOptions.length >= 2;

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    const r = await onAsk({ question, options: cleanOptions, neededBy: neededBy || undefined });
    setSaving(false);
    if (r.error || !r.id) {
      setError(r.error ?? "ما انحفظ الطلب — حاولوا مرة ثانية.");
      return;
    }
    setQuestion("");
    setOptions(["", ""]);
    setNeededBy("");
    const n = await notifySupervisor("decision", r.id);
    showToast({
      title: "انرسل طلب القرار",
      desc: n.sent ? "وصل المشرف/ة إيميل بالطلب." : "اضغطوا «بواتساب» لإرسال الرابط لها لو ما فعّلت الإيميل.",
      icon: Send,
      tone: "brand",
    });
  };

  const open = decisions.filter((d) => d.status === "open");
  const done = decisions.filter((d) => d.status === "answered");
  const replyDays = availability?.replyDays ?? null;
  const overdue = (d: DecisionRequestRow) => replyDays !== null && now - new Date(d.createdAt).getTime() > replyDays * 86_400_000;

  return (
    <div className="space-y-4">
      {replyDays !== null && (
        <p className="flex items-center gap-2 rounded-2xl border border-brand-100/70 bg-paper/50 px-4 py-2.5 text-xs text-brand-950/65">
          <Clock size={14} className="text-brand-500" />
          المشرف/ة ترد عادةً خلال <b className="text-brand-950">{replyDays} {replyDays <= 2 ? "يوم" : "أيام"}</b>. {availability?.note && <span className="text-brand-950/50">— {availability.note}</span>}
        </p>
      )}

      {canWrite && (
        <Card tone="cream" className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/20">
              <HelpCircle size={20} />
            </span>
            <div>
              <h3 className="font-display text-base font-extrabold text-brand-950">اسألوا المشرف/ة بقرار</h3>
              <p className="text-xs text-brand-950/55">سؤال محدد بخيارات: تضغط خيارًا وينتهي الموضوع، بدون اجتماع.</p>
            </div>
          </div>
          <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={400} placeholder="مثال: نعتمد المنهج الكمي أو النوعي؟" aria-label="السؤال" className={inputClass} />
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input value={o} onChange={(e) => setOptions((p) => p.map((x, j) => (j === i ? e.target.value : x)))} maxLength={120} placeholder={`الخيار ${i + 1}`} aria-label={`الخيار ${i + 1}`} className={inputClass} />
                {options.length > 2 && (
                  <button onClick={() => setOptions((p) => p.filter((_, j) => j !== i))} aria-label="حذف الخيار" className="rounded-xl px-2.5 text-brand-950/40 hover:bg-rose-500/10 hover:text-rose-500">
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            {options.length < 4 && (
              <button onClick={() => setOptions((p) => [...p, ""])} className="flex items-center gap-1 text-xs font-bold text-brand-700 hover:underline">
                <Plus size={13} />
                أضيفوا خيارًا
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold text-brand-950/60">
              نحتاج الرد قبل (اختياري)
              <input type="date" min={toISODate(new Date())} value={neededBy} onChange={(e) => setNeededBy(e.target.value)} className={`${inputClass} mt-1`} />
            </label>
            <button onClick={submit} disabled={!valid || saving} className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-brand-500/25 transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 motion-reduce:transition-none">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              أرسلوا الطلب
            </button>
          </div>
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600">{error}</p>}
        </Card>
      )}

      {decisions.length === 0 ? (
        <Card>
          <EmptyState icon={HelpCircle} title="ما فيه طلبات قرار بعد" desc="أي سؤال تتأخرون فيه بسبب انتظار الرد، اكتبوه هنا بخيارات واضحة." />
        </Card>
      ) : (
        <div className="space-y-3">
          {open.map((d) => (
            <Card key={d.id} className="space-y-3 !p-4 sm:!p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-extrabold text-brand-950">{d.question}</p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-accent-300/50 bg-amber-accent-100/40 px-2.5 py-1 text-[11px] font-bold text-amber-accent-700">
                    <Clock size={12} />
                    بانتظار القرار
                  </span>
                  {canWrite && <ThreeDotsMenu items={[{ label: "إلغاء الطلب", confirmLabel: "تأكيد الإلغاء؟", icon: Trash2, tone: "danger", onClick: () => onCancel(d.id) }]} />}
                </div>
              </div>
              <ul className="flex flex-wrap gap-2">
                {d.options.map((o) => (
                  <li key={o} className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-brand-950/70">{o}</li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-2 text-xs text-brand-950/50">
                {d.neededBy && <span>مطلوب قبل {formatDateShort(d.neededBy)} ({relativeDayLabel(d.neededBy)})</span>}
                {overdue(d) && <span className="rounded-full bg-amber-accent-100/50 px-2 py-0.5 font-bold text-amber-accent-700">تجاوز المدة المتوقعة، ذكّروا بلطف</span>}
                <span className="flex-1" />
                {supervisorUrl && (
                  <a href={whatsappUrl(decisionRequestMessage(d.question, supervisorUrl))} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-brand-100 px-3 py-1.5 font-bold text-brand-700 hover:bg-surface-muted">
                    <MessageCircle size={12} />
                    بواتساب
                  </a>
                )}
              </div>
            </Card>
          ))}
          {done.map((d) => (
            <Card key={d.id} className="space-y-2.5 !p-4 sm:!p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="font-extrabold text-brand-950">{d.question}</p>
                <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-500">
                  <CheckCircle2 size={12} />
                  تم القرار
                </span>
              </div>
              <ul className="flex flex-wrap gap-2">
                {d.options.map((o, i) => (
                  <li key={o} className={`rounded-full px-3 py-1 text-xs font-semibold ${i === d.chosenIndex ? "bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-400/40" : "bg-surface-muted text-brand-950/40 line-through"}`}>{o}</li>
                ))}
              </ul>
              {d.answerNote && <p className="text-sm text-brand-950/70">«{d.answerNote}»</p>}
              <p className="text-xs text-brand-950/45">{d.supervisorName || "المشرف/ة"} · {d.answeredAt ? formatDateShort(d.answeredAt.slice(0, 10)) : ""}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
