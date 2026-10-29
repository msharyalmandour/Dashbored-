import { useCallback, useEffect, useRef, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

/** سجل المقابلات (جدول interviews) — للدراسات الكيفية. رمز المشارك بدل الاسم عشان الخصوصية. */
export type InterviewStatus = "planned" | "done" | "transcribed" | "coded";
export type InterviewMode = "in_person" | "phone" | "online";

export interface Interview {
  id: string;
  code: string;
  date: string | null;
  durationMin: number | null;
  mode: InterviewMode;
  status: InterviewStatus;
  newThemes: number | null;
  notes: string;
  createdAt: string;
}

interface Row {
  id: string;
  code: string;
  interview_date: string | null;
  duration_min: number | null;
  mode: InterviewMode;
  status: InterviewStatus;
  new_themes: number | null;
  notes: string;
  created_at: string;
}

const mapRow = (r: Row): Interview => ({
  id: r.id,
  code: r.code,
  date: r.interview_date,
  durationMin: r.duration_min,
  mode: r.mode,
  status: r.status,
  newThemes: r.new_themes,
  notes: r.notes ?? "",
  createdAt: r.created_at,
});

const DEMO: Interview[] = [
  { id: "i1", code: "P1", date: "2026-08-10", durationMin: 42, mode: "in_person", status: "coded", newThemes: 7, notes: "", createdAt: "2026-08-10" },
  { id: "i2", code: "P2", date: "2026-08-13", durationMin: 38, mode: "online", status: "coded", newThemes: 4, notes: "", createdAt: "2026-08-13" },
  { id: "i3", code: "P3", date: "2026-08-17", durationMin: 51, mode: "in_person", status: "transcribed", newThemes: 2, notes: "", createdAt: "2026-08-17" },
  { id: "i4", code: "P4", date: "2026-08-24", durationMin: null, mode: "phone", status: "planned", newThemes: null, notes: "", createdAt: "2026-08-20" },
];

let demoId = 100;
let channelSeq = 0;

export type InterviewInput = Omit<Interview, "id" | "createdAt">;

export function useInterviews() {
  const [interviews, setInterviews] = useState<Interview[]>(isSupabaseConfigured ? [] : DEMO);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const channelId = useRef(++channelSeq);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase!.from("interviews").select("*").order("interview_date", { ascending: true, nullsFirst: false }).order("created_at");
    if (data) setInterviews((data as Row[]).map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    load();
    const ch = supabase!
      .channel(`interviews-sync-${channelId.current}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "interviews" }, load)
      .subscribe();
    return () => {
      supabase!.removeChannel(ch);
    };
  }, [load]);

  const toRow = (i: Partial<InterviewInput>) => ({
    ...(i.code !== undefined && { code: i.code }),
    ...(i.date !== undefined && { interview_date: i.date }),
    ...(i.durationMin !== undefined && { duration_min: i.durationMin }),
    ...(i.mode !== undefined && { mode: i.mode }),
    ...(i.status !== undefined && { status: i.status }),
    ...(i.newThemes !== undefined && { new_themes: i.newThemes }),
    ...(i.notes !== undefined && { notes: i.notes }),
  });

  const addInterview = async (input: InterviewInput) => {
    if (!isSupabaseConfigured) {
      setInterviews((prev) => [...prev, { ...input, id: `i${demoId++}`, createdAt: new Date().toISOString() }]);
      return { error: undefined as string | undefined };
    }
    const { data, error } = await supabase!.from("interviews").insert(toRow(input)).select().single();
    if (data) setInterviews((prev) => [...prev, mapRow(data as Row)]);
    return { error: error?.message };
  };

  const updateInterview = async (id: string, patch: Partial<InterviewInput>) => {
    let previous: Interview[] = [];
    setInterviews((prev) => {
      previous = prev;
      return prev.map((i) => (i.id === id ? { ...i, ...patch } : i));
    });
    if (!isSupabaseConfigured) return { error: undefined as string | undefined };
    const { error } = await supabase!.from("interviews").update(toRow(patch)).eq("id", id);
    if (error) setInterviews(previous);
    return { error: error?.message };
  };

  const removeInterview = async (id: string) => {
    let previous: Interview[] = [];
    setInterviews((prev) => {
      previous = prev;
      return prev.filter((i) => i.id !== id);
    });
    if (!isSupabaseConfigured) return { error: undefined as string | undefined };
    const { error } = await supabase!.from("interviews").delete().eq("id", id);
    if (error) setInterviews(previous);
    return { error: error?.message };
  };

  return { interviews, loading, addInterview, updateInterview, removeInterview };
}
