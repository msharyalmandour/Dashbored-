import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

export interface MemoryNote {
  id: string;
  note: string;
  createdAt: string;
}

/** ذاكرة المشروع: قرارات الفريق وحقائقه اللي يطلب من الوكيل يتذكرها. الجدول جديد — لو ما انشأ بعد، القائمة فاضية بدون أخطاء. */
export function useProjectMemory() {
  const [notes, setNotes] = useState<MemoryNote[]>([]);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase!.from("project_memory").select("id, note, created_at").order("created_at").limit(100);
    if (data) setNotes((data as { id: string; note: string; created_at: string }[]).map((r) => ({ id: r.id, note: r.note, createdAt: r.created_at })));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (note: string, userId: string): Promise<{ id?: string; error?: string }> => {
    if (!isSupabaseConfigured) return { error: "demo" };
    const { data: projectId } = await supabase!.rpc("my_research_project_id");
    if (!projectId) return { error: "no project" };
    const { data, error } = await supabase!.from("project_memory").insert({ research_project_id: projectId, note: note.trim().slice(0, 400), created_by: userId }).select("id").single();
    if (error) return { error: error.message };
    await load();
    return { id: (data as { id: string }).id };
  };

  const remove = async (id: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) return { error: "demo" };
    const { error } = await supabase!.from("project_memory").delete().eq("id", id);
    if (!error) await load();
    return { error: error?.message };
  };

  return { notes, add, remove };
}
