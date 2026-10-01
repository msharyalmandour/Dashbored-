import { supabase } from "./supabaseClient";

export type EmailState = "none" | "pending" | "active" | "off";
export interface EmailStatus {
  state: EmailState;
  emailMasked: string;
}

export type EmailError = "email_not_configured" | "invalid_email" | "invalid_token" | "rate_limited" | "send_failed" | "network" | "unknown";

async function call<T>(body: Record<string, unknown>): Promise<{ data?: T; error?: EmailError }> {
  if (!supabase) return { error: "network" };
  const { data, error } = await supabase.functions.invoke("supervisor-email", { body });
  if (!error) return { data: data as T };
  try {
    const res = (error as { context?: Response }).context;
    const parsed = res ? ((await res.json()) as { error?: string }) : null;
    const code = parsed?.error;
    if (code === "email_not_configured" || code === "invalid_email" || code === "invalid_token" || code === "rate_limited" || code === "send_failed") return { error: code };
  } catch {
    // الرد مو JSON
  }
  return { error: "unknown" };
}

export const errorText: Record<EmailError, string> = {
  email_not_configured: "خدمة الإيميل لسا ما انفعّلت من إدارة الموقع — جرّبوا لاحقًا.",
  invalid_email: "الإيميل غير صحيح — تأكدوا من كتابته.",
  invalid_token: "الرابط غير صالح أو انتهى.",
  rate_limited: "محاولات كثيرة — جرّبوا بعد دقيقة.",
  send_failed: "تعذّر إرسال الإيميل — جرّبوا مرة ثانية بعد شوي.",
  network: "ما قدرنا نتصل — تأكدوا من الإنترنت.",
  unknown: "صار خطأ غير متوقع — جرّبوا مرة ثانية.",
};

/** المشرفة تطلب الاشتراك — يُرسل إيميل تأكيد، ولا تُرسل إشعارات قبل ما تضغط تأكيد. */
export const subscribeSupervisor = (token: string, email: string) => call<{ ok: true }>({ action: "subscribe", token, email });
export const confirmSupervisorEmail = (confirmToken: string) => call<{ ok: true }>({ action: "confirm", confirmToken });
export const unsubscribeSupervisorEmail = (confirmToken: string) => call<{ ok: true }>({ action: "unsubscribe", confirmToken });

/** عضو الفريق بعد ما يرد — يرسل إشعار للمشرفة لو هي مفعّلة الإيميل. */
export const notifySupervisor = () => call<{ sent: boolean; reason?: string }>({ action: "notify" });

export async function getSupervisorEmailStatus(token: string): Promise<EmailStatus | null> {
  if (!supabase) return null;
  const { data } = await supabase.rpc("get_supervisor_email_status", { p_token: token });
  return (data as EmailStatus | null) ?? null;
}

export async function getMyEmailStatus(): Promise<EmailStatus | null> {
  if (!supabase) return null;
  const { data } = await supabase.rpc("get_my_supervisor_email_status");
  return (data as EmailStatus | null) ?? null;
}
