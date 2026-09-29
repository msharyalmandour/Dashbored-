import { useCallback, useState } from "react";
import type { SearchStrategy, ToolFinding } from "../data/types";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

interface AgentReply {
  error?: string;
  limitReached?: boolean;
  upgradeRequired?: boolean;
  message?: string;
  sourcesFailed?: boolean;
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

/** استدعاء موحّد لدالة research-agent — يرجّع رسالة عربية جاهزة للعرض بدل
    أخطاء تقنية (supabase-js يخفي نص الأخطاء غير 2xx، فالدالة ترجّع 200
    مع error/limitReached للحالات المتوقعة). */
async function callAgent<T extends AgentReply>(body: Record<string, unknown>) {
  if (!isSupabaseConfigured) return { data: null as T | null, message: "هذي الميزة متاحة فقط بالوضع الحقيقي" };
  const { data, error } = await supabase!.functions.invoke("research-agent", { body });
  const reply = (data ?? null) as T | null;
  if (reply?.limitReached) return { data: null as T | null, message: reply.message ?? "وصلتوا للحد المتاح" };
  if (reply?.error) return { data: null as T | null, message: reply.error };
  if (error || !reply) return { data: null as T | null, message: "ما وصل الرد — تأكدوا من الاتصال وحاولوا مرة ثانية." };
  return { data: reply, message: undefined as string | undefined };
}

/** أدوات وكيل البحث الإضافية: أدوات القياس، استراتيجية البحث، وسؤال عن دراسة */
export function useResearchAgent() {
  const [busy, setBusy] = useState(false);

  const findTools = useCallback(async (construct: string, population: string) => {
    setBusy(true);
    const r = await callAgent<{ tools?: ToolFinding[]; caveat?: string; sourcesFailed?: boolean }>({
      action: "tools",
      construct,
      population,
    });
    setBusy(false);
    if (r.data?.sourcesFailed) {
      return { tools: [] as ToolFinding[], caveat: "", message: "تعذّر الوصول لقواعد الأبحاث الحين — حاولوا بعد شوي." };
    }
    return { tools: r.data?.tools ?? [], caveat: r.data?.caveat ?? "", message: r.message };
  }, []);

  const buildStrategy = useCallback(async (topic: string) => {
    setBusy(true);
    const r = await callAgent<{ strategy?: SearchStrategy }>({ action: "strategy", topic });
    setBusy(false);
    return { strategy: r.data?.strategy ?? null, message: r.message };
  }, []);

  const askPaper = useCallback(
    async (input: {
      question: string;
      title: string;
      abstract?: string;
      keyFinding?: string;
      relevance?: string;
      projectTitle?: string;
      pdfBase64?: string;
    }) => {
      setBusy(true);
      const r = await callAgent<{ answer?: string; usedPdf?: boolean }>({ action: "ask", ...input });
      setBusy(false);
      return { answer: r.data?.answer ?? "", usedPdf: !!r.data?.usedPdf, message: r.message };
    },
    [],
  );

  return { busy, findTools, buildStrategy, askPaper };
}
