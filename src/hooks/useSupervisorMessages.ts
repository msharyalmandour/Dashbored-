import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";

export interface SupervisorMessage {
  id: string;
  sender: "supervisor" | "team";
  senderName: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

interface Row {
  id: string;
  sender: "supervisor" | "team";
  sender_name: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

const mapRow = (r: Row): SupervisorMessage => ({
  id: r.id,
  sender: r.sender,
  senderName: r.sender_name,
  body: r.body,
  createdAt: r.created_at,
  readAt: r.read_at,
});

const mockMessages: SupervisorMessage[] = [
  {
    id: "mock-1",
    sender: "supervisor",
    senderName: "د. المشرفة",
    body: "راجعوا صياغة الفجوة البحثية، وأضيفوا ٣ دراسات سعودية حديثة لمراجعة الأدبيات. وضّحوا معايير الاشتمال والاستبعاد قبل الاجتماع الجاي.",
    createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    readAt: null,
  },
];

/** محادثة الفريق مع المشرفة عبر رابطها. وضع العرض التجريبي: رسالة نموذجية بالذاكرة. */
export function useSupervisorMessages() {
  const { team, currentUser } = useAuth();
  const teamId = team?.id ?? null;
  const [messages, setMessages] = useState<SupervisorMessage[]>(isSupabaseConfigured ? [] : mockMessages);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  const load = useCallback(async () => {
    if (!isSupabaseConfigured || !teamId) return;
    const { data } = await supabase!
      .from("supervisor_messages")
      .select("id, sender, sender_name, body, created_at, read_at")
      .eq("team_id", teamId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (data) setMessages((data as Row[]).map(mapRow));
    setLoading(false);
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
  }, []);

  /** رد الفريق — يظهر للمشرفة بنفس المحادثة عند فتح رابطها. */
  const reply = async (body: string): Promise<{ error?: string }> => {
    const text = body.trim();
    if (!text) return {};
    if (text.length > 1500) return { error: "الرسالة طويلة — الحد ١٥٠٠ حرف." };
    if (!isSupabaseConfigured || !teamId || !currentUser) {
      setMessages((prev) => [
        ...prev,
        { id: `local-${Date.now()}`, sender: "team", senderName: currentUser?.name ?? "الفريق", body: text, createdAt: new Date().toISOString(), readAt: null },
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
    if (error) return { error: "ما انرسل الرد — تأكدوا أن اشتراك الفريق فعّال وحاولوا مرة ثانية." };
    await load();
    return {};
  };

  return { messages, unread, loading, markRead, reply };
}
