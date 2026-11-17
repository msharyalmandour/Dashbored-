import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { useTeamStage } from "../lib/teamStage";
import { newlyOpened, nextDoor, openDoors, DOOR_ORDER, type DoorId, type DoorSignals } from "../lib/doors";

/* إشارات الأبواب: عدّادات خفيفة (head counts) من القاعدة، بكاش مشترك بين القائمة والرئيسية والجوال.
   تتحدّث لما الطالب يرجع للصفحة، أو لما أي جزء يطلق «wesync:doors» (بعد إضافة دراسة أو كتابة قسم). */

const ALL_KEY = "wesync.doors.all";
const seenKey = (teamId: string) => `wesync.doors.seen.${teamId}`;
const EVT = "wesync:doors";

/** أي مكان يغيّر شي يفتح باب (دراسة، قسم، اجتماع…) يناديها عشان القائمة تتحدّث على طول */
export const refreshDoors = () => window.dispatchEvent(new Event(EVT));

let cache: { teamId: string; at: number; signals: DoorSignals } | null = null;
let inflight: Promise<DoorSignals> | null = null;

const filled = (v: unknown) => (Array.isArray(v) ? v.length > 0 : typeof v === "string" ? v.trim().length > 0 : !!v);

async function fetchSignals(teamId: string): Promise<Omit<DoorSignals, "stage">> {
  const db = supabase!;
  const head = { count: "exact" as const, head: true };
  const [papers, sections, method, sup, meetings, events, files, surveys] = await Promise.all([
    db.from("evidence_papers").select("id", head),
    db.from("proposal_sections").select("content"),
    db.from("methodology").select("study_design, study_setting, population, sampling_inclusion, sample_size, sampling_technique, data_collection_methods, data_analysis, ethical_considerations").maybeSingle(),
    db.rpc("get_my_supervisor_email_status"),
    db.from("meeting_minutes").select("id", head),
    db.from("calendar_events").select("id", head).eq("team_id", teamId),
    db.from("files").select("id", head),
    db.from("research_surveys").select("id", head).eq("team_id", teamId),
  ]);
  const m = (method.data ?? null) as Record<string, unknown> | null;
  const methodReady = m
    ? [m.study_design, m.study_setting, m.population, filled(m.sampling_inclusion) && filled(m.sample_size) && filled(m.sampling_technique), m.data_collection_methods, m.data_analysis, m.ethical_considerations].filter(filled).length
    : 0;
  return {
    papers: papers.count ?? 0,
    sectionsWritten: ((sections.data ?? []) as { content: string | null }[]).filter((s) => !!s.content?.trim()).length,
    methodReady,
    supervisorLinked: (sup.data as { state?: string } | null)?.state === "active",
    meetings: meetings.count ?? 0,
    events: events.count ?? 0,
    files: files.count ?? 0,
    surveys: surveys.count ?? 0,
  };
}

function readSeen(teamId: string): DoorId[] | null {
  try {
    const raw = localStorage.getItem(seenKey(teamId));
    return raw ? (JSON.parse(raw) as DoorId[]) : null;
  } catch {
    return null;
  }
}
function writeSeen(teamId: string, open: Set<DoorId>) {
  try {
    localStorage.setItem(seenKey(teamId), JSON.stringify(DOOR_ORDER.filter((d) => open.has(d))));
  } catch {
    /* بدون تخزين: الانفتاح يطلع مرة ثانية بس، ما يضر */
  }
}

export function readAllDoors(): boolean {
  try {
    return localStorage.getItem(ALL_KEY) === "1";
  } catch {
    return false;
  }
}

/** celebrate: مكان واحد بس (القائمة الجانبية) يكتشف الأبواب الجديدة ويحتفل فيها — وإلا أول نسخة تحفظها «مشافة» قبل الثانية */
export function useDoors({ celebrate = false }: { celebrate?: boolean } = {}) {
  const { team, mode } = useAuth();
  const teamId = team?.id ?? "";
  const { stage } = useTeamStage(teamId || null);
  const demo = mode === "mock" || !supabase;
  const [base, setBase] = useState<Omit<DoorSignals, "stage"> | null>(() => (cache && cache.teamId === teamId ? cache.signals : null));
  const [all, setAllState] = useState(readAllDoors);
  const [fresh, setFresh] = useState<DoorId[]>([]);

  const { pathname } = useLocation();
  const load = useCallback(
    async (force = false) => {
      if (demo || !teamId) return;
      if (!force && cache && cache.teamId === teamId && Date.now() - cache.at < 8_000) {
        setBase(cache.signals);
        return;
      }
      try {
        inflight ??= fetchSignals(teamId).then((s) => ({ ...s, stage: null }));
        const s = await inflight;
        cache = { teamId, at: Date.now(), signals: s };
        setBase(s);
      } catch {
        // ما قدرنا نقرا: نخلي القائمة كاملة بدل ما نقفل على الطالب بالغلط
        setBase(null);
      } finally {
        inflight = null;
      }
    },
    [demo, teamId],
  );

  // كل تنقّل: نتأكد إذا انفتح باب (بكاش 8 ثواني عشان ما نكثر الطلبات)
  useEffect(() => {
    void load();
  }, [load, pathname]);
  useEffect(() => {
    const again = () => void load(true);
    const onFocus = () => document.visibilityState === "visible" && void load();
    window.addEventListener(EVT, again);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener(EVT, again);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [load]);

  const signals = useMemo<DoorSignals | null>(() => (base ? { ...base, stage } : null), [base, stage]);
  // العرض التجريبي، أو ما وصلنا للبيانات، أو اختاروا «كل الأبواب»: كل شي مفتوح
  const ready = !!signals && !demo;
  const open = useMemo(() => (ready ? openDoors(signals!) : new Set<DoorId>(DOOR_ORDER)), [ready, signals]);

  // لحظة الانفتاح: الأبواب الجديدة من آخر زيارة (مرة وحدة لكل باب)
  useEffect(() => {
    if (!celebrate || !ready || !teamId) return;
    const seen = readSeen(teamId);
    const now = newlyOpened(open, seen);
    writeSeen(teamId, open);
    if (now.length) setFresh(now);
  }, [celebrate, ready, teamId, open]);

  const clearFresh = useCallback(() => setFresh((f) => f.slice(1)), []);
  const setAll = (v: boolean) => {
    try {
      localStorage.setItem(ALL_KEY, v ? "1" : "0");
    } catch {
      /* ما يهم */
    }
    setAllState(v);
  };

  return {
    /** هل الباب ظاهر بالقائمة */
    isOpen: (d: DoorId | undefined) => !d || all || open.has(d),
    open,
    next: ready && !all ? nextDoor(open) : null,
    signals,
    ready,
    all,
    setAll,
    fresh,
    clearFresh,
  };
}
