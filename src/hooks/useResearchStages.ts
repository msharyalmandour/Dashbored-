import { useEffect, useRef, useState } from "react";
import type { ResearchStageRow } from "../data/types";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

let channelIdCounter = 0;

/** بيانات تجريبية بنفس شكل الجدول الحقيقي بالضبط — تُستخدم فقط لو ما كان
    فيه مشروع Supabase متصل، عشان وضع العرض التجريبي يبقى يشتغل كامل. */
const mockStages: ResearchStageRow[] = [
  { id: "topic", stageKey: "topic", titleAr: "اختيار الموضوع", titleEn: "Topic Selection", order: 1, status: "done", progress: 100, startDate: "2026-02-01", targetDate: "2026-02-10", completedDate: "2026-02-09" },
  { id: "proposal", stageKey: "proposal", titleAr: "المقترح البحثي", titleEn: "Research Proposal", order: 2, status: "done", progress: 100, startDate: "2026-02-10", targetDate: "2026-03-05", completedDate: "2026-03-04" },
  { id: "literature-review", stageKey: "literature-review", titleAr: "مراجعة الأدبيات", titleEn: "Literature Review", order: 3, status: "active", progress: 45, startDate: "2026-03-06", targetDate: "2026-04-10", completedDate: null },
  { id: "research-gap", stageKey: "research-gap", titleAr: "الفجوة البحثية", titleEn: "Research Gap", order: 4, status: "upcoming", progress: 0, startDate: "2026-04-11", targetDate: "2026-04-25", completedDate: null },
  { id: "research-questions", stageKey: "research-questions", titleAr: "أسئلة البحث", titleEn: "Research Questions", order: 5, status: "upcoming", progress: 0, startDate: "2026-04-26", targetDate: "2026-05-10", completedDate: null },
  { id: "methodology", stageKey: "methodology", titleAr: "المنهجية", titleEn: "Methodology", order: 6, status: "upcoming", progress: 0, startDate: "2026-05-11", targetDate: "2026-06-15", completedDate: null },
  { id: "data-collection", stageKey: "data-collection", titleAr: "جمع البيانات", titleEn: "Data Collection", order: 7, status: "upcoming", progress: 0, startDate: "2026-06-16", targetDate: "2026-08-31", completedDate: null },
  { id: "analysis", stageKey: "analysis", titleAr: "تحليل البيانات", titleEn: "Data Analysis", order: 8, status: "upcoming", progress: 0, startDate: "2026-09-01", targetDate: "2026-10-15", completedDate: null },
  { id: "writing", stageKey: "writing", titleAr: "كتابة البحث", titleEn: "Writing", order: 9, status: "upcoming", progress: 0, startDate: "2026-10-16", targetDate: "2026-11-30", completedDate: null },
  { id: "final-submission", stageKey: "final-submission", titleAr: "التسليم النهائي", titleEn: "Final Submission", order: 10, status: "upcoming", progress: 0, startDate: "2026-12-01", targetDate: "2026-12-15", completedDate: null },
];

interface StageRowDb {
  id: string;
  stage_key: ResearchStageRow["stageKey"];
  title_ar: string;
  title_en: string;
  stage_order: number;
  status: ResearchStageRow["status"];
  progress: number;
  start_date: string | null;
  target_date: string | null;
  completed_date: string | null;
}

function mapRow(row: StageRowDb): ResearchStageRow {
  return {
    id: row.id,
    stageKey: row.stage_key,
    titleAr: row.title_ar,
    titleEn: row.title_en,
    order: row.stage_order,
    status: row.status,
    progress: row.progress,
    startDate: row.start_date,
    targetDate: row.target_date,
    completedDate: row.completed_date,
  };
}

/** رحلة البحث — 10 مراحل حقيقية بجدول research_stages، تُنشأ تلقائيًا مع
    مشروع الفريق ولا تُنشأ يدويًا من الواجهة أبدًا. بوضع العرض التجريبي
    (بدون Supabase) ترجع بيانات تجريبية ثابتة بنفس الشكل تمامًا. */
export function useResearchStages() {
  const [stages, setStages] = useState<ResearchStageRow[]>(isSupabaseConfigured ? [] : mockStages);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const channelIdRef = useRef<number | null>(null);
  channelIdRef.current ??= channelIdCounter++;

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const load = async () => {
      const { data } = await supabase!
        .from("research_stages")
        .select("*")
        .order("stage_order", { ascending: true });
      if (data) setStages(data.map(mapRow));
      setLoading(false);
    };

    load();

    const channel = supabase!
      .channel(`research-stages-sync-${channelIdRef.current}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "research_stages" }, load)
      .subscribe();

    return () => {
      supabase!.removeChannel(channel);
    };
  }, []);

  const updateStage = async (
    stageId: string,
    updates: Partial<Pick<ResearchStageRow, "status" | "progress" | "startDate" | "targetDate" | "completedDate">>,
  ) => {
    if (!isSupabaseConfigured) {
      setStages((prev) => prev.map((s) => (s.id === stageId ? { ...s, ...updates } : s)));
      return { error: undefined as string | undefined };
    }

    let previous: ResearchStageRow[] = [];
    setStages((prev) => {
      previous = prev;
      return prev.map((s) => (s.id === stageId ? { ...s, ...updates } : s));
    });

    const { error } = await supabase!
      .from("research_stages")
      .update({
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.progress !== undefined && { progress: updates.progress }),
        ...(updates.startDate !== undefined && { start_date: updates.startDate }),
        ...(updates.targetDate !== undefined && { target_date: updates.targetDate }),
        ...(updates.completedDate !== undefined && { completed_date: updates.completedDate }),
      })
      .eq("id", stageId);
    if (error) setStages(previous);
    return { error: error?.message };
  };

  return { stages, loading, updateStage };
}
