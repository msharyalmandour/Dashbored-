import { useState } from "react";
import { Check, ClipboardList, Copy, MessageCircle, Sparkles, Wand2 } from "lucide-react";
import Card from "../ui/Card";
import { formatDateFull } from "../../lib/date";
import { whatsappUrl, type Readiness } from "../../lib/meetings";
import type { MeetingBookingRow } from "../../data/types";

interface ReadinessCardProps {
  readiness: Readiness;
  nextBooking?: MeetingBookingRow;
  onUseAgenda: (text: string) => void;
}

/** «جاهزية الاجتماع»: جدول أعمال جاهز من بياناتنا (بنود سابقة + متأخر + قرارات معلقة + أسئلة المرحلة)،
    حتى يكفي اجتماع ١٠ دقايق ويدخل الجميع وهم عارفين وش بيقولون. */
export default function ReadinessCard({ readiness, nextBooking, onUseAgenda }: ReadinessCardProps) {
  const [copied, setCopied] = useState(false);
  const { openActions, overdueTasks, openDecisions, questions, doneCount, totalCount } = readiness;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(readiness.agendaText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // التحديد اليدوي ممكن من النص المعروض
    }
  };

  return (
    <Card tone="cream" className="relative overflow-hidden !p-0">
      <div aria-hidden className="pointer-events-none absolute -top-14 -start-10 h-40 w-40 rounded-full bg-brand-500/15 blur-3xl" />
      <div className="relative p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-accent-400 to-brand-500 text-white shadow-lg shadow-brand-500/20 ring-1 ring-white/20">
              <ClipboardList size={22} />
            </span>
            <div>
              <h3 className="font-display text-base font-extrabold text-brand-950">جاهزية الاجتماع</h3>
              <p className="mt-0.5 text-xs text-brand-950/55">
                {nextBooking
                  ? `اجتماعكم القادم: ${formatDateFull(nextBooking.date)} · ${nextBooking.time}`
                  : "جدول أعمال جاهز قبل ما تجلسون — يوفّر وقتكم ووقت المشرف/ة"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-bold">
            {totalCount > 0 && <span className="rounded-full bg-surface-muted px-2.5 py-1 text-brand-950/65">{openActions.length} بند مفتوح من اجتماع سابق ({doneCount}/{totalCount} منجز)</span>}
            {overdueTasks.length > 0 && <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-rose-500">{overdueTasks.length} متأخرة</span>}
            {openDecisions.length > 0 && <span className="rounded-full bg-amber-accent-100/50 px-2.5 py-1 text-amber-accent-700">{openDecisions.length} قرار ينتظر المشرف/ة</span>}
          </div>
        </div>

        <ul className="mt-4 space-y-1.5">
          {questions.map((q) => (
            <li key={q} className="flex items-start gap-2 text-sm text-brand-950/80">
              <Sparkles size={13} className="mt-1 shrink-0 text-brand-500" />
              {q}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            onClick={() => onUseAgenda(readiness.agendaText)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-brand-500/25 transition-transform hover:-translate-y-0.5 motion-reduce:transition-none"
          >
            <Wand2 size={15} />
            استخدموه كجدول أعمال
          </button>
          <button onClick={copy} className="flex items-center gap-2 rounded-xl border border-brand-100 px-4 py-2.5 text-sm font-bold text-brand-700 hover:bg-surface-muted">
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "تم النسخ" : "انسخوه"}
          </button>
          <a
            href={whatsappUrl(readiness.agendaText)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl border border-brand-100 px-4 py-2.5 text-sm font-bold text-brand-700 hover:bg-surface-muted"
          >
            <MessageCircle size={15} />
            شاركوه بواتساب
          </a>
        </div>
      </div>
    </Card>
  );
}
