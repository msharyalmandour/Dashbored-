import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { arabicMonths, arabicWeekdaysShort, toISODate } from "../lib/date";
import type { CalendarEvent } from "../data/types";

const eventDot: Record<CalendarEvent["type"], string> = {
  meeting: "bg-sky-accent-500",
  review: "bg-brand-500",
  fieldwork: "bg-amber-accent-500",
  deadline: "bg-rose-500",
};

interface DayCell {
  date: Date;
  iso: string;
  inMonth: boolean;
}

function buildMonthGrid(year: number, month: number): DayCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    return {
      date,
      iso: toISODate(date),
      inMonth: date.getMonth() === month,
    };
  });
}

export default function MiniCalendar({
  events,
  today = new Date(),
  selectedDate,
  onSelectDate,
}: {
  events: CalendarEvent[];
  today?: Date;
  selectedDate: string;
  onSelectDate: (iso: string) => void;
}) {
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const todayIso = toISODate(today);

  const grid = useMemo(
    () => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [events]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-bold text-brand-950">
          {arabicMonths[cursor.getMonth()]} {cursor.getFullYear()}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="rounded-lg p-1 text-brand-950/40 hover:bg-surface-muted hover:text-brand-700"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="rounded-lg p-1 text-brand-950/40 hover:bg-surface-muted hover:text-brand-700"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {arabicWeekdaysShort.map((day) => (
          <div key={day} className="pb-1 text-[11px] font-semibold text-brand-950/35">
            {day}
          </div>
        ))}

        {grid.map((cell) => {
          const dayEvents = eventsByDate.get(cell.iso) ?? [];
          const isToday = cell.iso === todayIso;
          const isSelected = cell.iso === selectedDate;

          return (
            <button
              key={cell.iso}
              onClick={() => onSelectDate(cell.iso)}
              className={clsx(
                "relative mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-full text-sm transition-colors",
                !cell.inMonth && "text-brand-950/20",
                cell.inMonth && !isSelected && !isToday && "text-brand-950/70 hover:bg-surface-muted",
                isToday && !isSelected && "bg-brand-500 font-bold text-white",
                isSelected && "bg-amber-accent-400 font-bold text-white",
              )}
            >
              {cell.date.getDate()}
              {dayEvents.length > 0 && (
                <span className="absolute bottom-1 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <span
                      key={e.id}
                      className={clsx(
                        "h-1 w-1 rounded-full",
                        isSelected || isToday ? "bg-white/80" : eventDot[e.type],
                      )}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
