import { supabase } from "./supabaseClient";
import { tr } from "./i18n";

/* مجموعة «مع الدكتورة» (supervisor_messages): نفس المحادثة من جهة الدكتورة (برمز الرابط) ومن جهة الطلاب.
   الأنواع: رسالة · طلب = مهمة · موعد · اعتماد. القراءات والحضور من supervisor_message_acks (PENDING_2026-11-18_doc_chat.sql).
   قبل تشغيل ملف SQL: الرسائل النصية تشتغل بالدالة القديمة، والباقي يقول «يحتاج تحديث». */

export type DocKind = "text" | "request" | "meeting" | "approval" | "voice" | "file";
export interface DocMsg {
  id: string;
  sender: "supervisor" | "team";
  senderName: string;
  body: string;
  createdAt: string;
  kind: DocKind;
  payload: Record<string, unknown>;
  reads: number | null;
  members: number | null;
  rsvps: Record<string, "yes" | "no" | "other">;
}

export function parseThread(raw: unknown): DocMsg[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((m: Record<string, unknown>) => ({
    id: String(m.id),
    sender: m.sender === "supervisor" ? "supervisor" : "team",
    senderName: String(m.senderName ?? ""),
    body: String(m.body ?? ""),
    createdAt: String(m.createdAt ?? ""),
    kind: ((m.kind as DocKind) || "text") as DocKind,
    payload: (m.payload as Record<string, unknown>) ?? {},
    reads: typeof m.reads === "number" ? m.reads : m.reads != null ? Number(m.reads) : null,
    members: typeof m.members === "number" ? m.members : null,
    rsvps: (m.rsvps as DocMsg["rsvps"]) ?? {},
  }));
}

export async function loadDocThread(token: string): Promise<DocMsg[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_supervisor_thread", { p_token: token });
  return error ? [] : parseThread(data);
}

const missing = (msg: string) => /supervisor_post|function .* does not exist|PGRST202/i.test(msg);

/** ترسل الدكتورة. يرجع رسالة خطأ أو null */
export async function postDocMessage(token: string, kind: DocKind, body: string, payload: Record<string, unknown>, name: string): Promise<string | null> {
  if (!supabase) return tr("ما انرسلت — جرّبوا مرة ثانية.");
  const { error } = await supabase.rpc("supervisor_post", { p_token: token, p_kind: kind, p_body: body, p_payload: payload, p_name: name });
  if (!error) return null;
  if (missing(error.message)) {
    if (kind !== "text") return tr("الطلبات والمواعيد داخل المحادثة تشتغل بعد تحديث قاعدة البيانات.");
    const r = await supabase.rpc("submit_supervisor_message", { p_token: token, p_body: body, p_name: name });
    return r.error ? tr("ما انرسلت — جرّبوا مرة ثانية.") : null;
  }
  if (/invalid assignee/.test(error.message)) return tr("اختاروا طالب من الفريق.");
  if (/rate limit/.test(error.message)) return tr("رسائل كثيرة بوقت قصير. استنوا شوي.");
  return tr("ما انرسلت — جرّبوا مرة ثانية.");
}

export const QUICK_REPLIES = ["تمام، كمّلوا 👍", "نتكلم فيه بالاجتماع"];

/** «د. إسراء بتشوف هذي الرسالة»: رسالة شكلها للفريق مو للدكتورة (ضحك، إيموجي مزح، كلام عن الدكتورة بصيغة الغائب، عامية بين الشباب) */
export function looksTeamOnly(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/(ه{3,}|ﻫ{3,}|😂|🤣|😭|💀|🙄|😒|lol|lmao)/i.test(t)) return true;
  if (/(الدكتور[ةه]?|الدكتورة|الدكتوره|الدكتور|المشرف[ةه]?|الدكتوره)\s+(نس|قال|تبي|يبي|ما\s|مدري|زعلان|معصب|عصب|ردت|رد|شكل)/.test(t)) return true;
  if (/(يا\s?شباب|يا\s?بنات|ياخي|يا\s?جماعة|والله\s?مدري|طفشت|زهقت|خلونا\s?نطنش)/.test(t)) return true;
  return false;
}
