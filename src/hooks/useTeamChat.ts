import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

export interface ChatRef {
  type: "task" | "section" | "paper";
  id: string;
  label: string;
}

export type ChatKind = "user" | "agent" | "event" | "poll";

/** بيانات الحدث / التصويت / رد الوكيل (team_messages.meta) */
export interface ChatMeta {
  type?: string;
  options?: string[];
  closed?: boolean;
  winner?: number;
  [k: string]: unknown;
}

export interface ChatMessage {
  id: string;
  /** null لأحداث الموقع (مثل «المشرف/ة اعتمدت المحضر») */
  authorId: string;
  kind: ChatKind;
  meta: ChatMeta | null;
  body: string;
  replyTo: string | null;
  ref: ChatRef | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  /** رسالة أرسلناها وما وصل تأكيدها من السيرفر */
  pending?: boolean;
  /** ما انرسلت (نقدر نعيد المحاولة) */
  failed?: boolean;
  /** للإرسال من جديد بعد الفشل */
  mentions?: string[];
}

interface Row {
  id: string;
  author_id: string | null;
  kind?: ChatKind | null;
  meta?: ChatMeta | null;
  body: string;
  reply_to: string | null;
  ref_type: ChatRef["type"] | null;
  ref_id: string | null;
  ref_label: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

const mapRow = (r: Row): ChatMessage => ({
  id: r.id,
  authorId: r.author_id ?? "",
  kind: r.kind ?? "user",
  meta: r.meta ?? null,
  body: r.body,
  replyTo: r.reply_to,
  ref: r.ref_type && r.ref_id ? { type: r.ref_type, id: r.ref_id, label: r.ref_label ?? "" } : null,
  createdAt: r.created_at,
  editedAt: r.edited_at,
  deletedAt: r.deleted_at,
});

const PAGE = 300;
const LAST_READ = (teamId: string, userId: string) => `wesync.chat.read.${teamId}.${userId}`;

/* متجر وحيد للمحادثة: صفحة المحادثة وعدّاد الرسائل الجديدة بالقائمة يقرون منه، بقناة Realtime وحدة.
   (supabase.channel بنفس الاسم يرجّع نفس القناة، وإضافة مستمع بعد subscribe ترمي خطأ — نفس سبب useTeamPresence) */
type Typer = { id: string; at: number };
interface Store {
  key: string;
  teamId: string;
  userId: string;
  messages: ChatMessage[];
  loaded: boolean;
  unavailable: boolean;
  typers: Typer[];
  /** آخر وقت قرا فيه كل عضو المحادثة (team_chat_reads) — لـ ✓✓ و«آخر ظهور» */
  reads: Record<string, string>;
  /** التصويت: رسالة ← (عضو ← خيار) */
  votes: Record<string, Record<string, number>>;
  channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null;
  listeners: Set<() => void>;
}
let store: Store | null = null;

const emit = (s: Store) => s.listeners.forEach((l) => l());

function upsert(s: Store, m: ChatMessage) {
  const i = s.messages.findIndex((x) => x.id === m.id);
  if (i >= 0) s.messages = s.messages.map((x, j) => (j === i ? m : x));
  else s.messages = [...s.messages, m].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function open(teamId: string, userId: string): Store {
  const key = `${teamId}:${userId}`;
  if (store && store.key === key) return store;
  if (store?.channel) supabase!.removeChannel(store.channel);
  const s: Store = { key, teamId, userId, messages: [], loaded: false, unavailable: false, typers: [], reads: {}, votes: {}, channel: null, listeners: new Set() };
  store = s;

  void (async () => {
    const { data, error } = await supabase!
      .from("team_messages")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false })
      .limit(PAGE);
    if (store !== s) return;
    if (error) {
      // الجدول لسا ما انضاف (قبل تشغيل ملف SQL): نعرض رسالة واضحة بدل صفحة مكسورة
      s.unavailable = /team_messages|42P01|PGRST205|schema cache/i.test(`${error.code} ${error.message}`);
    } else {
      s.messages = ((data ?? []) as Row[]).map(mapRow).reverse();
    }
    s.loaded = true;
    emit(s);
    // ✓✓: لو جدول القراءات موجود (قبل تشغيل ملف SQL يرجع خطأ ونكمل بدونه)
    const reads = await supabase!.from("team_chat_reads").select("profile_id, last_read_at").eq("team_id", teamId);
    if (store !== s || reads.error) return;
    for (const r of (reads.data ?? []) as { profile_id: string; last_read_at: string }[]) s.reads[r.profile_id] = r.last_read_at;
    emit(s);
    const votes = await supabase!.from("team_message_votes").select("message_id, profile_id, option").eq("team_id", teamId);
    if (store !== s || votes.error) return;
    for (const v of (votes.data ?? []) as { message_id: string; profile_id: string; option: number }[]) s.votes[v.message_id] = { ...(s.votes[v.message_id] ?? {}), [v.profile_id]: v.option };
    emit(s);
  })();

