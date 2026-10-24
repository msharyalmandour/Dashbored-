import { useState } from "react";
import clsx from "clsx";
import { CheckCircle2, Clock, HelpCircle, MessageCircle, Plus, Send, Trash2, X } from "lucide-react";
import LoadingButton from "../ui/LoadingButton";
import { glassCard, pillField } from "../ui/researchUi";
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
    <div className="space-y-5">
      {replyDays !== null && (
        <p className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-[#B8ADA2]">
          <Clock size={14} className="text-[#FFB444]" />
          المشرف/ة ترد عادةً خلال <b className="text-[#F4F0EC]">{replyDays} {replyDays <= 2 ? "يوم" : "أيام"}</b>. {availability?.note && <span>— {availability.note}</span>}
        </p>
      )}

      {canWrite && (
        <section className={clsx(glassCard, "space-y-4 p-6")}>
          <div>
            <h3 className="font-kufi text-xl font-extrabold">اسألوا المشرف/ة بقرار</h3>
            <p className="mt-1 text-sm text-[#B8ADA2]">سؤال محدد بخيارات: تضغط خيارًا وينتهي الموضوع، بدون اجتماع.</p>
          </div>
          <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={400} placeholder="مثال: نعتمد المنهج الكمي أو النوعي؟" aria-label="السؤال" className={pillField} />
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 text-xs text-[#B8ADA2]">{i + 1}</span>
                <input value={o} onChange={(e) => setOptions((p) => p.map((x, j) => (j === i ? e.target.value : x)))} maxLength={120} placeholder={`الخيار ${i + 1}`} aria-label={`الخيار ${i + 1}`} className={pillField} />
                {options.length > 2 && (
                  <button onClick={() => setOptions((p) => p.filter((_, j) => j !== i))} aria-label="حذف الخيار" className="rounded-full p-2 text-[#B8ADA2] hover:bg-rose-500/10 hover:text-rose-400">
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            {options.length < 4 && (
              <button onClick={() => setOptions((p) => [...p, ""])} className="flex items-center gap-1 text-xs font-bold text-[#FFB444] hover:underline">
                <Plus size={13} />
                أضيفوا خيارًا
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold text-[#B8ADA2]">
              نحتاج الرد قبل (اختياري)
              <input type="date" min={toISODate(new Date())} value={neededBy} onChange={(e) => setNeededBy(e.target.value)} className={clsx(pillField, "mt-1")} />
            </label>
            <LoadingButton loading={saving} error={!!error} loadingText="جاري الإرسال…" savedText="✓ انرسل" onClick={submit} disabled={!valid}>
              <Send size={15} />
              أرسلوا الطلب
            </LoadingButton>
          </div>
          {error && <p role="alert" className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-300">{error}</p>}
        </section>
      )}

      {decisions.length === 0 ? (
        <div className={clsx(glassCard, "p-2")}>
          <EmptyState icon={HelpCircle} title="ما فيه طلبات قرار بعد" desc="أي سؤال تتأخرون فيه بسبب انتظار الرد، اكتبوه هنا بخيارات واضحة." />
        </div>
      ) : (
        <div className="space-y-3">
          <h4 className="font-kufi text-lg font-bold">الأسئلة المرسلة</h4>
          {open.map((d) => (
            <div key={d.id} className={clsx(glassCard, "space-y-3 p-5")}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold">{d.question}</p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#FFB444]/40 bg-[#FFB444]/10 px-2.5 py-1 text-[11px] font-bold text-[#FFB444]">
                    <Clock size={12} />
                    بانتظار القرار
                  </span>
                  {canWrite && <ThreeDotsMenu items={[{ label: "إلغاء الطلب", confirmLabel: "تأكيد الإلغاء؟", icon: Trash2, tone: "danger", onClick: () => onCancel(d.id) }]} />}
                </div>
              </div>
              <ul className="flex flex-wrap gap-2">
                {d.options.map((o) => (
                  <li key={o} className="rounded-full border border-white/[0.14] px-3.5 py-1 text-xs font-semibold text-[#E6DBD1]">{o}</li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#B8ADA2]">
                {d.neededBy && <span>مطلوب قبل {formatDateShort(d.neededBy)} ({relativeDayLabel(d.neededBy)})</span>}
                {overdue(d) && <span className="rounded-full bg-[#FFB444]/15 px-2 py-0.5 font-bold text-[#FFB444]">تجاوز المدة المتوقعة، ذكّروا بلطف</span>}
                <span className="flex-1" />
                {supervisorUrl && (
                  <a href={whatsappUrl(decisionRequestMessage(d.question, supervisorUrl))} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full border border-white/[0.14] px-3.5 py-1.5 font-bold text-[#B8ADA2] hover:border-[#FF8A24]/50 hover:text-[#F4F0EC]">
                    <MessageCircle size={12} />
                    بواتساب
                  </a>
                )}
              </div>
            </div>
          ))}
          {done.map((d) => (
            <div key={d.id} className={clsx(glassCard, "space-y-2.5 p-5")}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold">{d.question}</p>
                <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[#7fd6a0]/40 bg-[#7fd6a0]/10 px-2.5 py-1 text-[11px] font-bold text-[#7fd6a0]">
                  <CheckCircle2 size={12} />
                  تم القرار
                </span>
              </div>
              <ul className="flex flex-wrap gap-2">
                {d.options.map((o, i) => (
                  <li key={o} className={clsx("rounded-full px-3.5 py-1 text-xs font-semibold", i === d.chosenIndex ? "bg-gradient-to-l from-[#FFB444] to-[#FF6B00] text-[#1A0F00]" : "border border-white/10 text-[#B8ADA2]/60 line-through")}>{o}</li>
                ))}
              </ul>
              {d.answerNote && <p className="text-sm text-[#E6DBD1]">«{d.answerNote}»</p>}
              <p className="text-xs text-[#B8ADA2]">{d.supervisorName || "المشرف/ة"} · {d.answeredAt ? formatDateShort(d.answeredAt.slice(0, 10)) : ""}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
