import { useCallback, useEffect, useRef, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import type { Question } from "../lib/surveyCoach";

export interface Survey {
  id: string;
  title: string;
  goal: string;
  intro: string;
  consentText: string;
  questions: Question[];
  status: "draft" | "open" | "closed";
  isPilot: boolean;
  targetN: number | null;
  publicToken: string;
  createdAt: string;
  updatedAt: string;
}

interface Row {
  id: string;
  title: string;
  goal: string;
  intro: string;
  consent_text: string;
  questions: Question[];
  status: Survey["status"];
  is_pilot: boolean;
  target_n: number | null;
  public_token: string;
  created_at: string;
  updated_at: string;
}

const mapRow = (r: Row): Survey => ({
  id: r.id,
  title: r.title,
  goal: r.goal,
  intro: r.intro,
  consentText: r.consent_text,
  questions: Array.isArray(r.questions) ? r.questions : [],
  status: r.status,
  isPilot: r.is_pilot,
  targetN: r.target_n,
  publicToken: r.public_token,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toRow = (p: Partial<Survey>) => {
  const o: Record<string, unknown> = {};
  if (p.title !== undefined) o.title = p.title;
  if (p.goal !== undefined) o.goal = p.goal;
  if (p.intro !== undefined) o.intro = p.intro;
  if (p.consentText !== undefined) o.consent_text = p.consentText;
  if (p.questions !== undefined) o.questions = p.questions;
  if (p.status !== undefined) o.status = p.status;
  if (p.isPilot !== undefined) o.is_pilot = p.isPilot;
  if (p.targetN !== undefined) o.target_n = p.targetN;
  return o;
};

export const MAX_SURVEYS = 5;
const DEMO_KEY = "wesync-demo-surveys";

const loadDemo = (): Survey[] => {
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY) ?? "[]");
  } catch {
    return [];
  }
};
const saveDemo = (list: Survey[]) => {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(list));
  } catch {
    // ما يهم
  }
};

/** استبيانات الفريق. بوضع العرض التجريبي تنحفظ محليًا فقط (والردود غير متاحة). */
export function useSurveys() {
  const { team, currentUser } = useAuth();
  const [surveys, setSurveys] = useState<Survey[]>(isSupabaseConfigured ? [] : loadDemo());
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [saving, setSaving] = useState(false);
  const pending = useRef<Record<string, Partial<Survey>>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !team?.id) return;
    const { data } = await supabase!.from("research_surveys").select("*").eq("team_id", team.id).order("created_at", { ascending: false });
    if (data) setSurveys((data as Row[]).map(mapRow));
    setLoading(false);
  }, [team?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (): Promise<{ id?: string; error?: string }> => {
    if (surveys.length >= MAX_SURVEYS) return { error: `الحد الأقصى ${MAX_SURVEYS} استبيانات لكل فريق — احذفوا استبيانًا قديمًا أولًا.` };
    if (!isSupabaseConfigured || !team?.id || !currentUser) {
      const s: Survey = {
        id: `demo-${Date.now()}`,
        title: "",
        goal: "",
        intro: "",
        consentText: "",
        questions: [],
        status: "draft",
        isPilot: false,
        targetN: null,
        publicToken: "demo",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const next = [s, ...surveys];
      setSurveys(next);
      saveDemo(next);
      return { id: s.id };
    }
    const { data, error } = await supabase!
      .from("research_surveys")
      .insert({ team_id: team.id, created_by: currentUser.id, title: "" })
      .select("*")
      .single();
    if (error || !data) return { error: "ما انعمل الاستبيان — تأكدوا أن اشتراك الفريق فعّال." };
    const s = mapRow(data as Row);
    setSurveys((p) => [s, ...p]);
    return { id: s.id };
  };

  /** يحدّث فورًا بالواجهة ويحفظ بعد نص ثانية من آخر تعديل */
  const update = (id: string, patch: Partial<Survey>) => {
    setSurveys((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, ...patch } : s));
      if (!isSupabaseConfigured) saveDemo(next);
      return next;
    });
    if (!isSupabaseConfigured) return;
    pending.current[id] = { ...pending.current[id], ...patch };
    setSaving(true);
    clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      const p = pending.current[id];
      delete pending.current[id];
      if (p) await supabase!.from("research_surveys").update(toRow(p)).eq("id", id);
      if (Object.keys(pending.current).length === 0) setSaving(false);
    }, 600);
  };

  const remove = async (id: string) => {
    setSurveys((p) => p.filter((s) => s.id !== id));
    if (!isSupabaseConfigured) {
      saveDemo(surveys.filter((s) => s.id !== id));
      return;
    }
    await supabase!.from("research_surveys").delete().eq("id", id);
  };

  return { surveys, loading, saving, create, update, remove, reload: load };
}

export interface SurveyResponse {
  id: string;
  answers: Record<string, string | string[] | number>;
  createdAt: string;
}

export function useSurveyResponses(surveyId: string | undefined) {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !surveyId || surveyId.startsWith("demo")) return;
    setLoading(true);
    const { data } = await supabase!
      .from("research_survey_responses")
      .select("id, answers, created_at")
      .eq("survey_id", surveyId)
      .order("created_at", { ascending: true })
      .limit(2000);
    if (data) setResponses((data as { id: string; answers: SurveyResponse["answers"]; created_at: string }[]).map((r) => ({ id: r.id, answers: r.answers, createdAt: r.created_at })));
    setLoading(false);
  }, [surveyId]);

  useEffect(() => {
    load();
  }, [load]);

  const clear = async () => {
    if (!isSupabaseConfigured || !surveyId) return;
    await supabase!.from("research_survey_responses").delete().eq("survey_id", surveyId);
    setResponses([]);
  };

  return { responses, loading, reload: load, clear };
}

/** عدد ردود كل استبيان (للفريق) — يغذّي تقدّم مرحلة جمع البيانات وصفحة الميدان. بالوضع التجريبي يرجّع أصفار. */
export function useSurveyResponseCounts(surveys: Survey[]) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const key = surveys.map((s) => s.id).join(",");

  useEffect(() => {
    if (!isSupabaseConfigured || !key) return;
    let cancelled = false;
    const ids = key.split(",").filter((id) => !id.startsWith("demo"));
    Promise.all(
      ids.map(async (id) => {
        const { count } = await supabase!.from("research_survey_responses").select("id", { count: "exact", head: true }).eq("survey_id", id);
        return [id, count ?? 0] as const;
      }),
    ).then((pairs) => {
      if (!cancelled) setCounts(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return counts;
}