  const channel = supabase!.channel(`team-chat:${teamId}`);
  channel
    .on("postgres_changes", { event: "*", schema: "public", table: "team_messages", filter: `team_id=eq.${teamId}` }, (payload) => {
      if (store !== s) return;
      if (payload.eventType === "DELETE") {
        const id = (payload.old as { id?: string }).id;
        s.messages = s.messages.filter((m) => m.id !== id);
      } else {
        upsert(s, mapRow(payload.new as Row));
      }
      emit(s);
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "team_chat_reads", filter: `team_id=eq.${teamId}` }, (payload) => {
      const r = payload.new as { profile_id?: string; last_read_at?: string };
      if (store !== s || !r?.profile_id || !r.last_read_at) return;
      s.reads = { ...s.reads, [r.profile_id]: r.last_read_at };
      emit(s);
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "team_message_votes", filter: `team_id=eq.${teamId}` }, (payload) => {
      if (store !== s) return;
      const v = (payload.eventType === "DELETE" ? payload.old : payload.new) as { message_id?: string; profile_id?: string; option?: number };
      if (!v?.message_id || !v.profile_id) return;
      const cur = { ...(s.votes[v.message_id] ?? {}) };
      if (payload.eventType === "DELETE") delete cur[v.profile_id];
      else cur[v.profile_id] = v.option ?? 0;
      s.votes = { ...s.votes, [v.message_id]: cur };
      emit(s);
    })
    .on("broadcast", { event: "typing" }, ({ payload }) => {
      const id = (payload as { id?: string })?.id;
      if (!id || id === userId || store !== s) return;
      s.typers = [...s.typers.filter((t) => t.id !== id), { id, at: Date.now() }];
      emit(s);
    })
    .subscribe();
  s.channel = channel;
  return s;
}

function useStore() {
  const { team, currentUser, mode } = useAuth();
  const [, force] = useState(0);
  const live = mode === "supabase" && !!supabase && !!team && !!currentUser;
  useEffect(() => {
    if (!live) return;
    const s = open(team!.id, currentUser!.id);
    const l = () => force((n) => n + 1);
    s.listeners.add(l);
    l();
    return () => {
      s.listeners.delete(l);
    };
  }, [live, team, currentUser]);
  return live && store && store.key === `${team!.id}:${currentUser!.id}` ? store : null;
}

