import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { callStudy } from "./useStudyTools";

/** نتيجة «وكيل المشروع»: كل شي مرتبط بدراسات حقيقية (sources = مواقع الدراسات بقائمة papers).
    كلها مقترحات — الواجهة تحفظها بعد موافقة الفريق. */
export interface AgentPaper {
  title: string;
  url: string;
  authors: string;
  year: number | null;
  journal: string;
  doi: string | null;
  sourceType: "peer-reviewed" | "other";
  summaryAr: string;
  relevanceReason: string;
  studyDesign: string;
  sampleSize: string;
  keyFinding: string;
  limitation: string;
}

export interface AgentQuestion {
  question: string;
  type: string;
  fit: number;
  why: string;
  design: string;
  variables: string;
  sources: number[];
}

export interface AgentGapItem {
  text: string;
  sources: number[];
}

export interface AgentResult {
  papers: AgentPaper[];
  questions: AgentQuestion[];
  noveltyNote: string;
  gap?: { whatWeKnow: AgentGapItem[]; whatWeDontKnow: AgentGapItem[]; gapStatement: string };
  tasks?: { title: string; description: string }[];
  /** true لو الدالة الجديدة غير متاحة وانرجع للنسخة القديمة (أسئلة بدون دراسات) */
  fallback?: boolean;
}

interface Reply extends Partial<AgentResult> {
  error?: string;
  limitReached?: boolean;
  upgradeRequired?: boolean;
  message?: string;
}

/** يستدعي project-agent. لو الدالة مو منشورة بعد، «الأسئلة» ترجع تلقائيًا للنسخة القديمة (بدون دراسات) بدل ما تنكسر. */
export async function runProjectAgent(
  action: "questions" | "kickstart",
  topic: string,
  existing: string[],
): Promise<{ data?: AgentResult; message?: string }> {
  if (!isSupabaseConfigured) return { message: "هذي الميزة متاحة فقط بالوضع الحقيقي (مع حساب فريقكم)." };
  const { data, error } = await supabase!.functions.invoke("project-agent", { body: { action, topic, existing } });
  const reply = (data ?? null) as Reply | null;
  if (reply?.limitReached) return { message: reply.message ?? "وصلتوا للحد المتاح" };
  if (reply?.error) return { message: reply.error };
  if (reply && Array.isArray(reply.questions) && Array.isArray(reply.papers)) {
    return {
      data: {
        papers: reply.papers,
        questions: reply.questions,
        noveltyNote: reply.noveltyNote ?? "",
        gap: reply.gap,
        tasks: reply.tasks,
      },
    };
  }
  if (error && action === "questions") {
    const old = await callStudy<{ questions: Omit<AgentQuestion, "sources">[]; note?: string }>({ action: "questions" });
    if (old.data?.questions) {
      return {
        data: {
          papers: [],
          questions: old.data.questions.map((q) => ({ ...q, sources: [] })),
          noveltyNote: old.data.note ?? "",
          fallback: true,
        },
      };
    }
    return { message: old.message ?? "ما وصل الرد — تأكدوا من الاتصال وحاولوا مرة ثانية." };
  }
  return { message: "ما وصل الرد — تأكدوا من الاتصال وحاولوا مرة ثانية." };
}
