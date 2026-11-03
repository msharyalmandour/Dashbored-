import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import type { SearchLogEntry } from "../lib/scholarBridge";

export interface SearchLogRow extends SearchLogEntry {
  id: string;
}

/** سجل البحث بالقواعد (قوقل سكولار وغيره). الجدول جديد — لو ما انشأ بعد تظهر قائمة فاضية بدون أخطاء. */
export function useSearchLog() {
  const [rows, setRows] = useState<SearchLogRow[]>([]);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase!.from("literature_search_log").select("id, database, query_text, results_count, selected_count, created_by, created_at").order("created_at", { ascending: false }).limit(50);
    if (data)
      setRows(
        (data as { id: string; database: string; query_text: string; results_count: number | null; selected_count: number | null; created_by: string | null; created_at: string }[]).map((r) => ({
          id: r.id,
          database: r.database,
          query: r.query_text,
          results: r.results_count,
          selected: r.selected_count,
          by: r.created_by ?? "",
          at: r.created_at,
        })),
      );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (entry: { database: string; query: string; results: number | null; selected: number | null }, userId: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) return { error: "demo" };
    const { data: projectId } = await supabase!.rpc("my_research_project_id");
    if (!projectId) return { error: "no project" };
    const { error } = await supabase!.from("literature_search_log").insert({
      research_project_id: projectId,
      database: entry.database,
      query_text: entry.query.trim().slice(0, 1000),
      results_count: entry.results,
      selected_count: entry.selected,
      created_by: userId,
    });
    if (!error) await load();
    return { error: error?.message };
  };

  return { rows, add };
}
