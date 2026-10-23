import { useMemo, useState } from "react";
import { CalendarCheck, CalendarClock, CalendarX, Check, Clock, Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import Card from "../ui/Card";
import EmptyState from "../ui/EmptyState";
import ThreeDotsMenu from "../ui/ThreeDotsMenu";
import { useToast } from "../../context/ToastContext";
import { formatDateFull, formatDateShort, relativeDayLabel, toISODate } from "../../lib/date";
import { availabilityRequestMessage, bookingRequestMessage, generateSlots, WEEKDAY_NAMES, whatsappUrl } from "../../lib/meetings";
import { notifySupervisor } from "../../lib/supervisorNotify";
import type { MeetingBookingRow, SupervisorAvailabilityRow } from "../../data/types";

interface AppointmentsTabProps {
  availability: SupervisorAvailabilityRow | null;
  bookings: MeetingBookingRow[];
  supervisorUrl: string | null;
  canWrite: boolean;
  onBook: (date: string, time: string, note?: string) => Promise<{ id?: string; status?: "pending" | "confirmed"; error?: string }>;
  onCancel: (id: string) => Promise<{ error?: string }>;
}

const inputClass = "w-full rounded-xl border border-brand-100 bg-paper/60 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-brand-300";

const STATUS: Record<MeetingBookingRow["status"], { label: string; cls: string; icon: typeof Clock }> = {
  confirmed: { label: "مؤكد", cls: "border-emerald-400/30 bg-emerald-500/10 text-emerald-500", icon: CalendarCheck },
  pending: { label: "بانتظار تأكيد المشرف/ة", cls: "border-amber-accent-300/50 bg-amber-accent-100/40 text-amber-accent-700", icon: Clock },
  declined: { label: "اعتذرت، اقترحوا غيره", cls: "border-rose-300/40 bg-rose-500/10 text-rose-500", icon: CalendarX },
  cancelled: { label: "ملغي", cls: "border-brand-100 bg-surface-muted text-brand-950/45", icon: CalendarX },
};

/** أوقات المشرف/ة المتاحة (تحددها مرة وحدة من رابطها) والحجز منها بضغطة، مع تأكيد تلقائي لو فعّلته. */
export default function AppointmentsTab({ availability, bookings, supervisorUrl, canWrite, onBook, onCancel }: AppointmentsTabProps) {
  const { showToast } = useToast();
  const today = toISODate(new Date());
  const days = useMemo(() => generateSlots(availability, bookings, today, 21, new Date()), [availability, bookings, today]);
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [pickedTime, setPickedTime] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("10:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasWindows = !!availability && availability.windows.length > 0;
  const activeDate = pickedDate && days.some((d) => d.date === pickedDate) ? pickedDate : days[0]?.date ?? null;
  const dayTimes = days.find((d) => d.date === activeDate)?.times ?? [];

  const book = async (date: string, time: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await onBook(date, time, note);
    setBusy(false);
    if (r.error) {
      setError(r.error);
      return;
    }
    setPickedTime(null);
    setNote("");
    if (r.status === "confirmed") {
      showToast({ title: "تم حجز الموعد", desc: `${formatDateFull(date)} الساعة ${time} — انضاف لتقويمكم.`, icon: Check, tone: "brand" });
    } else {
      showToast({ title: "انرسل اقتراح الموعد", desc: "بانتظار تأكيد المشرف/ة.", icon: Send, tone: "brand" });
      if (r.id) notifySupervisor("booking", r.id);
    }
  };

  // القادمة أول (الأقرب فالأبعد)، بعدها الماضية والملغية (الأحدث أول)
  const isLive = (b: MeetingBookingRow) => (b.status === "pending" || b.status === "confirmed") && b.date >= today;
  const mine = bookings
    .filter((b) => b.status !== "cancelled" || b.date >= today)
    .sort((a, b) => (isLive(a) === isLive(b) ? (isLive(a) ? (a.date + a.time).localeCompare(b.date + b.time) : (b.date + b.time).localeCompare(a.date + a.time)) : isLive(a) ? -1 : 1));

  return (
    <div className="space-y-4">
      {hasWindows ? (
        <Card tone="cream" className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/20">
              <CalendarClock size={20} />
            </span>
            <div>
              <h3 className="font-display text-base font-extrabold text-brand-950">احجزوا من أوقات المشرف/ة</h3>
              <p className="text-xs text-brand-950/55">
                {availability!.windows.map((w) => `${WEEKDAY_NAMES[w.weekday]} ${w.start}–${w.end}`).join(" · ")} · {availability!.slotMinutes} دقيقة
                {availability!.autoConfirm ? " · يتأكد الحجز تلقائيًا" : " · تؤكده المشرف/ة"}
              </p>
            </div>
          </div>

          {days.length === 0 ? (
            <p className="rounded-xl bg-surface-muted px-3.5 py-3 text-sm text-brand-950/60">ما فيه أوقات متاحة خلال ٣ أسابيع. ارسلوا لها واتساب تفتح أوقاتًا جديدة.</p>
          ) : (
            <>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="الأيام المتاحة">
                {days.map((d) => (
                  <button key={d.date} role="tab" aria-selected={d.date === activeDate} onClick={() => { setPickedDate(d.date); setPickedTime(null); }} className={`shrink-0 rounded-2xl border px-3.5 py-2 text-start transition-colors ${d.date === activeDate ? "border-brand-400 bg-brand-500/15 text-brand-950" : "border-brand-100 bg-paper/50 text-brand-950/70 hover:bg-surface-muted"}`}>
                    <span className="block text-xs font-extrabold">{formatDateShort(d.date)}</span>
                    <span className="block text-[11px] text-brand-950/50">{relativeDayLabel(d.date)}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {dayTimes.map((t) => (
                  <button key={t} onClick={() => setPickedTime(t)} className={`rounded-xl border px-4 py-2 text-sm font-bold tabular-nums transition-colors ${pickedTime === t ? "border-brand-400 bg-gradient-to-br from-brand-400 to-brand-600 text-white" : "border-brand-100 bg-paper/50 text-brand-950/80 hover:bg-surface-muted"}`}>
                    {t}
                  </button>
                ))}
              </div>
              {pickedTime && activeDate && canWrite && (
                <div className="space-y-2.5 rounded-2xl border border-brand-100/70 bg-paper/40 p-3.5">
                  <p className="text-sm font-extrabold text-brand-950">{formatDateFull(activeDate)} · {pickedTime}</p>
                  <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="ملاحظة للاجتماع (اختياري): وش نبغى نناقش؟" aria-label="ملاحظة" className={inputClass} />
                  <button onClick={() => book(activeDate, pickedTime)} disabled={busy} className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-brand-500/25 transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transition-none">
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <CalendarCheck size={15} />}
                    {availability!.autoConfirm ? "احجزوا الموعد" : "اقترحوا هذا الموعد"}
                  </button>
                </div>
              )}
            </>
          )}
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600">{error}</p>}
        </Card>
      ) : (
        <Card tone="cream" className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-500/20">
              <CalendarClock size={20} />
            </span>
            <div>
              <h3 className="font-display text-base font-extrabold text-brand-950">المشرف/ة ما حدد أوقاته بعد</h3>
              <p className="text-xs leading-relaxed text-brand-950/55">اطلبوا منه/ا يحدد أوقاته المتاحة مرة وحدة من رابطه، وبعدها تحجزون من نفس الأوقات بدون رسائل رايحة جاية.</p>
            </div>
          </div>
          {supervisorUrl && (
            <a href={whatsappUrl(availabilityRequestMessage(supervisorUrl))} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-brand-500/25">
              <MessageCircle size={15} />
              اطلبوا الأوقات بواتساب
            </a>
          )}
          {canWrite && (
            <div className="space-y-2.5 rounded-2xl border border-brand-100/70 bg-paper/40 p-3.5">
              <p className="text-xs font-extrabold text-brand-950/70">أو اقترحوا موعدًا مباشرة (يظهر له/ا للتأكيد)</p>
              <div className="flex flex-wrap gap-2">
                <input type="date" min={today} value={manualDate} onChange={(e) => setManualDate(e.target.value)} aria-label="تاريخ الاقتراح" className={`${inputClass} !w-auto`} />
                <input type="time" value={manualTime} onChange={(e) => setManualTime(e.target.value)} aria-label="وقت الاقتراح" className={`${inputClass} !w-auto`} />
                <button onClick={() => manualDate && book(manualDate, manualTime)} disabled={busy || !manualDate} className="flex items-center gap-2 rounded-xl border border-brand-100 px-4 py-2.5 text-sm font-bold text-brand-700 hover:bg-surface-muted disabled:opacity-50">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  اقترحوا الموعد
                </button>
              </div>
              {error && <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600">{error}</p>}
            </div>
          )}
        </Card>
      )}

      {mine.length === 0 ? (
        <Card>
          <EmptyState icon={CalendarClock} title="ما فيه مواعيد محجوزة" desc="الموعد المؤكد يظهر هنا وبتقويمكم وبالرئيسية." />
        </Card>
      ) : (
        <div className="space-y-2.5">
          <h4 className="text-xs font-extrabold tracking-wide text-brand-950/45">مواعيدكم</h4>
          {mine.map((b) => {
            const s = STATUS[b.status];
            const Icon = s.icon;
            const live = b.status === "pending" || b.status === "confirmed";
            return (
              <Card key={b.id} className="!p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-extrabold text-brand-950">{formatDateFull(b.date)} · {b.time}</p>
                    <p className="text-xs text-brand-950/45">{relativeDayLabel(b.date)}{b.note ? ` · ${b.note}` : ""}</p>
                    {b.supervisorNote && <p className="mt-1 text-xs text-brand-950/65">ملاحظة المشرف/ة: {b.supervisorNote}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${s.cls}`}>
                      <Icon size={12} />
                      {s.label}
                    </span>
                    {b.status === "pending" && supervisorUrl && (
                      <a href={whatsappUrl(bookingRequestMessage(formatDateFull(b.date), b.time, supervisorUrl))} target="_blank" rel="noreferrer" aria-label="تذكير بواتساب" className="grid h-8 w-8 place-items-center rounded-lg border border-brand-100 text-brand-700 hover:bg-surface-muted">
                        <MessageCircle size={14} />
                      </a>
                    )}
                    {live && canWrite && <ThreeDotsMenu items={[{ label: "إلغاء الموعد", confirmLabel: "تأكيد الإلغاء؟", icon: Trash2, tone: "danger", onClick: () => onCancel(b.id) }]} />}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
