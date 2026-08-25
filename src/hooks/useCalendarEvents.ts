import { useState } from "react";
import { calendarEvents as mockEvents } from "../data/mockData";
import type { CalendarEvent } from "../data/types";

const LOCAL_EVENTS_KEY = "nursync.localCalendarEvents";

function loadLocalEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_EVENTS_KEY);
    return raw ? (JSON.parse(raw) as CalendarEvent[]) : [];
  } catch {
    return [];
  }
}

let idCounter = 1;

/** أحداث التقويم — تجمع الأحداث التجريبية مع أي حدث تضيفه أنتِ محليًا (محفوظ بمتصفحك فقط، ولسا ما يتزامن بين أعضاء الفريق) */
export function useCalendarEvents() {
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>(loadLocalEvents);

  const events = [...mockEvents, ...localEvents];

  const addEvent = (input: Omit<CalendarEvent, "id">) => {
    const newEvent: CalendarEvent = { ...input, id: `local-${Date.now()}-${idCounter++}` };
    setLocalEvents((prev) => {
      const updated = [...prev, newEvent];
      localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  return { events, addEvent };
}
