import { useCallback, useEffect, useState } from "react";
import type { ToolFinding } from "../data/types";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

export interface LibraryTool {
  id: string;
  toolName: string;
  measures: string;
  items: string;
  reliability: string;
  languages: string;
  population: string;
  sourceTitle: string;
  sourceUrl: string;
  year: number | null;
  isArabic: boolean;
  createdAt: string;
}

interface Row {
  id: string;
  tool_name: string;
  measures: string;
  items: string;
  reliability: string;
  languages: string;
  population: string;
  source_title: string;
  source_url: string;
  year: number | null;
  is_arabic: boolean;
  created_at: string;
}

const mapRow = (r: Row): LibraryTool => ({
  id: r.id,
  toolName: r.tool_name,
  measures: r.measures,
  items: r.items,
  reliability: r.reliability,
  languages: r.languages,
  population: r.population,
  sourceTitle: r.source_title,
  sourceUrl: r.source_url,
  year: r.year,
  isArabic: r.is_arabic,
  createdAt: r.created_at,
});

export const toolKey = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .slice(0, 120);

const isArabicLang = (languages: string) => /arab|عرب/i.test(languages);

/** حفظ أداة قياس وثّقها وكيل البحث بالمكتبة المشتركة (مكررة الاسم تتجاهل بصمت) */
export async function saveToolToLibrary(t: ToolFinding, userId: string): Promise<{ error?: string; duplicate?: boolean }> {
  if (!isSupabaseConfigured) return { error: "متاح فقط بالوضع الحقيقي" };
  const key = toolKey(t.toolName);
  if (key.length < 2) return { error: "اسم الأداة غير واضح" };
  const { data, error } = await supabase!
    .from("validated_tools")
    .upsert(
      {
        tool_key: key,
        tool_name: t.toolName.slice(0, 200),
        measures: (t.measures ?? "").slice(0, 400),
        items: (t.items ?? "").slice(0, 120),
        reliability: (t.reliability ?? "").slice(0, 300),
        languages: (t.languages ?? "").slice(0, 200),
        population: (t.population ?? "").slice(0, 300),
        source_title: (t.sourceTitle ?? "").slice(0, 400),
        source_url: /^https?:\/\//i.test(t.sourceUrl ?? "") ? t.sourceUrl.slice(0, 600) : "",
        year: t.year,
        is_arabic: isArabicLang(t.languages ?? ""),
        saved_by: userId,
      },
      { onConflict: "tool_key", ignoreDuplicates: true },
    )
    .select("id");
  if (error) return { error: error.message };
  return { duplicate: !data || data.length === 0 };
}

export function useValidatedTools() {
  const [tools, setTools] = useState<LibraryTool[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase!.from("validated_tools").select("*").order("created_at", { ascending: false }).limit(500);
    if (data) setTools((data as Row[]).map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { tools, loading, reload: load };
}
