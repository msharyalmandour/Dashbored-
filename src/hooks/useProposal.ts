import { useCallback, useEffect, useState } from "react";
import { proposalSections as mockSections, researchGap as mockGap, studyAim as mockAim } from "../data/mockData";
import type { ProposalSectionRow, ResearchGap, ResearchQuestion, StudyAim } from "../data/types";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

interface SectionRowDb {
  id: string;
  section_key: ProposalSectionRow["key"];
  order_index: number;
  label_ar: string;
  label_en: string;
  status: ProposalSectionRow["status"];
  content: string;
  owner_id: string | null;
  updated_at: string;
}

function mapSection(row: SectionRowDb): ProposalSectionRow {
  return {
    key: row.section_key,
    order: row.order_index,
    labelAr: row.label_ar,
    labelEn: row.label_en,
    status: row.status,
    ownerId: row.owner_id ?? "",
    updatedAt: row.updated_at,
    content: row.content,
  };
}

const mockSectionsWithContent: ProposalSectionRow[] = mockSections.map((s) => ({ ...s, content: "" }));

/** المقترح البحثي الكامل — الأقسام + الفجوة البحثية + هدف الدراسة وأسئلته،
    كلها بجدول project واحد فتُجلب وتُحدَّث سوا بنفس الـ hook. وضع العرض
    التجريبي يرجع نفس بيانات mockData.ts القديمة (للعرض فقط، بدون حفظ). */
export function useProposal() {
  const [sections, setSections] = useState<ProposalSectionRow[]>(
    isSupabaseConfigured ? [] : mockSectionsWithContent,
  );
  const [gap, setGap] = useState<ResearchGap>(mockGap);
  const [aim, setAim] = useState<StudyAim>(mockAim);
  const [questions, setQuestions] = useState<ResearchQuestion[]>(mockAim.questions);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return;

    const [sectionsRes, gapRes, aimRes, questionsRes] = await Promise.all([
      supabase!.from("proposal_sections").select("*").order("order_index"),
      supabase!.from("research_gap").select("*").single(),
      supabase!.from("study_aim").select("*").single(),
      supabase!.from("research_questions").select("*").order("order_index"),
    ]);

    if (sectionsRes.data) setSections((sectionsRes.data as SectionRowDb[]).map(mapSection));
    if (gapRes.data) {
      const g = gapRes.data;
      setGap({
        whatWeKnow: g.what_we_know ?? [],
        whatWeDontKnow: g.what_we_dont_know ?? [],
        gapStatement: g.gap_statement ?? "",
        studyConnection: g.study_connection ?? "",
        connectsToAim: g.connects_to_aim ?? false,
      });
    }
    if (questionsRes.data) {
      setQuestions(
        questionsRes.data.map((q: { id: string; order_index: number; text: string }) => ({
          id: q.id,
          order: q.order_index,
          text: q.text,
        })),
      );
    }
    if (aimRes.data) {
      setAim({ statement: aimRes.data.statement ?? "", status: aimRes.data.status ?? "not-started", questions: [] });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateSection = async (key: string, updates: { content?: string; status?: ProposalSectionRow["status"] }) => {
    if (!isSupabaseConfigured) {
      setSections((prev) => prev.map((s) => (s.key === key ? { ...s, ...updates } : s)));
      return { error: undefined as string | undefined };
    }
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, ...updates } : s)));
    const { error } = await supabase!
      .from("proposal_sections")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("section_key", key);
    if (error) load();
    return { error: error?.message };
  };

  const updateGap = async (updates: Partial<ResearchGap>) => {
    if (!isSupabaseConfigured) {
      setGap((prev) => ({ ...prev, ...updates }));
      return { error: undefined as string | undefined };
    }
    setGap((prev) => ({ ...prev, ...updates }));
    const { error } = await supabase!
      .from("research_gap")
      .update({
        ...(updates.whatWeKnow !== undefined && { what_we_know: updates.whatWeKnow }),
        ...(updates.whatWeDontKnow !== undefined && { what_we_dont_know: updates.whatWeDontKnow }),
        ...(updates.gapStatement !== undefined && { gap_statement: updates.gapStatement }),
        ...(updates.studyConnection !== undefined && { study_connection: updates.studyConnection }),
        ...(updates.connectsToAim !== undefined && { connects_to_aim: updates.connectsToAim }),
        updated_at: new Date().toISOString(),
      })
      .eq("research_project_id", await currentProjectId());
    if (error) load();
    return { error: error?.message };
  };

  const updateAimStatement = async (statement: string) => {
    if (!isSupabaseConfigured) {
      setAim((prev) => ({ ...prev, statement }));
      return { error: undefined as string | undefined };
    }
    setAim((prev) => ({ ...prev, statement }));
    const { error } = await supabase!
      .from("study_aim")
      .update({ statement, updated_at: new Date().toISOString() })
      .eq("research_project_id", await currentProjectId());
    if (error) load();
    return { error: error?.message };
  };

  const setResearchQuestions = async (texts: string[]) => {
    const newQuestions = texts.map((text, i) => ({ id: `local-${i}`, order: i + 1, text }));
    if (!isSupabaseConfigured) {
      setQuestions(newQuestions);
      return { error: undefined as string | undefined };
    }
    setQuestions(newQuestions);
    const projectId = await currentProjectId();
    await supabase!.from("research_questions").delete().eq("research_project_id", projectId);
    const { error } = await supabase!.from("research_questions").insert(
      texts.map((text, i) => ({ research_project_id: projectId, order_index: i + 1, text })),
    );
    if (error) load();
    return { error: error?.message };
  };

  return { sections, gap, aim, questions, loading, updateSection, updateGap, updateAimStatement, setResearchQuestions };
}

async function currentProjectId() {
  const { data } = await supabase!.rpc("my_research_project_id");
  return data as string;
}
