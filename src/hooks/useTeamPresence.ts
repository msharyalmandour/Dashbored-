import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

interface PresenceUser {
  id: string;
  name: string;
  initials: string;
  color: string;
}

/* قناة حضور وحدة مشتركة لكل الصفحة: أكثر من مكوّن يستخدم useTeamPresence بنفس الوقت (الشريط العلوي + الرئيسية).
   supabase.channel() بنفس الاسم يرجّع نفس القناة المشتركة، وإضافة مستمع لها بعد subscribe() ترمي خطأ يطيّح الصفحة —
   فنفتحها مرة وحدة هنا ونعدّ المستخدمين، ونقفلها لما يطلع آخر واحد. */
type Listener = (users: PresenceUser[]) => void;
let shared: { key: string; channel: ReturnType<NonNullable<typeof supabase>["channel"]>; users: PresenceUser[]; listeners: Set<Listener> } | null = null;

function join(teamId: string, me: PresenceUser, listener: Listener): () => void {
  const key = `${teamId}:${me.id}`;
  if (shared && shared.key !== key) {
    supabase!.removeChannel(shared.channel);
    shared = null;
  }
  if (!shared) {
    const channel = supabase!.channel(`team-presence:${teamId}`, { config: { presence: { key: me.id } } });
    const state = { key, channel, users: [] as PresenceUser[], listeners: new Set<Listener>() };
    channel
      .on("presence", { event: "sync" }, () => {
        const raw = channel.presenceState<PresenceUser>();
        state.users = Object.values(raw)
          .map((entries) => entries[0])
          .filter((u) => u && u.id !== me.id)
          .map((u) => ({ id: u.id, name: u.name, initials: u.initials, color: u.color }));
        state.listeners.forEach((l) => l(state.users));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") channel.track(me);
      });
    shared = state;
  }
  const s = shared;
  s.listeners.add(listener);
  listener(s.users);
  return () => {
    s.listeners.delete(listener);
    if (s.listeners.size === 0 && shared === s) {
      supabase!.removeChannel(s.channel);
      shared = null;
    }
  };
}

/** يتتبع مين من الفريق متصل بالموقع الحين، عبر Supabase Realtime Presence.
    يشتغل فقط بوضع Supabase الحقيقي — بوضع العرض التجريبي يرجّع قائمة فاضية. */
export function useTeamPresence() {
  const { team, currentUser, mode } = useAuth();
  const [online, setOnline] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (mode !== "supabase" || !supabase || !team || !currentUser) return;
    return join(team.id, { id: currentUser.id, name: currentUser.name, initials: currentUser.initials, color: currentUser.color }, setOnline);
  }, [mode, team, currentUser]);

  return online;
}
