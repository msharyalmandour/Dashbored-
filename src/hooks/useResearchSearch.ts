import { useCallback, useEffect, useState } from "react";
import type { ResearchSearchQuery, ResearchSearchResult } from "../data/types";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

interface SearchRowDb {
  id: string;
  query_text: string;
  results: ResearchSearchResult[];
  novelty_note: string | null;
  created_by: string | null;
  created_at: string;
}

function mapRow(row: SearchRowDb): ResearchSearchQuery {
  return {
    id: row.id,
    queryText: row.query_text,
    results: row.results ?? [],
    noveltyNote: row.novelty_note,
    createdById: row.created_by ?? "",
    createdAt: row.created_at,
  };
}

/** وكيل البحث العلمي الحقيقي — كل بحث يستدعي فعليًا الويب عبر Claude (دالة
    ai-assist)، فما فيه بديل تجريبي: بحث ويب حي ما له معنى بوضع العرض
    التجريبي. النتائج تُخزَّن بجدول research_search_queries عشان الفريق
    يقدر يرجع لها بدون إعادة البحث (وإعادة استهلاك رصيد الـ API). */
export function useResearchSearch() {
  const [searches, setSearches] = useState<ResearchSearchQuery[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase!
      .from("research_search_queries")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setSearches((data as SearchRowDb[]).map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runSearch = async (topic: string, createdById: string) => {
    if (!isSupabaseConfigured) {
      return { row: null as ResearchSearchQuery | null, error: "البحث متاح فقط بالوضع الحقيقي" };
    }
    setSearching(true);
    const { data, error: fnError } = await supabase!.functions.invoke("ai-assist", {
      body: { action: "research-search", topic },
    });
    if (fnError || data?.error) {
      setSearching(false);
      return { row: null as ResearchSearchQuery | null, error: data?.error ?? fnError?.message };
    }
    if (data?.limitReached) {
      setSearching(false);
      return {
        row: null as ResearchSearchQuery | null,
        error: undefined as string | undefined,
        limitMessage: data.message as string,
      };
    }

    const { data: projectId } = await supabase!.rpc("my_research_project_id");
    const { data: inserted, error: insertError } = await supabase!
      .from("research_search_queries")
      .insert({
        research_project_id: projectId,
        query_text: topic,
        results: data.results ?? [],
        novelty_note: data.noveltyNote || null,
        created_by: createdById,
      })
      .select()
      .single();
    setSearching(false);
    if (!insertError && inserted) {
      const row = mapRow(inserted as SearchRowDb);
      setSearches((prev) => [row, ...prev]);
      return { row, error: undefined as string | undefined };
    }
    return { row: null as ResearchSearchQuery | null, error: insertError?.message };
  };

  const deleteSearch = async (id: string) => {
    let previous: ResearchSearchQuery[] = [];
    setSearches((prev) => {
      previous = prev;
      return prev.filter((s) => s.id !== id);
    });
    const { error } = await supabase!.from("research_search_queries").delete().eq("id", id);
    if (error) setSearches(previous);
    return { error: error?.message };
  };

  return { searches, loading, searching, runSearch, deleteSearch };
}
