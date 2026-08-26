import { useState } from "react";
import { CalendarClock, MapPin, Users2, Flag, ClipboardCheck, Download, Plus, X } from "lucide-react";
import Card, { CardHeader } from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import MiniCalendar from "../components/MiniCalendar";
import { useCalendarEvents } from "../hooks/useCalendarEvents";
import { useAuth } from "../context/AuthContext";
import type { CalendarEventType } from "../data/types";
import { formatDateLong, toISODate } from "../lib/date";
import { downloadICS } from "../lib/ics";

const today = new Date(2026, 7, 22);

const typeIcon: Record<CalendarEventType, typeof Users2> = {
  meeting: Users2,
  review: ClipboardCheck,
  fieldwork: MapPin,
  deadline: Flag,
};

const typeColor: Record<CalendarEventType, string> = {
  meeting: "bg-sky-accent-50 text-sky-accent-600",
  review: "bg-brand-50 text-brand-600",
  fieldwork: "bg-amber-accent-50 text-amber-accent-600",
  deadline: "bg-rose-50 text-rose-600",
};

const typeLabel: Record<CalendarEventType, string> = {
  meeting: "اجتماع",
  review: "مراجعة",
  fieldwork: "ميداني",
  deadline: "موعد نهائي",
};

export default function CalendarPage() {
  const { canWrite } = useAuth();
  const { events, addEvent } = useCalendarEvents();
  const [selectedDate, setSelectedDate] = useState(toISODate(today));
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    date: toISODate(today),
    time: "09:00",
    type: "deadline" as CalendarEventType,
    location: "",
  });

  const dayEvents = events
    .filter((e) => e.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  const handleAdd = () => {
    if (!form.title.trim()) return;
    addEvent({
      title: form.title.trim(),
      date: form.date,
      time: form.time,
      type: form.type,
      location: form.location.trim(),
    });
    setSelectedDate(form.date);
    setForm({ ...form, title: "", location: "" });
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-end gap-2.5">
        <button
          onClick={() => downloadICS(events)}
          title="حمّلي ملف .ics تضيفينه لتقويم قوقل أو أبل أو أوتلوك"
          className="flex items-center gap-1.5 rounded-xl border border-brand-100 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-surface-muted"
        >
          <Download size={16} />
          تصدير للتقويم
        </button>
        {canWrite && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600"
          >
            <Plus size={16} />
            إضافة حدث / موعد نهائي
          </button>
        )}
      </div>

      {showForm && canWrite && (
        <Card tone="cream" className="relative">
          <button
            onClick={() => setShowForm(false)}
            className="absolute left-4 top-4 text-brand-950/40 hover:text-brand-700"
          >
            <X size={18} />
          </button>
          <h3 className="mb-4 text-base font-bold text-brand-950">إضافة حدث جديد</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block font-semibold text-brand-950/70">العنوان</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-brand-100 px-3 py-2 outline-none focus:border-brand-300"
                placeholder="مثال: الموعد النهائي لتسليم الفصل الرابع"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-brand-950/70">التاريخ</span>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-lg border border-brand-100 px-3 py-2 outline-none focus:border-brand-300"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-brand-950/70">الوقت</span>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full rounded-lg border border-brand-100 px-3 py-2 outline-none focus:border-brand-300"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-brand-950/70">النوع</span>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as CalendarEventType })}
                className="w-full rounded-lg border border-brand-100 px-3 py-2 outline-none focus:border-brand-300"
              >
                <option value="deadline">موعد نهائي</option>
                <option value="meeting">اجتماع</option>
                <option value="review">مراجعة</option>
                <option value="fieldwork">ميداني</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-brand-950/70">الملاحظات / المكان</span>
              <input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full rounded-lg border border-brand-100 px-3 py-2 outline-none focus:border-brand-300"
                placeholder="مثال: البوابة الإلكترونية"
              />
            </label>
          </div>
          <button
            onClick={handleAdd}
            className="mt-4 rounded-xl bg-brand-500 px-5 py-2 text-sm font-bold text-white hover:bg-brand-600"
          >
            إضافة
          </button>
          <p className="mt-3 text-xs text-brand-950/40">
            ملاحظة: الحدث يُحفظ بمتصفحك الحالي فقط، ولسا ما يتزامن تلقائيًا مع بقية أعضاء الفريق.
          </p>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card tone="sky" className="lg:col-span-2">
          <MiniCalendar
            events={events}
            today={today}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </Card>

        <Card>
          <CardHeader
            title={formatDateLong(selectedDate)}
            subtitle={`${dayEvents.length} حدث`}
          />
          <ul className="space-y-3">
            {dayEvents.map((event) => {
              const Icon = typeIcon[event.type];
              return (
                <li key={event.id} className="flex items-start gap-3 rounded-xl border border-brand-50 p-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${typeColor[event.type]}`}>
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-brand-950">{event.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-brand-950/45">
                      <CalendarClock size={12} />
                      {event.time} · {typeLabel[event.type]}
                    </p>
                    <p className="mt-0.5 text-xs text-brand-950/40">{event.location}</p>
                  </div>
                </li>
              );
            })}
            {dayEvents.length === 0 && (
              <EmptyState
                icon={CalendarClock}
                title="يوم فاضي من المواعيد"
                desc="ما فيه شي مسجّل بهذا اليوم — استغلّيه لخطوة بحثية إضافية، أو خذي راحة."
              />
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
