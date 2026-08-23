import { useState } from "react";
import { CalendarClock, MapPin, Users2, Flag, ClipboardCheck } from "lucide-react";
import Card, { CardHeader } from "../components/ui/Card";
import MiniCalendar from "../components/MiniCalendar";
import { calendarEvents } from "../data/mockData";
import type { CalendarEventType } from "../data/types";
import { formatDateLong, toISODate } from "../lib/date";

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
  const [selectedDate, setSelectedDate] = useState(toISODate(today));

  const dayEvents = calendarEvents
    .filter((e) => e.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card tone="sky" className="lg:col-span-2">
        <MiniCalendar
          events={calendarEvents}
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
            <p className="py-6 text-center text-sm text-brand-950/40">لا توجد أحداث في هذا اليوم</p>
          )}
        </ul>
      </Card>
    </div>
  );
}
