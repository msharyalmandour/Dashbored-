import { useCallback, useEffect, useRef, useState } from "react";
import { calendarEvents as mockEvents } from "../data/mockData";
import type { CalendarEvent, CalendarEventType } from "../data/types";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const LOCAL_EVENTS_KEY = "nursync.localCalendarEvents";
const IMPORTED_FLAG_KEY = "wesync.localCalendarImported";

function loadLocalEvents(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_EVENTS_KEY);
    return raw ? (JSON.parse(raw) as CalendarEvent[]) : [];
  } catch {
    return [];
  }
}

interface EventRow {
  id: string;
  title: string;
  event_date: string;
  event_time: string;
  event_type: CalendarEventType;
  location: string;
  created_by: string | null;
}

function mapRow(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    date: row.event_date,
    time: (row.event_time || "09:00").slice(0, 5),
    title: row.title,
    type: row.event_type,
    location: row.location,
    createdById: row.created_by ?? undefined,
  };
}

let idCounter = 1;
let channelCounter = 0;

export type NewCalendarEvent = Omit<CalendarEvent, "id" | "createdById">;

/** أحداث التقويم.
    - بوضع الحساب الحقيقي: مواعيد الفريق من قاعدة البيانات (مشتركة بين الأعضاء وتتحدّث مباشرة)، بدون أي أحداث وهمية.
    - بوضع العرض التجريبي: بيانات تجريبية + أحداث محلية بمتصفحك. */
export function useCalendarEvents() {
  const { currentUser, team } = useAuth();
  const teamId = team?.id;
  const userId = currentUser?.id;

  const [dbEvents, setDbEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>(loadLocalEvents);
  const channelIdRef = useRef<number | null>(null);
  channelIdRef.current ??= channelCounter++;

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !teamId) return [] as CalendarEvent[];
    const { data } = await supabase!
      .from("calendar_events")
      .select("id, title, event_date, event_time, event_type, location, created_by")
      .eq("team_id", teamId)
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true });
    const mapped = ((data ?? []) as EventRow[]).map(mapRow);
    setDbEvents(mapped);
    setLoading(false);
    return mapped;
  }, [teamId]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!teamId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    const importLegacy = async (existing: CalendarEvent[]) => {
      // المواعيد اللي انكتبت سابقًا بمتصفح هذا المستخدم فقط — ننقلها مرة وحدة للفريق ثم ننظّف
      try {
        if (localStorage.getItem(IMPORTED_FLAG_KEY) === teamId) return;
        const legacy = loadLocalEvents();
        const fresh = legacy.filter(
          (l) => l.title?.trim() && !existing.some((e) => e.title === l.title && e.date === l.date && e.time === l.time),
        );
        if (fresh.length > 0 && userId) {
          const { error } = await supabase!.from("calendar_events").insert(
            fresh.map((l) => ({
              team_id: teamId,
              title: l.title.trim(),
              event_date: l.date,
              event_time: l.time || "09:00",
              event_type: l.type,
              location: l.location ?? "",
              created_by: userId,
            })),
          );
          if (error) return;
        }
        localStorage.setItem(IMPORTED_FLAG_KEY, teamId);
        localStorage.removeItem(LOCAL_EVENTS_KEY);
        setLocalEvents([]);
        if (!cancelled && fresh.length > 0) await load();
      } catch {
        // لو التخزين المحلي غير متاح نتجاوز
      }
    };

    load().then((existing) => {
      if (!cancelled) importLegacy(existing);
    });

    const channel = supabase!
      .channel(`calendar-sync-${channelIdRef.current}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events" }, () => {
        load();
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase!.removeChannel(channel);
    };
  }, [teamId, userId, load]);

  const addEvent = async (input: NewCalendarEvent): Promise<{ error?: string }> => {
    if (isSupabaseConfigured) {
      if (!teamId || !userId) return { error: "no_team" };
      const { error } = await supabase!.from("calendar_events").insert({
        team_id: teamId,
        title: input.title,
        event_date: input.date,
        event_time: input.time || "09:00",
        event_type: input.type,
        location: input.location,
        created_by: userId,
      });
      if (error) return { error: error.message };
      await load();
      return {};
    }
    const newEvent: CalendarEvent = { ...input, id: `local-${Date.now()}-${idCounter++}` };
    setLocalEvents((prev) => {
      const updated = [...prev, newEvent];
      localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(updated));
      return updated;
    });
    return {};
  };

  const deleteEvent = async (id: string): Promise<{ error?: string }> => {
    if (isSupabaseConfigured) {
      const previous = dbEvents;
      setDbEvents((prev) => prev.filter((e) => e.id !== id));
      const { error } = await supabase!.from("calendar_events").delete().eq("id", id);
      if (error) {
        setDbEvents(previous);
        return { error: error.message };
      }
      return {};
    }
    setLocalEvents((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(updated));
      return updated;
    });
    return {};
  };

  const events = isSupabaseConfigured ? dbEvents : [...mockEvents, ...localEvents];

  return { events, loading, addEvent, deleteEvent };
}
