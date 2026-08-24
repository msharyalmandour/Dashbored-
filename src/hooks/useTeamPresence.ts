import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

interface PresenceUser {
  id: string;
  name: string;
  initials: string;
  color: string;
}

/** يتتبع مين من الفريق متصل بالموقع الحين، عبر Supabase Realtime Presence.
    يشتغل فقط بوضع Supabase الحقيقي — بوضع العرض التجريبي يرجّع قائمة فاضية. */
export function useTeamPresence() {
  const { team, currentUser, mode } = useAuth();
  const [online, setOnline] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (mode !== "supabase" || !supabase || !team || !currentUser) return;

    const channel = supabase.channel(`team-presence:${team.id}`, {
      config: { presence: { key: currentUser.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceUser>();
        const users: PresenceUser[] = Object.values(state)
          .map((entries) => entries[0])
          .filter((u) => u && u.id !== currentUser.id)
          .map((u) => ({ id: u.id, name: u.name, initials: u.initials, color: u.color }));
        setOnline(users);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.track({
            id: currentUser.id,
            name: currentUser.name,
            initials: currentUser.initials,
            color: currentUser.color,
          });
        }
      });

    return () => {
      supabase!.removeChannel(channel);
    };
  }, [mode, team, currentUser]);

  return online;
}
