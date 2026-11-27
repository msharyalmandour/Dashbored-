import { useCallback, useEffect, useSyncExternalStore } from "react";
import { supabase } from "../lib/supabaseClient";
import { getMyEmailStatus } from "../lib/supervisorEmail";
import { useAuth } from "../context/AuthContext";
import { allLessons, type AcademySignals, type Lesson, type LessonId } from "../data/academy";

/* «تعلّموا Wesync»: كل درس يكتمل من شغلكم الفعلي (القاعدة)، مو من ضغطة «فهمت».
   علامات الجهاز (localStorage) بس للأشياء اللي ما تنحفظ بالقاعدة، مثل فتح التقرير. */

const LOCAL = (uid: string) => `wesync.learn.${uid}`;
const ACTIVE = "wesync.learn.active";

const readSet = (k: string): Set<string> => {
  try {
    return new Set(JSON.parse(localStorage.getItem(k) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
};
const writeSet = (k: string, v: Set<string>) => {
  try {
    localStorage.setItem(k, JSON.stringify([...v]));
  } catch {
    // ما يهم
  }
};

const empty: AcademySignals = {
  avatar: false,
  push: false,
  chatMsg: false,
  teamJoined: false,
  topic: false,
  agent: false,
  paper: false,
  litRow: false,
  taskDone: false,
  chatTask: false,
  section: false,
  poll: false,
  supInvited: false,
  askOrBook: false,
  minutes: false,
  report: false,
};

interface State {
  signals: AcademySignals;
  loaded: boolean;
  /** الدرس اللي المرشد شغّال عليه الحين (لو فيه) */
  active: LessonId | null;
}

let state: State = {
  signals: empty,
  loaded: false,
  active: (() => {
    try {
      return (sessionStorage.getItem(ACTIVE) as LessonId | null) ?? null;
    } catch {
      return null;
    }
  })(),
};
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  emit();
};
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};

/** علامة محلية لدرس ما ينحفظ بالقاعدة (مثل فتح التقرير) */
export function markLearn(uid: string | undefined, id: LessonId) {
  if (!uid) return;
  const s = readSet(LOCAL(uid));
  if (s.has(id)) return;
  s.add(id);
  writeSet(LOCAL(uid), s);
  if (state.loaded) set({ signals: { ...state.signals, [id]: true } });
}

export function setActiveLesson(id: LessonId | null) {
  try {
    if (id) sessionStorage.setItem(ACTIVE, id);
    else sessionStorage.removeItem(ACTIVE);
  } catch {
    // ما يهم
  }
  set({ active: id });
}

const count = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
  try {
    const { count: c, error } = await q;
    return !error && (c ?? 0) > 0;
  } catch {
    return false;
  }
};

let inflight: Promise<void> | null = null;
let lastAt = 0;

async function load(uid: string, teamId: string | null, avatar: boolean) {
  const local = readSet(LOCAL(uid));
  const db = supabase;
  if (!db || !teamId) {
    set({ loaded: true, signals: { ...empty, avatar, ...Object.fromEntries([...local].map((k) => [k, true])) } });
    return;
  }
  const head = { count: "exact" as const, head: true };
  const [roster, push, chatMsg, chatTask, pollMine, voted, agent, paper, taskDone, ask, book, minutes, papersRes, project, sectionsRes, email] = await Promise.all([
    Promise.resolve(db.from("profiles").select("id", head).eq("team_id", teamId)).then(
      (r) => (r.error ? 0 : (r.count ?? 0)),
      () => 0,
    ),
    count(db.from("push_subscriptions").select("id", head).eq("profile_id", uid)),
    count(db.from("team_messages").select("id", head).eq("author_id", uid).eq("kind", "user").is("deleted_at", null)),
    count(db.from("team_messages").select("id", head).eq("author_id", uid).eq("ref_type", "task")),
    count(db.from("team_messages").select("id", head).eq("author_id", uid).eq("kind", "poll")),
    count(db.from("team_message_votes").select("message_id", head).eq("profile_id", uid)),
    count(db.from("ai_conversations").select("id", head).eq("user_id", uid)),
    count(db.from("evidence_papers").select("id", head).eq("added_by", uid)),
    count(db.from("tasks").select("id", head).eq("assignee_id", uid).eq("status", "done")),
    count(db.from("decision_requests").select("id", head).eq("created_by", uid)),
    count(db.from("meeting_bookings").select("id", head).eq("requested_by", uid)),
    count(db.from("meeting_minutes").select("id", head).eq("created_by", uid)),
    db.from("evidence_papers").select("country, aim, sample, data_collection").limit(200),
    db.from("research_projects").select("title").eq("team_id", teamId).maybeSingle(),
    db.from("proposal_sections").select("owner_id, content"),
    getMyEmailStatus().catch(() => null),
  ]);
  const papers = (papersRes.data ?? []) as { country: string | null; aim: string | null; sample: string | null; data_collection: string | null }[];
  const sections = (sectionsRes.data ?? []) as { owner_id: string | null; content: string | null }[];
  const written = sections.filter((s) => !!s.content?.trim());
  const mine = sections.some((s) => s.owner_id === uid);
  const signals: AcademySignals = {
    avatar,
    push,
    chatMsg,
    teamJoined: roster > 1,
    topic: !!(project.data as { title?: string } | null)?.title?.trim(),
    agent,
    paper,
    litRow: papers.some((p) => !!(p.country?.trim() || p.aim?.trim() || p.sample?.trim() || p.data_collection?.trim())),
    taskDone,
    chatTask,
    section: mine ? written.some((s) => s.owner_id === uid) : written.length > 0,
    poll: pollMine || voted,
    supInvited: !!email && (email.state === "pending" || email.state === "active") && !email.isTeamMember,
    askOrBook: ask || book,
    minutes,
    report: false,
  };
  for (const k of local) if (k in signals) signals[k as LessonId] = true;
  set({ signals, loaded: true });
}

/** يحسب الدروس من بيانات المستخدم/ة. refresh(force) يعيد الحساب (بحد أدنى 4 ثواني بين كل مرة) */
export function useAcademy() {
  const { currentUser, team, isLeader } = useAuth();
  const snap = useSyncExternalStore(subscribe, () => state);
  const uid = currentUser?.id;
  const teamId = team?.id ?? null;
  const avatar = !!currentUser?.avatar;

  const refresh = useCallback(
    (force = false) => {
      if (!uid) return Promise.resolve();
      if (inflight) return inflight;
      if (!force && Date.now() - lastAt < 4000) return Promise.resolve();
      lastAt = Date.now();
      inflight = load(uid, teamId, avatar).finally(() => {
        inflight = null;
      });
      return inflight;
    },
    [uid, teamId, avatar],
  );

  // الشخصية تتغيّر محليًا فورًا بدون ما نسأل القاعدة
  useEffect(() => {
    if (state.loaded && state.signals.avatar !== avatar) set({ signals: { ...state.signals, avatar } });
  }, [avatar]);

  const counts = (l: Lesson) => !l.leaderOnly || isLeader || snap.signals[l.id];
  const counted = allLessons.filter(counts);
  const done = counted.filter((l) => snap.signals[l.id]).length;
  const next = counted.find((l) => !snap.signals[l.id]) ?? null;

  return { ...snap, refresh, done, total: counted.length, next, isLeader, counts };
}
