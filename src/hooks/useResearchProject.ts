import { useEffect, useState } from "react";
import { projectMeta } from "../data/mockData";
import type { ResearchProject } from "../data/types";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

interface ResearchProjectRow {
  id: string;
  team_id: string;
  title: string;
  description: string;
  research_type: ResearchProject["researchType"];
  status: ResearchProject["status"];
  start_date: string | null;
  target_submission_date: string | null;
  created_at: string;
  updated_at: string;
}

function mapRow(row: ResearchProjectRow): ResearchProject {
  return {
    id: row.id,
    teamId: row.team_id,
    title: row.title,
    description: row.description,
    researchType: row.research_type,
    status: row.status,
    startDate: row.start_date,
    targetSubmissionDate: row.target_submission_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const mockProject: ResearchProject = {
  id: "mock-project",
  teamId: "mock-team",
  title: projectMeta.name,
  description: projectMeta.subtitle,
  researchType: "quantitative",
  status: "active",
  startDate: "2026-02-01",
  targetSubmissionDate: projectMeta.deadline,
  createdAt: "2026-02-01",
  updatedAt: "2026-02-01",
};

/** مشروع البحث الوحيد لفريق المستخدم الحالي — يُنشأ تلقائيًا بقاعدة البيانات
    عند إنشاء الفريق (trigger)، فما فيه هنا أي دالة "إنشاء مشروع". */
export function useResearchProject() {
  const [project, setProject] = useState<ResearchProject | null>(
    isSupabaseConfigured ? null : mockProject,
  );
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase!
      .from("research_projects")
      .select("*")
      .single()
      .then(({ data }) => {
        if (data) setProject(mapRow(data as ResearchProjectRow));
        setLoading(false);
      });
  }, []);

  return { project, loading };
}
