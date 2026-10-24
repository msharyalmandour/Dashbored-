import { useState } from "react";
import clsx from "clsx";
import { CalendarClock, Check, Loader2, MapPin, Users2, Flag, ClipboardCheck, Plus, Trash2, X } from "lucide-react";
import { HighlightCard, PageColumns, PageHeader, Panel, primaryBtn, rowSurface } from "../components/ui/page";
import EmptyState from "../components/ui/EmptyState";
import ThreeDotsMenu from "../components/ui/ThreeDotsMenu";
import MiniCalendar from "../components/MiniCalendar";
import PhoneCalendarCard from "../components/PhoneCalendarCard";
import { useCalendarEvents } from "../hooks/useCalendarEvents";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import type { CalendarEventType } from "../data/types";
import { formatDateLong, relativeDayLabel, toISODate } from "../lib/date";
import { tr, trx } from "../lib/i18n";

/** بالحساب الحقيقي «اليوم» هو اليوم فعلًا؛ التاريخ الثابت للعرض التجريبي فقط */
const today = isSupabaseConfigured ? new Date() : new Date(2026, 7, 22);

const typeIcon: Record<CalendarEventType, typeof Users2> = {
  meeting: Users2,
  review: ClipboardCheck,
  fieldwork: MapPin,
  deadline: Flag,
};

const typeColor: Record<CalendarEventType, string> = {
  meeting: "bg-brand-500/15 text-amber-accent-400",
  review: "bg-[#7fd6a0]/15 text-[#7fd6a0]",
  fieldwork: "bg-amber-accent-400/15 text-amber-accent-400",
  deadline: "bg-[#ff7a6b]/15 text-[#ff7a6b]",
};

const typeLabel: Record<CalendarEventType, string> = {
  meeting: tr("اجتماع"),
  review: tr("مراجعة"),
  fieldwork: tr("ميداني"),
  deadline: tr("موعد نهائي"),
};

