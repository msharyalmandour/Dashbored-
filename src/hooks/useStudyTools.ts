import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { tr } from "../lib/i18n";

interface StudyReply {
  error?: string;
  limitReached?: boolean;
  upgradeRequired?: boolean;
  message?: string;
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

/** استدعاء موحّد لدالة study-tools — يرجّع رسالة عربية جاهزة للعرض بدل أخطاء تقنية
    (supabase-js يخفي نص الأخطاء غير 2xx، فالدالة ترجّع 200 مع error/limitReached للحالات المتوقعة). */
export async function callStudy<T extends StudyReply>(body: Record<string, unknown>) {
  if (!isSupabaseConfigured) return { data: null as T | null, message: tr("هذي الميزة متاحة فقط بالوضع الحقيقي") as string | undefined };
  const { data, error } = await supabase!.functions.invoke("study-tools", { body });
  const reply = (data ?? null) as T | null;
  if (reply?.limitReached) return { data: null as T | null, message: (reply.message ?? tr("وصلتوا للحد المتاح")) as string | undefined };
  if (reply?.error) return { data: null as T | null, message: reply.error as string | undefined };
  if (error || !reply) return { data: null as T | null, message: tr("ما وصل الرد — تأكدوا من الاتصال وحاولوا مرة ثانية.") as string | undefined };
  return { data: reply, message: undefined as string | undefined };
}
