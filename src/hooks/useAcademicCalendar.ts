import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import type { AcademicEvent, SeasonKind } from "../lib/season";

/** التقويم الأكاديمي للفريق (academic_calendar · PENDING_2026-11-18_growth_features.sql). قبل الملف: available=false */
export function useAcademicCalendar() {
  const { team, mode } = useAuth();
  const [events, setEvents] = useState<AcademicEvent[]>([]);
  const [available, setAvailable] = useState(false);
  const load = useCallback(async () => {
    if (mode !== "supabase" || !supabase || !team?.id) return;
    const { data, error } = await supabase.from("academic_calendar").select("id, kind, title, starts_on, ends_on").order("starts_on");
    if (error) return setAvailable(false);
    setAvailable(true);
    setEvents(((data ?? []) as { id: string; kind: SeasonKind; title: string; starts_on: string; ends_on: string | null }[]).map((r) => ({ id: r.id, kind: r.kind, title: r.title, startsOn: r.starts_on, endsOn: r.ends_on })));
  }, [mode, team?.id]);
  useEffect(() => {
    void load();
  }, [load]);
  const add = async (e: Omit<AcademicEvent, "id">, college = "") => {
    if (!supabase) return false;
    const { error } = await supabase.from("academic_calendar").insert({ kind: e.kind, title: e.title, starts_on: e.startsOn, ends_on: e.endsOn, college });
    await load();
    return !error;
  };
  const remove = async (id: string) => {
    if (!supabase) return;
    await supabase.from("academic_calendar").delete().eq("id", id);
    await load();
  };
  return { events, available, add, remove };
}
