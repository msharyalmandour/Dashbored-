import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

/** قائمة تحقق مشتركة للفريق (جدول project_checklists). بوضع العرض: بالذاكرة فقط. */
export function useChecklist(listKey: string, projectId: string | null, userId: string | null) {
  const [done, setDone] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !projectId) return;
    const { data } = await supabase!
      .from("project_checklists")
      .select("item_key, done")
      .eq("research_project_id", projectId)
      .eq("list_key", listKey);
    if (data) setDone(Object.fromEntries((data as { item_key: string; done: boolean }[]).map((r) => [r.item_key, r.done])));
  }, [listKey, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (itemKey: string) => {
    const next = !done[itemKey];
    setDone((p) => ({ ...p, [itemKey]: next }));
    if (!isSupabaseConfigured || !projectId) return;
    const { error } = await supabase!.from("project_checklists").upsert(
      {
        research_project_id: projectId,
        list_key: listKey,
        item_key: itemKey,
        done: next,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "research_project_id,list_key,item_key" },
    );
    if (error) setDone((p) => ({ ...p, [itemKey]: !next }));
  };

  return { done, toggle };
}
