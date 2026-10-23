import { isSupabaseConfigured, supabase } from "./supabaseClient";

export type NotifyKind = "minutes" | "decision" | "booking";

/** يرسل إيميل للمشرف/ة المؤكَّدة (لو فعّلت الإشعارات) عن شي ينتظر ردّها. فشله ما يوقف شي:
    الواجهة تعرض دايمًا زر واتساب بديل. يرجّع sent=false مع السبب (not_subscribed / cooldown / email_not_configured…) */
export async function notifySupervisor(kind: NotifyKind, refId: string): Promise<{ sent: boolean; reason?: string }> {
  if (!isSupabaseConfigured) return { sent: false, reason: "demo" };
  try {
    const { data, error } = await supabase!.functions.invoke("supervisor-email", { body: { action: "notify_event", kind, refId } });
    if (error) return { sent: false, reason: "failed" };
    const d = data as { sent?: boolean; reason?: string } | null;
    return { sent: !!d?.sent, reason: d?.reason };
  } catch {
    return { sent: false, reason: "failed" };
  }
}
