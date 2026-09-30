import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

export interface FeedbackItem {
  id: string;
  comment: string;
  sectionKey: string;
  status: "open" | "done";
  assigneeId: string | null;
  feedbackDate: string;
  createdAt: string;
  resolvedAt: string | null;
}

interface Row {
  id: string;
  comment: string;
  section_key: string | null;
  status: "open" | "done";
  assignee_id: string | null;
  feedback_date: string;
  created_at: string;
  resolved_at: string | null;
}

const mapRow = (r: Row): FeedbackItem => ({
  id: r.id,
  comment: r.comment,
  sectionKey: r.section_key ?? "other",
  status: r.status,
  assigneeId: r.assignee_id,
  feedbackDate: r.feedback_date,
  createdAt: r.created_at,
  resolvedAt: r.resolved_at,
});

const today = () => new Date().toISOString().slice(0, 10);

const mockItems: FeedbackItem[] = [
  { id: "m1", comment: "وضّحوا معايير الاشتمال والاستبعاد بشكل أدق", sectionKey: "methodology", status: "open", assigneeId: null, feedbackDate: today(), createdAt: today(), resolvedAt: null },
  { id: "m2", comment: "أضيفوا ٣ دراسات سعودية حديثة لمراجعة الأدبيات", sectionKey: "literature-review", status: "done", assigneeId: null, feedbackDate: today(), createdAt: today(), resolvedAt: today() },
];

/** ملاحظات المشرف كقائمة مهام صغيرة يتتبعها الفريق. وضع العرض التجريبي: بيانات محلية بالذاكرة. */
export function useSupervisorFeedback() {
  const [items, setItems] = useState<FeedbackItem[]>(isSupabaseConfigured ? [] : mockItems);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const { data } = await supabase!.from("supervisor_feedback").select("*").order("created_at", { ascending: false }).limit(300);
    if (data) setItems((data as Row[]).map(mapRow));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    if (!isSupabaseConfigured) return;
    const channel = supabase!
      .channel(`supervisor-feedback-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "supervisor_feedback" }, load)
      .subscribe();
    return () => {
      supabase!.removeChannel(channel);
    };
  }, [load]);

  const addItems = async (
    list: { comment: string; sectionKey: string; assigneeId?: string | null }[],
    createdById: string,
    projectId: string | null,
  ) => {
    const clean = list.map((i) => ({ ...i, comment: i.comment.trim() })).filter((i) => i.comment);
    if (clean.length === 0) return { error: undefined as string | undefined };
    if (!isSupabaseConfigured) {
      setItems((prev) => [
        ...clean.map((i, k) => ({
          id: `local-${Date.now()}-${k}`,
          comment: i.comment,
          sectionKey: i.sectionKey,
          status: "open" as const,
          assigneeId: i.assigneeId ?? null,
          feedbackDate: today(),
          createdAt: new Date().toISOString(),
          resolvedAt: null,
        })),
        ...prev,
      ]);
      return { error: undefined as string | undefined };
    }
    if (!projectId) return { error: "ما فيه مشروع بحثي للفريق" };
    const { error } = await supabase!.from("supervisor_feedback").insert(
      clean.map((i) => ({
        research_project_id: projectId,
        comment: i.comment,
        section_key: i.sectionKey,
        assignee_id: i.assigneeId ?? null,
        created_by: createdById,
      })),
    );
    if (!error) await load();
    return { error: error?.message };
  };

  const patch = async (id: string, updates: Partial<Pick<FeedbackItem, "status" | "assigneeId" | "comment">>) => {
    const resolvedAt = updates.status === "done" ? new Date().toISOString() : updates.status === "open" ? null : undefined;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates, ...(resolvedAt !== undefined && { resolvedAt }) } : i)));
    if (!isSupabaseConfigured) return { error: undefined as string | undefined };
    const { error } = await supabase!
      .from("supervisor_feedback")
      .update({
        ...(updates.status !== undefined && { status: updates.status }),
        ...(resolvedAt !== undefined && { resolved_at: resolvedAt }),
        ...(updates.assigneeId !== undefined && { assignee_id: updates.assigneeId }),
        ...(updates.comment !== undefined && { comment: updates.comment }),
      })
      .eq("id", id);
    if (error) await load();
    return { error: error?.message };
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (!isSupabaseConfigured) return { error: undefined as string | undefined };
    const { error } = await supabase!.from("supervisor_feedback").delete().eq("id", id);
    if (error) await load();
    return { error: error?.message };
  };

  return { items, loading, addItems, patch, remove };
}

export const sectionLabels: Record<string, string> = {
  background: "الخلفية",
  "literature-review": "مراجعة الأدبيات",
  problem: "المشكلة",
  gap: "الفجوة البحثية",
  aim: "الهدف",
  questions: "أسئلة البحث",
  methodology: "المنهجية",
  ethics: "الأخلاقيات",
  other: "أخرى",
};

/** تقسيم بسيط بدون ذكاء: سطر = ملاحظة، ويقطع الأسطر الطويلة عند علامات الترقيم */
export function basicSplit(text: string): string[] {
  const out: string[] = [];
  for (const line of text.replace(/\r/g, "").split("\n")) {
    const t = line.replace(/^[\s\-•*·\d]+[.)\-–:]?\s*/, "").trim();
    if (!t) continue;
    if (t.length <= 220) out.push(t);
    else out.push(...t.split(/(?<=[.؟?!؛])\s+/).map((s) => s.trim()).filter((s) => s.length > 3));
  }
  return out.slice(0, 40);
}