export default function CalendarPage() {
  const { canWrite, currentUser, isLeader } = useAuth();
  const { showToast } = useToast();
  const { events, loading, addEvent, deleteEvent } = useCalendarEvents();
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(toISODate(today));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    date: toISODate(today),
    time: "09:00",
    type: "meeting" as CalendarEventType,
    location: "",
  });

  const dayEvents = events
    .filter((e) => e.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  const handleAdd = async () => {
    if (!form.title.trim() || saving) return;
    setSaving(true);
    const r = await addEvent({
      title: form.title.trim(),
      date: form.date,
      time: form.time,
      type: form.type,
      location: form.location.trim(),
    });
    setSaving(false);
    if (r.error) {
      showToast({ title: tr("ما انحفظ الموعد"), desc: tr("حاولوا مرة ثانية."), icon: X, tone: "rose" });
      return;
    }
    showToast({ title: tr("انضاف الموعد"), desc: tr("يظهر لكل الفريق وبالرئيسية."), icon: Check, tone: "brand" });
    setSelectedDate(form.date);
    setForm({ ...form, title: "", location: "" });
    setShowForm(false);
  };

  const canDelete = (e: { id: string; createdById?: string }) =>
    isSupabaseConfigured ? canWrite && (isLeader || e.createdById === currentUser?.id) : e.id.startsWith("local-");

  const removeEvent = async (id: string) => {
    const r = await deleteEvent(id);
    if (r.error) showToast({ title: tr("ما انحذف الموعد"), icon: X, tone: "rose" });
  };

  const todayISO = toISODate(today);
  const nextEvent = [...events]
    .filter((e) => e.date >= todayISO)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={tr("الفريق")}
        title={tr("التقويم")}
        subtitle={tr("مواعيد الفريق ومواعيد التسليم بمكان واحد.")}
        action={
          <>
            {canWrite && (
              <button onClick={() => setShowForm((s) => !s)} className={primaryBtn}>
                <Plus size={16} />{tr("إضافة موعد")}</button>
            )}
          </>
        }
      />

      {showForm && canWrite && (
        <Panel className="relative">
          <button
            onClick={() => setShowForm(false)}
            className="absolute left-4 top-4 text-brand-950/40 hover:text-brand-700"
          >
            <X size={18} />
          </button>
          <h3 className="mb-4 text-base font-bold text-brand-950">{tr("إضافة حدث جديد")}</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block font-semibold text-brand-950/70">{tr("العنوان")}</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-brand-100 px-3 py-2 outline-none focus:border-brand-300"
                placeholder={tr("مثال: الموعد النهائي لتسليم الفصل الرابع")}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-brand-950/70">{tr("التاريخ")}</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-lg border border-brand-100 px-3 py-2 outline-none focus:border-brand-300"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-brand-950/70">{tr("الوقت")}</span>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full rounded-lg border border-brand-100 px-3 py-2 outline-none focus:border-brand-300"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-brand-950/70">{tr("النوع")}</span>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as CalendarEventType })}
                className="w-full rounded-lg border border-brand-100 px-3 py-2 outline-none focus:border-brand-300"
              >
                <option value="deadline">{tr("موعد نهائي")}</option>
                <option value="meeting">{tr("اجتماع")}</option>
                <option value="review">{tr("مراجعة")}</option>
                <option value="fieldwork">{tr("ميداني")}</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-brand-950/70">{tr("الملاحظات / المكان")}</span>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full rounded-lg border border-brand-100 px-3 py-2 outline-none focus:border-brand-300"
                placeholder={tr("مثال: البوابة الإلكترونية")}
              />
            </label>
          </div>
          <button
            onClick={handleAdd}
            disabled={saving || !form.title.trim()}
            className={clsx(primaryBtn, "mt-4")}
          >{trx("{0}إضافة", saving && <Loader2 size={15} className="animate-spin" />)}</button>
          <p className="mt-3 text-xs text-brand-950/40">
            {isSupabaseConfigured
              ? tr("الموعد يظهر لكل أعضاء الفريق وبالرئيسية، ويتحدّث مباشرة.")
              : tr("وضع العرض التجريبي: الحدث يُحفظ بمتصفحك فقط.")}
          </p>
        </Panel>
      )}


      <PageColumns
        main={
          <Panel>
            <MiniCalendar
              events={events}
              today={today}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </Panel>
        }
        side={
          <>
            {nextEvent ? (
              <HighlightCard
                kicker={tr("القادم")}
                title={nextEvent.title}
                subtitle={`${relativeDayLabel(nextEvent.date)} · ${nextEvent.time}${nextEvent.location ? ` · ${nextEvent.location}` : ""}`}
              />
            ) : (
              <HighlightCard kicker={tr("القادم")} title={tr("ما فيه مواعيد جاية")} subtitle={tr("أضيفوا أول موعد لفريقكم.")} />
            )}
            <Panel title={formatDateLong(selectedDate)} hint={tr("{0} حدث", dayEvents.length)}>
              <ul className="space-y-2.5">
                {dayEvents.map((event) => {
                  const Icon = typeIcon[event.type];
                  return (
                    <li key={event.id} className={clsx(rowSurface, "flex items-start gap-3")}>
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${typeColor[event.type]}`}>
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-brand-950">{event.title}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-brand-950/50">
                          <CalendarClock size={12} />
                          {event.time} · {typeLabel[event.type]}
                        </p>
                        {event.location && <p className="mt-0.5 text-xs text-brand-950/40">{event.location}</p>}
                      </div>
                      {canDelete(event) && (
                        <ThreeDotsMenu
                          items={[
                            {
                              label: tr("حذف الحدث"),
                              confirmLabel: tr("تأكيد الحذف؟"),
                              icon: Trash2,
                              tone: "danger",
                              onClick: () => removeEvent(event.id),
                            },
                          ]}
                        />
                      )}
                    </li>
                  );
                })}
                {loading && <li className="text-sm text-brand-950/45">{tr("جاري التحميل...")}</li>}
                {!loading && dayEvents.length === 0 && (
                  <EmptyState
                    icon={CalendarClock}
                    title={tr("يوم فاضي من المواعيد")}
                    desc={tr("ما فيه شي مسجّل بهذا اليوم — استغلّوه لخطوة بحثية إضافية، أو خذوا راحة.")}
                  />
                )}
              </ul>
            </Panel>
            <PhoneCalendarCard />
          </>
        }
      />
    </div>
  );
}
