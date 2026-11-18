import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { tr } from "../lib/i18n";

export interface SupervisorMessage {
  id: string;
  sender: "supervisor" | "team";
  senderName: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  /** بعد ملف PENDING_2026-11-18_doc_chat.sql: نوع الرسالة ومحتواها المنظّم */
  kind: "text" | "request" | "meeting" | "approval" | "voice" | "file";
  payload: Record<string, unknown>;
  createdBy: string | null;
}

interface Row {
  id: string;
  sender: "supervisor" | "team";
  sender_name: string;
  body: string;
  created_at: string;
  read_at: string | null;
  kind?: SupervisorMessage["kind"];
  payload?: Record<string, unknown> | null;
  created_by?: string | null;
}

const mapRow = (r: Row): SupervisorMessage => ({
  id: r.id,
  sender: r.sender,
  senderName: r.sender_name,
  body: r.body,
  createdAt: r.created_at,
  readAt: r.read_at,
  kind: r.kind ?? "text",
  payload: r.payload ?? {},
  createdBy: r.created_by ?? null,
});

const mockMessages: SupervisorMessage[] = [
  {
    id: "mock-1",
    sender: "supervisor",
    senderName: tr("د. المشرفة"),
    body: tr("راجعوا صياغة الفجوة البحثية، وأضيفوا 3 دراسات سعودية حديثة لمراجعة الأدبيات. وضّحوا معايير الاشتمال والاستبعاد قبل الاجتماع الجاي."),
    createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    readAt: null,
    kind: "text",
    payload: {},
    createdBy: null,
  },
];

/** محادثة الفريق مع المشرفة عبر رابطها. وضع العرض التجريبي: رسالة نموذجية بالذاكرة. */
export function useSupervisorMessages() {
  const { team, currentUser } = useAuth();
  const teamId = team?.id ?? null;
  const [messages, setMessages] = useState<SupervisorMessage[]>(isSupabaseConfigured ? [] : mockMessages);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [rsvps, setRsvps] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !teamId) return;
    const { data } = await supabase!
      .from("supervisor_messages")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (data) setMessages((data as Row[]).filter((r) => !(r as { deleted_at?: string | null }).deleted_at).map(mapRow));
    setLoading(false);
    // الحضور حقي على مواعيد الدكتورة (الجدول ينضاف بملف SQL — قبله نتجاهل الخطأ)
    const me = (await supabase!.auth.getUser()).data.user?.id;
    if (me) {
      const acks = await supabase!.from("supervisor_message_acks").select("message_id, rsvp").eq("profile_id", me);
      if (!acks.error && acks.data) setRsvps(Object.fromEntries((acks.data as { message_id: string; rsvp: string | null }[]).filter((a) => a.rsvp).map((a) => [a.message_id, a.rsvp as string])));
    }
  }, [teamId]);

  useEffect(() => {
    load();
    if (!isSupabaseConfigured || !teamId) return;
    const channel = supabase!
      .channel(`supervisor-messages-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "supervisor_messages", filter: `team_id=eq.${teamId}` }, load)
      .subscribe();
    return () => {
      supabase!.removeChannel(channel);
    };
  }, [load, teamId]);

  const unread = messages.filter((m) => m.sender === "supervisor" && !m.readAt).length;

  const markRead = useCallback(async () => {
    setMessages((prev) => prev.map((m) => (m.sender === "supervisor" && !m.readAt ? { ...m, readAt: new Date().toISOString() } : m)));
    if (!isSupabaseConfigured) return;
    await supabase!.rpc("mark_supervisor_messages_read");
    // «قراها 4 من 4» عند الدكتورة (بعد ملف SQL)
    await supabase!.rpc("mark_doc_thread_read").then(() => undefined, () => undefined);
  }, []);

  /** نحضر ✓ / ما نقدر — يحدّث شريحة الطالب بكرت الموعد عند الدكتورة */
  const rsvp = useCallback(async (id: string, value: "yes" | "no" | "other"): Promise<boolean> => {
    setRsvps((p) => ({ ...p, [id]: value }));
    if (!isSupabaseConfigured) return true;
    const { error } = await supabase!.rpc("rsvp_doc_meeting", { p_message: id, p_rsvp: value });
    return !error;
  }, []);

  /** حذف رسالة أرسلناها للدكتورة خلال دقيقتين */
  const remove = useCallback(async (id: string): Promise<boolean> => {
    if (!isSupabaseConfigured) {
      setMessages((p) => p.filter((m) => m.id !== id));
      return true;
    }
    const { data, error } = await supabase!.rpc("delete_doc_message", { p_id: id });
    if (error || !data) return false;
    setMessages((p) => p.filter((m) => m.id !== id));
    return true;
  }, []);

  /** رد الفريق — يظهر للمشرفة بنفس المحادثة عند فتح رابطها. */
  const reply = async (body: string): Promise<{ error?: string }> => {
    const text = body.trim();
    if (!text) return {};
    if (text.length > 1500) return { error: tr("الرسالة طويلة — الحد 1500 حرف.") };
    if (!isSupabaseConfigured || !teamId || !currentUser) {
      setMessages((prev) => [
        ...prev,
        { id: `local-${Date.now()}`, sender: "team", senderName: currentUser?.name ?? tr("الفريق"), body: text, createdAt: new Date().toISOString(), readAt: null, kind: "text", payload: {}, createdBy: currentUser?.id ?? null },
      ]);
      return {};
    }
    const { error } = await supabase!.from("supervisor_messages").insert({
      team_id: teamId,
      sender: "team",
      sender_name: currentUser.name.slice(0, 80),
      body: text,
      created_by: currentUser.id,
    });
    if (error) return { error: tr("ما انرسل الرد — تأكدوا أن اشتراك الفريق فعّال وحاولوا مرة ثانية.") };
    await load();
    return {};
  };

  return { messages, unread, loading, markRead, reply, rsvps, rsvp, remove };
}
