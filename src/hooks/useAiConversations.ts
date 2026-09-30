import { useCallback, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  hadImage: boolean;
}

interface ConvRow {
  id: string;
  title: string;
  updated_at: string;
}

const TITLE_MAX = 48;

/** سجل محادثات المساعد — خاص بكل مستخدمة (RLS: user_id = auth.uid()).
    الصور ما تنحفظ، بس علامة إن الرسالة كان معها صورة. أي فشل بالحفظ
    ما يوقف المحادثة نفسها (الشات يشتغل بالذاكرة والحفظ "أفضل جهد"). */
export function useAiConversations() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("ai_conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(40);
    setConversations(((data ?? []) as ConvRow[]).map((r) => ({ id: r.id, title: r.title, updatedAt: r.updated_at })));
    setLoaded(true);
  }, []);

  const loadMessages = useCallback(async (conversationId: string): Promise<StoredMessage[]> => {
    if (!supabase) return [];
    const { data } = await supabase
      .from("ai_messages")
      .select("role, content, had_image")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(200);
    return ((data ?? []) as { role: "user" | "assistant"; content: string; had_image: boolean }[]).map((m) => ({
      role: m.role,
      content: m.content,
      hadImage: m.had_image,
    }));
  }, []);

  /** ينشئ محادثة جديدة بعنوان من أول رسالة — يرجّع id أو null لو فشل */
  const createConversation = useCallback(async (userId: string, firstText: string): Promise<string | null> => {
    if (!supabase) return null;
    const title = firstText.replace(/\s+/g, " ").trim().slice(0, TITLE_MAX) || "محادثة جديدة";
    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({ user_id: userId, title })
      .select("id, title, updated_at")
      .single();
    if (error || !data) return null;
    const row = data as ConvRow;
    setConversations((prev) => [{ id: row.id, title: row.title, updatedAt: row.updated_at }, ...prev]);
    return row.id;
  }, []);

  const saveMessage = useCallback(async (conversationId: string, msg: StoredMessage) => {
    if (!supabase) return;
    const { error } = await supabase.from("ai_messages").insert({
      conversation_id: conversationId,
      role: msg.role,
      content: msg.content,
      had_image: msg.hadImage,
    });
    if (error) return;
    const now = new Date().toISOString();
    await supabase.from("ai_conversations").update({ updated_at: now }).eq("id", conversationId);
    setConversations((prev) => {
      const hit = prev.find((c) => c.id === conversationId);
      if (!hit) return prev;
      return [{ ...hit, updatedAt: now }, ...prev.filter((c) => c.id !== conversationId)];
    });
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from("ai_conversations").delete().eq("id", id);
    if (!error) setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { conversations, loaded, refresh, loadMessages, createConversation, saveMessage, deleteConversation };
}
