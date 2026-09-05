import { useCallback, useEffect, useState } from "react";
import { evidenceLibrary as mockPapers } from "../data/mockData";
import type { EvidencePaper } from "../data/types";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

interface PaperRowDb {
  id: string;
  title: string;
  authors: string;
  year: number | null;
  theme: string;
  study_design: string;
  key_finding: string;
  relevance: string;
  section: EvidencePaper["section"];
  review_status: EvidencePaper["reviewStatus"];
  link: string | null;
  added_by: string | null;
}

function mapRow(row: PaperRowDb): EvidencePaper {
  return {
    id: row.id,
    title: row.title,
    authors: row.authors,
    year: row.year ?? new Date().getFullYear(),
    theme: row.theme as EvidencePaper["theme"],
    studyDesign: row.study_design,
    keyFinding: row.key_finding,
    relevance: row.relevance,
    section: row.section,
    reviewStatus: row.review_status,
    link: row.link ?? undefined,
    addedById: row.added_by ?? "",
  };
}

/** مكتبة الأدلة الحقيقية — دراسات مشتركة بكل الفريق، تُخزَّن بجدول
    evidence_papers. وضع العرض التجريبي يرجع mockData.ts للعرض فقط. */
export function useEvidencePapers() {
  const [papers, setPapers] = useState<EvidencePaper[]>(isSupabaseConfigured ? [] : mockPapers);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase!
      .from("evidence_papers")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setPapers((data as PaperRowDb[]).map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addPaper = async (input: {
    title: string;
    authors: string;
    year: number;
    theme: EvidencePaper["theme"];
    studyDesign: string;
    keyFinding: string;
    relevance: string;
    section: EvidencePaper["section"];
    addedById: string;
  }) => {
    if (!isSupabaseConfigured) {
      const newPaper: EvidencePaper = { ...input, id: `local-${Date.now()}`, reviewStatus: "collected" };
      setPapers((prev) => [newPaper, ...prev]);
      return { error: undefined as string | undefined };
    }

    const { data: projectId } = await supabase!.rpc("my_research_project_id");
    const { error } = await supabase!.from("evidence_papers").insert({
      research_project_id: projectId,
      title: input.title,
      authors: input.authors,
      year: input.year,
      theme: input.theme,
      study_design: input.studyDesign,
      key_finding: input.keyFinding,
      relevance: input.relevance,
      section: input.section,
      added_by: input.addedById,
    });
    if (!error) load();
    return { error: error?.message };
  };

  const updateReviewStatus = async (paperId: string, reviewStatus: EvidencePaper["reviewStatus"]) => {
    if (!isSupabaseConfigured) {
      setPapers((prev) => prev.map((p) => (p.id === paperId ? { ...p, reviewStatus } : p)));
      return { error: undefined as string | undefined };
    }
    setPapers((prev) => prev.map((p) => (p.id === paperId ? { ...p, reviewStatus } : p)));
    const { error } = await supabase!.from("evidence_papers").update({ review_status: reviewStatus }).eq("id", paperId);
    if (error) load();
    return { error: error?.message };
  };

  return { papers, loading, addPaper, updateReviewStatus };
}