/** محادثة الفريق: الرسائل لحظيًا + إرسال ورد وتعديل وحذف (حذف ناعم: «انحذفت الرسالة») */
export function useTeamChat() {
  const s = useStore();
  const { currentUser } = useAuth();
  const [now, setNow] = useState(() => Date.now());

  // «يكتب الحين…» يختفي بعد ٤ ثواني بدون إشارة جديدة
  useEffect(() => {
    if (!s?.typers.length) return;
    const t = setInterval(() => setNow(Date.now()), 1500);
    return () => clearInterval(t);
  }, [s?.typers.length]);

  const send = useCallback(
    async (body: string, opts: { replyTo?: string | null; ref?: ChatRef | null; mentions?: string[]; retryOf?: string } = {}) => {
      if (!s || !currentUser) return { error: "offline" };
      const text = body.trim().slice(0, 4000);
      if (!text) return { error: "empty" };
      if (opts.retryOf) s.messages = s.messages.filter((m) => m.id !== opts.retryOf);
      const tempId = `tmp-${Date.now()}`;
      const temp: ChatMessage = { id: tempId, authorId: currentUser.id, kind: "user", meta: null, body: text, replyTo: opts.replyTo ?? null, ref: opts.ref ?? null, createdAt: new Date().toISOString(), editedAt: null, deletedAt: null, pending: true, mentions: opts.mentions };
      upsert(s, temp);
      emit(s);
      const { data, error } = await supabase!
        .from("team_messages")
        .insert({
          body: text,
          reply_to: opts.replyTo ?? null,
          ref_type: opts.ref?.type ?? null,
          ref_id: opts.ref?.id ?? null,
          ref_label: opts.ref?.label.slice(0, 200) ?? null,
        })
        .select()
        .single();
      s.messages = s.messages.filter((m) => m.id !== tempId);
      if (!error && data) {
        upsert(s, mapRow(data as Row));
        // إشعار الجوال لباقي الفريق (السيرفر يتأكد إني الكاتب ويرسل مرة وحدة)، واللي انشار لهم يجيهم «أشار لك»
        void supabase!.functions.invoke("push-notify", { body: { action: "chat", messageId: (data as Row).id, mentions: opts.mentions ?? [] } }).catch(() => {});
      } else {
        // تبقى باهتة وتحتها «ما انرسلت · جرّب مرة ثانية»
        upsert(s, { ...temp, pending: false, failed: true });
      }
      emit(s);
      return { error: error?.message };
    },
    [s, currentUser],
  );

  const edit = useCallback(
    async (id: string, body: string) => {
      if (!s) return { error: "offline" };
      const text = body.trim().slice(0, 4000);
      if (!text) return { error: "empty" };
      const { error } = await supabase!.from("team_messages").update({ body: text, edited_at: new Date().toISOString() }).eq("id", id);
      return { error: error?.message };
    },
    [s],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!s) return { error: "offline" };
      const { error } = await supabase!.from("team_messages").update({ deleted_at: new Date().toISOString(), body: "·" }).eq("id", id);
      return { error: error?.message };
    },
    [s],
  );

  /** رد الوكيل أو تصويت: نفس الإرسال بنوع وبيانات (يحتاج ملف SQL الجديد) */
  const post = useCallback(
    async (kind: "agent" | "poll", body: string, meta: ChatMeta, replyTo: string | null = null) => {
      if (!s || !currentUser) return { error: "offline" };
      const { data, error } = await supabase!
        .from("team_messages")
        .insert({ body: body.trim().slice(0, 4000) || "·", kind, meta, reply_to: replyTo })
        .select()
        .single();
      if (!error && data) {
        upsert(s, mapRow(data as Row));
        emit(s);
        if (kind === "poll") void supabase!.functions.invoke("push-notify", { body: { action: "chat", messageId: (data as Row).id } }).catch(() => {});
      }
      return { error: error?.message };
    },
    [s, currentUser],
  );

  const vote = useCallback(
    async (messageId: string, option: number) => {
      if (!s || !currentUser) return { error: "offline" };
      const mine = s.votes[messageId]?.[currentUser.id];
      s.votes = { ...s.votes, [messageId]: { ...(s.votes[messageId] ?? {}), [currentUser.id]: option } };
      emit(s);
      const q = supabase!.from("team_message_votes");
      const { error } = mine === undefined ? await q.insert({ message_id: messageId, option }) : await q.update({ option }).eq("message_id", messageId).eq("profile_id", currentUser.id);
      return { error: error?.message };
    },
    [s, currentUser],
  );

  const closePoll = useCallback(
    async (m: ChatMessage, winner: number) => {
      const { error } = await supabase!.from("team_messages").update({ meta: { ...(m.meta ?? {}), closed: true, winner } }).eq("id", m.id);
      return { error: error?.message };
    },
    [],
  );

  /** «ذكّرني»: إشعار جوال بالوقت المختار */
  const remind = useCallback(
    async (m: ChatMessage, at: Date) => {
      const { error } = await supabase!.from("chat_reminders").insert({ message_id: m.id.startsWith("tmp-") ? null : m.id, body: m.body.slice(0, 300), remind_at: at.toISOString() });
      return { error: error?.message };
    },
    [],
  );

  const retry = useCallback(
    (m: ChatMessage) => send(m.body, { replyTo: m.replyTo, ref: m.ref, mentions: m.mentions, retryOf: m.id }),
    [send],
  );

  // نعلّم إني قريت لين آخر رسالة (✓✓ للباقين) — مرة كل كم ثانية بالكثير
  const markRead = useCallback(
    (at: string) => {
      if (!s || !currentUser) return;
      if ((s.reads[currentUser.id] ?? "") >= at) return;
      s.reads = { ...s.reads, [currentUser.id]: at };
      void supabase!
        .from("team_chat_reads")
        .upsert({ team_id: s.teamId, profile_id: currentUser.id, last_read_at: at }, { onConflict: "team_id,profile_id" })
        .then(() => {});
    },
    [s, currentUser],
  );

  const typing = useCallback(() => {
    if (s?.channel && currentUser) void s.channel.send({ type: "broadcast", event: "typing", payload: { id: currentUser.id } });
  }, [s, currentUser]);

  return {
    messages: s?.messages ?? [],
    loaded: s?.loaded ?? false,
    unavailable: s?.unavailable ?? false,
    typers: (s?.typers ?? []).filter((t) => now - t.at < 4000).map((t) => t.id),
    reads: s?.reads ?? {},
    votes: s?.votes ?? {},
    send,
    post,
    vote,
    closePoll,
    remind,
    retry,
    markRead,
    edit,
    remove,
    typing,
  };
}

/** عدد رسائل الفريق الجديدة (من غيري) من آخر مرة فتحت المحادثة — للقائمة والشريط تحت */
export function useChatUnread() {
  const s = useStore();
  const { team, currentUser } = useAuth();
  const key = team && currentUser ? LAST_READ(team.id, currentUser.id) : "";
  const [lastRead, setLastRead] = useState(() => {
    try {
      return key ? localStorage.getItem(key) ?? "" : "";
    } catch {
      return "";
    }
  });
  useEffect(() => {
    const on = () => {
      try {
        setLastRead(key ? localStorage.getItem(key) ?? "" : "");
      } catch {
        // ما يهم
      }
    };
    window.addEventListener("wesync:chat-read", on);
    return () => window.removeEventListener("wesync:chat-read", on);
  }, [key]);
  const unread = (s?.messages ?? []).filter((m) => m.authorId !== currentUser?.id && !m.deletedAt && m.createdAt > lastRead).length;
  return unread;
}

/** نعلّم المحادثة مقروءة لين آخر رسالة */
export function markChatRead(teamId: string, userId: string, at: string) {
  try {
    localStorage.setItem(LAST_READ(teamId, userId), at);
  } catch {
    // ما يهم
  }
  window.dispatchEvent(new Event("wesync:chat-read"));
}
