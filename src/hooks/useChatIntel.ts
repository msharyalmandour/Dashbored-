import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchCatchup, fetchLiveSummary, focusUntil, orphanQuestions, readFocus, readSummaryCache, setFocus, type CachedSummary, type FocusState } from "../lib/chatIntel";
import type { ChatMessage } from "./useTeamChat";
import type { FocusChoice } from "../components/chat/ChatIntel";

const AWAY_MS = 48 * 3600e3;
const ls = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* ما يهم */
    }
  },
};

/** ذكاء المحادثة: الخلاصة الحيّة + الأسئلة اللي محد جاوبها + «اللي فاتك» + وقت التركيز */
export function useChatIntel(messages: ChatMessage[], loaded: boolean, myLastRead: string | null | undefined) {
  const { team, currentUser, canWrite } = useAuth();
  const teamId = team?.id ?? "";
  const me = currentUser?.id ?? "";

  // ── الخلاصة الحيّة ──
  const [summary, setSummary] = useState<CachedSummary | null>(() => (teamId ? readSummaryCache(teamId) : null));
  const [collapsed, setCollapsed] = useState(() => ls.get("wesync.chat-summary.collapsed") === "1");
  const lastAt = useMemo(() => [...messages].reverse().find((m) => !m.pending && !m.failed)?.createdAt ?? "", [messages]);
  const talk = useMemo(() => messages.filter((m) => m.kind === "user" && !m.deletedAt).length, [messages]);
  useEffect(() => {
    if (!loaded || !teamId || !lastAt || talk < 4) return;
    let alive = true;
    const run = () => void fetchLiveSummary(teamId, lastAt).then((s) => alive && s && setSummary(s));
    run();
    // رسائل وصلت قبل ما تمر الدقيقتين: نعيد بعدها
    const t = setTimeout(run, 2 * 60_000 + 500);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [loaded, teamId, lastAt, talk]);
  const toggleSummary = useCallback(() => {
    setCollapsed((c) => {
      ls.set("wesync.chat-summary.collapsed", c ? "0" : "1");
      return !c;
    });
  }, []);

  // ── الأسئلة اللي محد جاوبها ──
  const dismissKey = `wesync.orphan-dismissed.${teamId}`;
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set(JSON.parse(ls.get(dismissKey) ?? "[]") as string[]));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const orphans = useMemo(() => (loaded ? orphanQuestions(messages, now, dismissed) : []), [loaded, messages, now, dismissed]);
  const dismissOrphan = useCallback(
    (id: string) => {
      setDismissed((prev) => {
        const next = new Set(prev).add(id);
        ls.set(dismissKey, JSON.stringify([...next].slice(-100)));
        return next;
      });
    },
    [dismissKey],
  );

  // ── «اللي فاتك ويخصك»: بعد غياب 48 ساعة، مرة وحدة بالزيارة ──
  const [catchup, setCatchup] = useState<{ lines: string[]; since: string } | null>(null);
  const asked = useRef(false);
  useEffect(() => {
    if (!loaded || asked.current || !me || !canWrite || !myLastRead) return;
    asked.current = true;
    if (Date.now() - Date.parse(myLastRead) < AWAY_MS) return;
    const missed = messages.filter((m) => m.createdAt > myLastRead && m.authorId !== me && !m.deletedAt).length;
    const key = `wesync.catchup.${me}.${myLastRead}`;
    if (missed < 3 || ls.get(key)) return;
    ls.set(key, "1");
    void fetchCatchup(myLastRead).then((lines) => lines.length >= 2 && setCatchup({ lines, since: myLastRead }));
  }, [loaded, me, canWrite, myLastRead, messages]);
  const firstUnread = useMemo(() => (catchup ? messages.find((m) => m.createdAt > catchup.since && m.authorId !== me && !m.deletedAt)?.id ?? null : null), [catchup, messages, me]);

  // ── وقت التركيز ──
  const [focus, setFocusState] = useState<FocusState | null>(() => readFocus());
  const [focusChoice, setFocusChoice] = useState<FocusChoice | null>(null);
  const [focusDone, setFocusDone] = useState<{ count: number; mentions: number; doc: number } | null>(null);
  const pickFocus = useCallback(
    async (c: FocusChoice) => {
      if (!me) return;
      setFocusChoice(c);
      setFocusState(await setFocus(me, focusUntil(c)));
    },
    [me],
  );
  const endFocus = useCallback(async () => {
    if (!me) return;
    setFocusChoice(null);
    setFocusState(await setFocus(me, null));
  }, [me]);
  useEffect(() => {
    if (!focus) return;
    const check = () => {
      if (Date.parse(focus.until) > Date.now()) return;
      const first = (currentUser?.name ?? "").trim().split(/\s+/)[0];
      const during = messages.filter((m) => m.createdAt >= focus.startedAt && m.createdAt <= focus.until && m.authorId !== me && !m.deletedAt);
      setFocusDone({
        count: during.length,
        mentions: first ? during.filter((m) => m.body.includes(`@${first}`)).length : 0,
        doc: during.filter((m) => m.kind === "event" && m.meta?.type === "supervisor_message").length,
      });
      void endFocus();
    };
    check();
    const t = setInterval(check, 30_000);
    return () => clearInterval(t);
  }, [focus, messages, me, currentUser?.name, endFocus]);

  return {
    summary: summary?.summary && (summary.summary.decided.length || summary.summary.open.length || summary.summary.owners.length) ? summary : null,
    collapsed,
    toggleSummary,
    orphans,
    dismissOrphan,
    catchup,
    closeCatchup: () => setCatchup(null),
    firstUnread,
    focus,
    focusChoice,
    pickFocus,
    endFocus,
    focusDone,
    closeFocusDone: () => setFocusDone(null),
  };
}
