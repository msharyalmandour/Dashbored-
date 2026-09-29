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

/** وكيل البحث العلمي الحقيقي — يبحث بقواعد PubMed وOpenAlex عبر دالة
    research-agent، وإذا رجّعت أقل من ٣ نتائج يكمّل ببحث الويب (ai-assist).
    ما فيه بديل تجريبي: بحث حي ما له معنى بوضع العرض التجريبي. النتائج
    تُخزَّن بجدول research_search_queries عشان الفريق يرجع لها بدون إعادة
    البحث (وإعادة استهلاك رصيد الـ API). */
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

    // المصدر الأول: قواعد أبحاث حقيقية (PubMed + OpenAlex) عبر research-agent
    const primary = await supabase!.functions.invoke("research-agent", {
      body: { action: "search", topic },
    });
    const p = primary.data as {
      results?: ResearchSearchResult[];
      noveltyNote?: string;
      limitReached?: boolean;
      message?: string;
      error?: string;
    } | null;
    if (p?.limitReached) {
      setSearching(false);
      return { row: null as ResearchSearchQuery | null, error: undefined as string | undefined, limitMessage: p.message as string };
    }

    let results: ResearchSearchResult[] = !primary.error && !p?.error ? (p?.results ?? []) : [];
    let noveltyNote = results.length > 0 ? (p?.noveltyNote ?? "") : "";

    // احتياطي: لو المصادر الأكاديمية رجّعت أقل من ٣ (مثلًا موضوع سعودي/عربي
    // محلي)، نكمّل ببحث الويب القديم بدل ما نرجّع الطالبة بيد فاضية
    if (results.length < 3) {
      const fb = await supabase!.functions.invoke("ai-assist", {
        body: { action: "research-search", topic },
      });
      const f = fb.data as { results?: ResearchSearchResult[]; noveltyNote?: string; limitReached?: boolean; message?: string; error?: string } | null;
      if (f?.limitReached && results.length === 0) {
        setSearching(false);
        return { row: null as ResearchSearchQuery | null, error: undefined as string | undefined, limitMessage: f.message as string };
      }
      if (!fb.error && !f?.error && f?.results) {
        const seen = new Set(results.map((r) => r.url));
        const web = f.results.filter((r) => !seen.has(r.url)).map((r) => ({ ...r, source: "web" as const }));
        results = [...results, ...web];
        noveltyNote = noveltyNote || f.noveltyNote || "";
      }
      if (results.length === 0) {
        setSearching(false);
        return {
          row: null as ResearchSearchQuery | null,
          error: f?.error ?? p?.error ?? fb.error?.message ?? primary.error?.message ?? "تعذّر إتمام البحث",
        };
      }
    }

    const { data: projectId } = await supabase!.rpc("my_research_project_id");
    const { data: inserted, error: insertError } = await supabase!
      .from("research_search_queries")
      .insert({
        research_project_id: projectId,
        query_text: topic,
        results,
        novelty_note: noveltyNote || null,
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
