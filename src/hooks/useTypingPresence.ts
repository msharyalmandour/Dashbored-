import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";

/** «فلان يكتب الحين» بمحرر الكتابة: إشارة لحظية عبر Supabase Realtime (broadcast) — ما تنحفظ بأي مكان.
    ping() تنادى مع الكتابة (بحد أقصى مرة كل ٢ ثانية)، والاسم يختفي بعد ٤ ثواني من آخر إشارة. */
export function useTypingPresence(spot: string) {
  const { team, currentUser, mode } = useAuth();
  const [typers, setTypers] = useState<Record<string, { name: string; at: number }>>({});
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const lastPing = useRef(0);

  useEffect(() => {
    if (mode !== "supabase" || !supabase || !team || !currentUser) return;
    const channel = supabase.channel(`write-typing:${team.id}`);
    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const p = payload as { id: string; name: string; spot: string };
        if (!p || p.id === currentUser.id) return;
        setTypers((prev) => ({ ...prev, [p.id]: { name: p.spot === spot ? p.name : "", at: Date.now() } }));
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      supabase!.removeChannel(channel);
    };
  }, [mode, team, currentUser, spot]);

  // ننظّف الأسماء القديمة
  useEffect(() => {
    const t = setInterval(() => {
      setTypers((prev) => {
        const now = Date.now();
        const next = Object.fromEntries(Object.entries(prev).filter(([, v]) => now - v.at < 4000));
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, 1500);
    return () => clearInterval(t);
  }, []);

  const ping = useCallback(() => {
    const now = Date.now();
    if (!channelRef.current || !currentUser || now - lastPing.current < 2000) return;
    lastPing.current = now;
    channelRef.current.send({ type: "broadcast", event: "typing", payload: { id: currentUser.id, name: currentUser.name, spot } });
  }, [currentUser, spot]);

  const names = Object.values(typers)
    .filter((v) => v.name)
    .map((v) => v.name.split(" ")[0]);
  return { names, ping };
}
