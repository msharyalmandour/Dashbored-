import { useMemo, useState } from "react";
import clsx from "clsx";
import { CalendarCheck, CalendarClock, CalendarX, Check, Clock, Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import LoadingButton from "../ui/LoadingButton";
import { glassCard, gradientPill, pillField } from "../ui/researchUi";
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

const STATUS: Record<MeetingBookingRow["status"], { label: string; cls: string; icon: typeof Clock }> = {
  confirmed: { label: "مؤكد", cls: "border-[#7fd6a0]/40 bg-[#7fd6a0]/10 text-[#7fd6a0]", icon: CalendarCheck },
  pending: { label: "بانتظار تأكيد المشرف/ة", cls: "border-[#FFB444]/40 bg-[#FFB444]/10 text-[#FFB444]", icon: Clock },
  declined: { label: "اعتذرت، اقترحوا غيره", cls: "border-rose-400/40 bg-rose-500/10 text-rose-300", icon: CalendarX },
  cancelled: { label: "ملغي", cls: "border-white/15 bg-white/[0.04] text-[#B8ADA2]", icon: CalendarX },
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
    <div className="space-y-5">
      {hasWindows ? (
        <section className={clsx(glassCard, "space-y-5 p-6")}>
          <div>
            <h3 className="font-kufi text-xl font-extrabold">احجزوا من أوقات المشرف/ة</h3>
            <p className="mt-1 text-xs text-[#B8ADA2]">
              {availability!.windows.map((w) => `${WEEKDAY_NAMES[w.weekday]} ${w.start}–${w.end}`).join(" · ")} · {availability!.slotMinutes} دقيقة
              {availability!.autoConfirm ? " · يتأكد الحجز تلقائيًا" : " · تؤكده المشرف/ة"}
            </p>
          </div>

          {days.length === 0 ? (
            <p className="rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-[#B8ADA2]">ما فيه أوقات متاحة خلال ٣ أسابيع. أرسلوا لها واتساب تفتح أوقاتًا جديدة.</p>
          ) : (
            <>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="الأيام المتاحة">
                {days.map((d) => (
                  <button
                    key={d.date}
                    role="tab"
                    aria-selected={d.date === activeDate}
                    onClick={() => {
                      setPickedDate(d.date);
                      setPickedTime(null);
                    }}
                    className={clsx(
                      "shrink-0 rounded-2xl border px-4 py-2 text-start transition-colors",
                      d.date === activeDate ? "border-[#FF8A24]/70 bg-[#FF6B00]/15 text-[#FFB444]" : "border-white/[0.14] text-[#B8ADA2] hover:text-[#F4F0EC]",
                    )}
                  >
                    <span className="block text-xs font-extrabold">{formatDateShort(d.date)}</span>
                    <span className="block text-[11px] opacity-70">{relativeDayLabel(d.date)}</span>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                {dayTimes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setPickedTime(t)}
                    aria-pressed={pickedTime === t}
                    className={clsx(
                      "rounded-2xl border py-3 text-sm font-bold tabular-nums transition-colors",
                      pickedTime === t ? "border-transparent bg-gradient-to-l from-[#FFB444] to-[#FF6B00] text-[#1A0F00]" : "border-white/[0.14] text-[#E6DBD1] hover:border-[#FF8A24]/60",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {pickedTime && activeDate && canWrite && (
                <div className="space-y-3 rounded-2xl bg-white/[0.04] p-4">
                  <p className="text-sm font-bold">
                    {formatDateFull(activeDate)} · {pickedTime}
                  </p>
                  <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="ملاحظة للاجتماع (اختياري): وش نبغى نناقش؟" aria-label="ملاحظة" className={pillField} />
                  <LoadingButton loading={busy} error={!!error} loadingText="جاري الحجز…" savedText="✓ تم" onClick={() => book(activeDate, pickedTime)}>
                    <CalendarCheck size={15} />
                    {availability!.autoConfirm ? "احجزوا الموعد" : "اقترحوا هذا الموعد"}
                  </LoadingButton>
                </div>
              )}
            </>
          )}
          {error && <p role="alert" className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-300">{error}</p>}
        </section>
      ) : (
        <section className={clsx(glassCard, "space-y-4 p-6")}>
          <div>
            <h3 className="font-kufi text-xl font-extrabold">المشرف/ة ما حدد أوقاته بعد</h3>
            <p className="mt-1 text-sm leading-relaxed text-[#B8ADA2]">اطلبوا منه/ا يحدد أوقاته المتاحة مرة وحدة من رابطه، وبعدها تحجزون من نفس الأوقات بدون رسائل رايحة جاية.</p>
          </div>
          {supervisorUrl && (
            <a href={whatsappUrl(availabilityRequestMessage(supervisorUrl))} target="_blank" rel="noreferrer" className={gradientPill}>
              <MessageCircle size={15} />
              اطلبوا الأوقات بواتساب
            </a>
          )}
          {canWrite && (
            <div className="space-y-2.5 rounded-2xl bg-white/[0.04] p-4">
              <p className="text-xs font-bold text-[#B8ADA2]">أو اقترحوا موعدًا مباشرة (يظهر له/ا للتأكيد)</p>
              <div className="flex flex-wrap gap-2">
                <input type="date" min={today} value={manualDate} onChange={(e) => setManualDate(e.target.value)} aria-label="تاريخ الاقتراح" className={clsx(pillField, "!w-auto")} />
                <input type="time" value={manualTime} onChange={(e) => setManualTime(e.target.value)} aria-label="وقت الاقتراح" className={clsx(pillField, "!w-auto")} />
                <button onClick={() => manualDate && book(manualDate, manualTime)} disabled={busy || !manualDate} className="flex items-center gap-2 rounded-full border border-[#FF8A24]/50 px-5 py-2.5 text-sm font-bold text-[#FFB444] hover:bg-[#FF6B00]/10 disabled:opacity-50">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  اقترحوا الموعد
                </button>
              </div>
              {error && <p role="alert" className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-300">{error}</p>}
            </div>
          )}
        </section>
      )}

      {mine.length === 0 ? (
        <div className={clsx(glassCard, "p-2")}>
          <EmptyState icon={CalendarClock} title="ما فيه مواعيد محجوزة" desc="الموعد المؤكد يظهر هنا وبتقويمكم وبالرئيسية." />
        </div>
      ) : (
        <div className="space-y-2.5">
          <h4 className="font-kufi text-lg font-bold">مواعيدكم</h4>
          {mine.map((b) => {
            const st = STATUS[b.status];
            const Icon = st.icon;
            const live = b.status === "pending" || b.status === "confirmed";
            return (
              <div key={b.id} className={clsx(glassCard, "p-4")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold">
                      {formatDateFull(b.date)} · {b.time}
                    </p>
                    <p className="text-xs text-[#B8ADA2]">
                      {relativeDayLabel(b.date)}
                      {b.note ? ` · ${b.note}` : ""}
                    </p>
                    {b.supervisorNote && <p className="mt-1 text-xs text-[#E6DBD1]">ملاحظة المشرف/ة: {b.supervisorNote}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold ${st.cls}`}>
                      <Icon size={12} />
                      {st.label}
                    </span>
                    {b.status === "pending" && supervisorUrl && (
                      <a href={whatsappUrl(bookingRequestMessage(formatDateFull(b.date), b.time, supervisorUrl))} target="_blank" rel="noreferrer" aria-label="تذكير بواتساب" className="grid h-8 w-8 place-items-center rounded-full border border-white/[0.14] text-[#B8ADA2] hover:text-[#F4F0EC]">
                        <MessageCircle size={14} />
                      </a>
                    )}
                    {live && canWrite && <ThreeDotsMenu items={[{ label: "إلغاء الموعد", confirmLabel: "تأكيد الإلغاء؟", icon: Trash2, tone: "danger", onClick: () => onCancel(b.id) }]} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
