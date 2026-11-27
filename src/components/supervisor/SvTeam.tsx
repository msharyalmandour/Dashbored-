import { useRef, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import SvCommitments from "../sup/SvCommitments";
import { SvTimePanel } from "../sup/SvTime";
import { useMeetLive } from "../meet/MeetLive";
import { isEn, tr, trx } from "../../lib/i18n";
import { Link } from "react-router-dom";
import { AlertTriangle, Check, ChevronLeft, ChevronRight, FileText, FlaskConical, Gauge, Inbox, ListChecks, MessageSquareText, Settings2, ShieldCheck, Users, Video } from "lucide-react";
import { useSupervisorBoard } from "./useSupervisorBoard";
import { SvAvatar, SvSetupSheet, SvSetupStrip, SvWaiting, relTime } from "./SvParts";
import type { SectionComment } from "./SvSheets";
import { SvDocSheet, SvNoteSheet, type DocRow, type ThreadMessage } from "./SvSheets";
import { TYPE_LABEL } from "../v3/WriteHeader";
import { supabase } from "../../lib/supabaseClient";
import { daysUntil, formatDateFull, formatDateShort, relativeDayLabel } from "../../lib/date";
import { getSupervisorEmailStatus, type EmailStatus } from "../../lib/supervisorEmail";
import { buildSeen, diffSince, loadApproved, loadSeen, rememberTeam, saveApproved, saveSeen } from "../../lib/supervisorLocal";
import type { ResearchType } from "../../data/types";
import { proofProgress, unprovenDone, type Dash } from "../../lib/supervisorDash";

interface SnapshotTask {
  title: string;
  status: "todo" | "in-progress" | "done" | "overdue";
  dueDate: string | null;
  assigneeName: string | null;
}

interface SnapshotMember {
  name: string;
  initials: string;
  role: string;
  lastActiveAt?: string | null;
}

interface SnapshotProposalSection {
  key: string;
  labelAr: string;
  labelEn: string;
  status: "not-started" | "in-progress" | "done";
  content: string;
}

type SnapshotMethodology = {
  studyDesign: string;
  studySetting: string;
  population: string;
  samplingInclusion: string[];
  samplingExclusion: string[];
  sampleSize: string;
  samplingTechnique: string;
  dataCollectionMethods: string[];
  dataCollectionProcedure: string;
  dataAnalysis: string;
  ethicalConsiderations: string;
  studyToolType: string;
  studyToolName: string;
  updatedAt?: string | null;
} | null;

interface Snapshot {
  teamName: string;
  supervisorNote: string | null;
  supervisorNoteAt: string | null;
  members: SnapshotMember[];
  tasks: SnapshotTask[];
  proposalSections: SnapshotProposalSection[];
  methodology: SnapshotMethodology;
  // حقول العرض الجديدة (get_team_snapshot v2) — اختيارية عشان الصفحة ما تنكسر لو الدالة أقدم
  project?: { title: string; description: string; researchType: ResearchType; startDate: string | null; targetSubmissionDate: string | null; createdAt: string } | null;
  proposalUpdatedAt?: string | null;
  ethics?: { stepsDone: number; principles: number; attachments: number; outcome: string | null; updatedAt: string | null } | null;
}

const filled = (v: unknown) => (Array.isArray(v) ? v.length > 0 : !!v && !!String(v).trim());
/** نفس METHOD_READY بالتطبيق (7 أجزاء) على شكل بيانات التقرير */
const methodReady = (m: SnapshotMethodology) =>
  m
    ? [m.studyDesign, m.studySetting, m.population, filled(m.samplingInclusion) && filled(m.sampleSize) && filled(m.samplingTechnique), m.dataCollectionMethods, m.dataAnalysis, m.ethicalConsiderations].filter(filled).length
    : 0;

/** يعزل اسم (ممكن يكون إنجليزي) داخل جملة عربية عشان ترتيب الكلام ما يتلخبط */
const iso = (s: string) => `\u2068${s}\u2069`;
const isLate = (t: SnapshotTask) => t.status === "overdue" || (t.status !== "done" && !!t.dueDate && daysUntil(t.dueDate) < 0);
const byDue = (a: SnapshotTask, b: SnapshotTask) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999");
const studentsLabel = (n: number) => (n === 1 ? tr("طالب واحد") : n === 2 ? tr("طالبين") : n <= 10 ? tr("{0} طلاب", n) : tr("{0} طالب", n));
const lateLabel = (n: number) => (n <= 1 ? tr("متأخرة يوم") : n === 2 ? tr("متأخرة يومين") : n <= 10 ? tr("متأخرة {0} أيام", n) : tr("متأخرة {0} يوم", n));
const OUTCOME: Record<string, string> = { pending: tr("بانتظار اللجنة"), approved: tr("معتمدة"), rejected: tr("مرفوضة"), modifications: tr("مطلوب تعديلات") };

type TaskFilter = "next" | "late" | "done" | "all";
type DocKind = "proposal" | "methodology" | "ethics";

function Ring({ pct }: { pct: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="sv-ring" role="img" aria-label={tr("{0}% من المهام خلصت", pct)}>
      <svg viewBox="0 0 96 96" aria-hidden>
        <defs>
          <linearGradient id="svRingG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFB547" />
            <stop offset="1" stopColor="#FF6A00" />
          </linearGradient>
        </defs>
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="9" />
        <circle className="arc" cx="48" cy="48" r={r} fill="none" stroke="url(#svRingG)" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} style={{ "--sv-c": c } as CSSProperties} />
      </svg>
      <b>
        {pct}
        <small>%</small>
      </b>
    </div>
  );
}

/** صفحة الفريق داخل لوحة المشرفة: كل اللي تحتاجه عن فريق واحد (الطلبات، الوضع، المستندات، الرسائل).
    openTarget من الإيميل: minutes:<id> / decision:<id> / booking:<id> / thread:0 — نفتح الطلب نفسه */
export default function SvTeam({
  token,
  openTarget,
  nameDraft,
  setNameDraft,
  onBack,
  onToast,
  onChanged,
}: {
  token: string;
  openTarget: string;
  nameDraft: string;
  setNameDraft: (v: string) => void;
  onBack: () => void;
  onToast: (msg: string) => void;
  onChanged: () => void;
}) {
  const [comments, setComments] = useState<SectionComment[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [threadLoaded, setThreadLoaded] = useState(false);
  const [digestDismissed, setDigestDismissed] = useState(false);
  const [approved, setApproved] = useState<string[]>(() => (token ? loadApproved(token) : []));
  const [approvingKey, setApprovingKey] = useState<string | null>(null);
  const [email, setEmail] = useState<EmailStatus | null>(null);
  const [sheet, setSheet] = useState<null | "setup" | "note" | DocKind>(null);
  const [filter, setFilter] = useState<TaskFilter>("next");
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [leaving, setLeaving] = useState<string[]>([]);
  const setToast = onToast;
  const [confirmAll, setConfirmAll] = useState(false);
  // التقدّم «بالدليل» نفس لوحة المشرفة (المهمة «خلصت» بدون دليلها ما تنحسب)
  const [dash, setDash] = useState<Dash | null>(null);
  useEffect(() => {
    if (!token || !supabase) return;
    let alive = true;
    void supabase.rpc("supervisor_dash", { p_token: token }).then(({ data, error }) => {
      if (alive && !error && data) setDash(data as Dash);
    });
    return () => {
      alive = false;
    };
  }, [token]);
  // إيصال ينتظر «تمام»: هو البرتقالي الوحيد بالشاشة، والشريط السفلي يصير كريمي
  const [receiptPending, setReceiptPending] = useState(false);
  const { board, busy, error: boardError, load: loadBoard, run, saveAvailability } = useSupervisorBoard(token, nameDraft);

  // فتح الطلب اللي جت منه من الإيميل: ننزل له ونبرزه، أو نفتح الرسائل
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || !openTarget || !board) return;
    opened.current = true;
    const [kind, id] = openTarget.split(":");
    if (kind === "thread") {
      setSheet("note");
      return;
    }
    if (kind === "setup") {
      setSheet("setup");
      return;
    }
    const el = document.getElementById(`sv-open-${kind}-${id}`) ?? document.getElementById("sv-h-wait");
    if (!el) return;
    setTimeout(() => {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.classList.add("sv-flash");
      setTimeout(() => el.classList.remove("sv-flash"), 2200);
    }, 300);
  }, [openTarget, board]);

  const loadThread = useCallback(async () => {
    if (!supabase || !token) return;
    const { data } = await supabase.rpc("get_supervisor_thread", { p_token: token });
    if (Array.isArray(data)) {
      setThread(data as ThreadMessage[]);
      setThreadLoaded(true);
    }
  }, [token]);

  // ملاحظاتها السابقة على نص المقترح (قبل تشغيل ملف SQL الجديد ترجع فاضية)
  const loadComments = useCallback(async () => {
    if (!supabase || !token) return;
    const { data, error: e } = await supabase.rpc("supervisor_section_comments", { p_token: token });
    if (!e && Array.isArray(data)) setComments(data as SectionComment[]);
  }, [token]);
  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const addComment = async (key: string, _label: string, quote: string, body: string) => {
    if (!supabase || !token) return false;
    const { error: e } = await supabase.rpc("supervisor_add_section_comment", { p_token: token, p_section_key: key, p_quote: quote, p_body: body, p_name: nameDraft.trim() });
    if (e) {
      setNoteError(tr("ما انحفظت الملاحظة — حاولوا مرة ثانية."));
      return false;
    }
    setNoteError(null);
    await loadComments();
    return true;
  };

  const loadEmail = useCallback(async () => {
    if (token) setEmail(await getSupervisorEmailStatus(token));
  }, [token]);

  useEffect(() => {
    if (!supabase || !token) {
      setLoading(false);
      setError(!supabase ? tr("هذي الميزة تحتاج مشروع Supabase حقيقي متصل — غير متاحة بالعرض التجريبي.") : tr("رابط غير صالح."));
      return;
    }
    supabase.rpc("get_team_snapshot", { p_token: token }).then(({ data, error: rpcError }) => {
      if (rpcError || !data) setError(tr("الرابط غير صالح أو منتهي."));
      else setSnapshot(data as Snapshot);
      setLoading(false);
    });
    loadThread();
    loadEmail();
    // نحدّث المحادثة كل نصف دقيقة عشان ترى ردود الفريق بدون ما تعيد فتح الرابط
    const timer = setInterval(loadThread, 30_000);
    return () => clearInterval(timer);
  }, [token, loadThread, loadEmail]);

  // نحفظ الفريق بقائمة «فرقي» على جهاز المشرف/ة
  useEffect(() => {
    if (token && snapshot) rememberTeam(token, snapshot.teamName);
  }, [token, snapshot]);

  const teamMsgCount = threadLoaded ? thread.filter((m) => m.sender === "team").length : null;
  // آخر مرة شافت فيها المشرفة التقرير — تُلتقط مرة وحدة وقت فتح الصفحة
  const [seenBefore] = useState(() => (token ? loadSeen(token) : null));
  const digest = snapshot && seenBefore && !digestDismissed ? diffSince(seenBefore, snapshot, teamMsgCount) : null;

  const markSeen = () => {
    if (token && snapshot) saveSeen(token, buildSeen(snapshot, teamMsgCount ?? seenBefore?.teamMsgCount ?? 0));
    setDigestDismissed(true);
  };

  // أول زيارة: نحفظ نقطة المقارنة فورًا عشان الزيارة الجاية يكون فيها «وش تغيّر»
  useEffect(() => {
    if (token && snapshot && threadLoaded && !seenBefore) saveSeen(token, buildSeen(snapshot, thread.filter((m) => m.sender === "team").length));
  }, [token, snapshot, threadLoaded, seenBefore, thread]);

  // لو ظلت الصفحة مفتوحة 5 دقايق نعتبرها «مقروءة» حتى لو ما ضغطت الزر
  useEffect(() => {
    if (!token || !snapshot || !threadLoaded) return;
    const t = setTimeout(() => saveSeen(token, buildSeen(snapshot, thread.filter((m) => m.sender === "team").length)), 5 * 60_000);
    return () => clearTimeout(t);
  }, [token, snapshot, threadLoaded, thread]);

  const sendMessage = async (body: string) => {
    if (!supabase || !token || !body.trim()) return false;
    setNoteError(null);
    const { error: rpcError } = await supabase.rpc("submit_supervisor_message", { p_token: token, p_body: body, p_name: nameDraft.trim() });
    if (rpcError) {
      setNoteError(rpcError.message.includes("rate limit") ? tr("أرسلتم رسائل كثيرة بوقت قصير — جرّبوا بعد شوي.") : tr("ما انرسلت الرسالة — تأكدوا من الرابط وحاولوا مرة ثانية."));
      return false;
    }
    try {
      if (nameDraft.trim()) localStorage.setItem("wesync-supervisor-name", nameDraft.trim());
    } catch {
      // ما يهم
    }
    loadThread();
    return true;
  };

  const approveSection = async (key: string, label: string) => {
    if (!supabase || !token || approvingKey) return;
    setApprovingKey(key);
    const { error: rpcError } = await supabase.rpc("submit_supervisor_message", {
      p_token: token,
      p_body: tr("✅ اعتمدنا قسم «{0}» — تقدرون تكملون للي بعده.", label),
      p_name: nameDraft.trim(),
    });
    setApprovingKey(null);
    if (rpcError) {
      setNoteError(rpcError.message.includes("rate limit") ? tr("أرسلتم رسائل كثيرة بوقت قصير — جرّبوا بعد شوي.") : tr("ما انرسل الاعتماد — حاولوا مرة ثانية."));
      return;
    }
    const next = [...approved, key];
    setApproved(next);
    saveApproved(token, next);
    setToast(tr("تم الاعتماد ✓"));
    loadThread();
  };

  /** ردّ على طلب: ينفّذ، يخفي الكرت بحركة ناعمة، وبعدها يحدّث اللوحة */
  const respond = async (key: string, fn: string, args: Record<string, unknown>, msg: string) => {
    const ok = await run(key, fn, args, false);
    if (!ok) return false;
    setLeaving((l) => [...l, key]);
    setToast(msg);
    setTimeout(async () => {
      await loadBoard();
      setLeaving((l) => l.filter((k) => k !== key));
      onChanged();
    }, 420);
    return true;
  };

  const bulkCount = board ? board.waiting.minutes.length + board.waiting.bookings.length : 0;
  const approveAll = async () => {
    if (!board) return;
    if (!confirmAll) {
      setConfirmAll(true);
      setTimeout(() => setConfirmAll(false), 4000);
      return;
    }
    setConfirmAll(false);
    let n = 0;
    for (const m of board.waiting.minutes) {
      if (await run(m.id, "supervisor_resolve_minutes", { p_minutes_id: m.id, p_decision: "approved", p_note: "" }, false)) {
        n++;
        setLeaving((l) => [...l, m.id]);
      }
    }
    for (const b of board.waiting.bookings) {
      if (await run(b.id, "supervisor_respond_booking", { p_id: b.id, p_decision: "confirm", p_note: "" }, false)) {
        n++;
        setLeaving((l) => [...l, b.id]);
      }
    }
    if (n) setToast(n === 1 ? tr("تم الاعتماد ✓") : tr("تم اعتماد {0} طلبات ✓", n));
    setTimeout(async () => {
      await loadBoard();
      setLeaving([]);
      onChanged();
    }, 420);
  };

  const view = useMemo(() => {
    if (!snapshot) return null;
    const tasks = snapshot.tasks;
    const done = tasks.filter((t) => t.status === "done");
    const late = tasks.filter(isLate);
    const pct = tasks.length ? Math.round((done.length / tasks.length) * 100) : 0;
    const p = snapshot.project ?? null;
    const daysLeft = p?.targetSubmissionDate ? daysUntil(p.targetSubmissionDate) : null;
    const start = p?.startDate ?? p?.createdAt?.slice(0, 10) ?? null;
    let expected: number | null = null;
    if (start && p?.targetSubmissionDate) {
      const span = daysUntil(p.targetSubmissionDate, new Date(start + "T00:00:00"));
      const passed = -daysUntil(start);
      if (span > 0) expected = Math.max(0, Math.min(100, Math.round((passed / span) * 100)));
    }
    const doneBy = new Map<string, number>();
    for (const t of done) if (t.assigneeName) doneBy.set(t.assigneeName, (doneBy.get(t.assigneeName) ?? 0) + 1);
    return { tasks, done, late, pct, project: p, daysLeft, expected, doneBy };
  }, [snapshot]);

  const backBtn = (
    <button type="button" className="sd-open" style={{ justifySelf: "start", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={onBack}>
      {/* الأسهم تنعكس تلقائيًا بالإنجليزي (index.css) */}
      <ChevronRight size={16} aria-hidden />
      {tr("كل الفرق")}
    </button>
  );

  if (loading) {
    return (
      <div className="animate-pulse" style={{ display: "grid", gap: 18 }} role="status" aria-label={tr("لحظة…")}>
        {backBtn}
        <div className="sup-skel" style={{ height: 120 }} />
        <div className="sup-skel" style={{ height: 220 }} />
      </div>
    );
  }

  if (error || !snapshot || !view) {
    return (
      <div style={{ display: "grid", gap: 18 }}>
        {backBtn}
        <section className="sd-glass" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-[rgba(255,138,122,.12)] text-[#FF8A7A]">
            <AlertTriangle size={22} />
          </span>
          <p className="m-0 text-[15px] font-bold text-[#E9D3B8]">{error}</p>
        </section>
      </div>
    );
  }

  const { tasks, done, late, project, daysLeft, expected, doneBy } = view;
  const unproven = dash && dash.tasks.length === tasks.length ? unprovenDone(dash) : [];
  const pct = unproven.length && dash ? proofProgress(dash).pct : view.pct;
  const leader = snapshot.members.find((m) => m.role === "leader") ?? snapshot.members[0];
  const leaderFirst = leader?.name.trim().split(/\s+/)[0] ?? "";
  const nameDone = nameDraft.trim().length > 0;
  const emailDone = email?.state === "active";
  const timesDone = !!board?.availability?.windows.length;
  const setupFirst = !seenBefore && !nameDone && !emailDone && !timesDone;
  const waitingCount = board ? board.waiting.minutes.length + board.waiting.decisions.length + board.waiting.bookings.length : 0;

  // جملة الملخص من الأرقام
  let say = tr("ماشين زين.");
  let why = expected !== null ? tr("خلّصوا {0}% من المهام، والمتوقع لهالوقت حوالي {1}%.", pct, expected) : tr("خلّصوا {0} من {1} مهمة.", done.length, tasks.length);
  if (tasks.length === 0) {
    say = tr("ما بدأوا يوزّعون المهام.");
    why = tr("أول ما يضيفون مهام تشوفون تقدّمهم هنا.");
  } else if (late.length > 0) {
    const oldest = [...late].sort(byDue)[0];
    say = late.length === 1 ? tr("فيه مهمة متأخرة.") : tr("فيه {0} مهام متأخرة.", late.length);
    why = oldest.assigneeName ? tr("أقدمها «{0}» عند {1}.", iso(oldest.title), iso(oldest.assigneeName.trim().split(/\s+/)[0])) : tr("أقدمها «{0}».", oldest.title);
  } else if (unproven.length > 0) {
    // «خلصت» بس الدليل ناقص: نقولها للمشرفة بهدوء ومعها المثال
    const u = unproven[0];
    say = unproven.length === 1 ? tr("مهمة معلّمة «خلصت» ودليلها ناقص.") : tr("{0} مهام معلّمة «خلصت» ودليلها ناقص.", unproven.length);
    why = u.task.assigneeName ? tr("مثل «{0}» عند {1}: {2}.", iso(u.task.title), iso(u.task.assigneeName.trim().split(/\s+/)[0]), u.label) : tr("مثل «{0}»: {1}.", iso(u.task.title), u.label);
  } else if (expected !== null && pct < expected - 5) {
    say = tr("بداية بطيئة.");
  } else if (done.length === tasks.length) {
    // كل المهام خلصت ومافي جاية: نقولها صريح بدل «ماشين زين»
    say = tr("خلّصوا كل مهامهم.");
    why = tr("ما فيه مهمة جاية محددة — يمكن يحتاجون الخطوة الجاية منكم.");
  }

  // المهام حسب الفلتر
  const upcoming = tasks.filter((t) => t.status !== "done" && !isLate(t)).sort(byDue);
  const lists: Record<TaskFilter, SnapshotTask[]> = {
    next: upcoming,
    late: [...late].sort(byDue),
    done: [...done].sort((a, b) => byDue(b, a)),
    all: [...tasks].sort(byDue),
  };
  const shown = showAllTasks ? lists[filter] : lists[filter].slice(0, 5);
  const memberIndex = new Map(snapshot.members.map((m, i) => [m.name, i]));

  // المستندات
  // «مكتمل» بدون نص ما ينحسب ولا ينطلب اعتماده (ما فيه شي تقراه)
  const secDone = snapshot.proposalSections.filter((s) => s.status === "done" && s.content.trim().length > 0);
  const proposalWaiting = secDone.some((s) => !approved.includes(s.key));
  const mReady = methodReady(snapshot.methodology);
  const docs: { kind: DocKind; icon: typeof FileText; label: string; x: number; y: number; at: string | null | undefined; waiting?: boolean }[] = [
    { kind: "proposal", icon: FileText, label: tr("المقترح البحثي"), x: secDone.length, y: snapshot.proposalSections.length || 7, at: snapshot.proposalUpdatedAt, waiting: proposalWaiting },
    { kind: "methodology", icon: FlaskConical, label: tr("المنهجية"), x: mReady, y: 7, at: snapshot.methodology?.updatedAt },
    { kind: "ethics", icon: ShieldCheck, label: tr("الموافقة الأخلاقية"), x: snapshot.ethics?.stepsDone ?? 0, y: 4, at: snapshot.ethics?.updatedAt },
  ];
  const m = snapshot.methodology;
  const docRows: Record<DocKind, DocRow[]> = {
    proposal: snapshot.proposalSections.map((s) => ({ key: s.key, label: s.labelAr, en: s.labelEn, status: s.status, content: s.content })),
    methodology: m
      ? [
          [tr("تصميم الدراسة"), m.studyDesign],
          [tr("مكان الدراسة"), m.studySetting],
          [tr("مجتمع الدراسة"), m.population],
          [tr("حجم العينة"), m.sampleSize],
          [tr("أسلوب اختيار العينة"), m.samplingTechnique],
          [tr("معايير الاشتمال"), m.samplingInclusion],
          [tr("معايير الاستبعاد"), m.samplingExclusion],
          [tr("طريقة جمع البيانات"), m.dataCollectionMethods],
          [tr("إجراء جمع البيانات"), m.dataCollectionProcedure],
          [tr("تحليل البيانات"), m.dataAnalysis],
          [tr("الاعتبارات الأخلاقية"), m.ethicalConsiderations],
          [tr("أداة الدراسة"), m.studyToolName],
        ].map(([label, v], i) => ({ key: String(i), label: label as string, content: Array.isArray(v) ? v.join(tr("، ")) : ((v as string) ?? "") }))
      : [],
    ethics: snapshot.ethics
      ? [
          { key: "steps", label: tr("خطوات النموذج"), content: tr("{0} من 4 خطوات مكتملة", snapshot.ethics.stepsDone) },
          { key: "principles", label: tr("المبادئ الأخلاقية"), content: tr("{0} من 13 بند مجاوب", snapshot.ethics.principles) },
          { key: "attachments", label: tr("المرفقات"), content: tr("{0} من 5 مرفقات جاهزة", snapshot.ethics.attachments) },
          { key: "outcome", label: tr("قرار اللجنة"), content: snapshot.ethics.outcome && !(snapshot.ethics.outcome === "pending" && snapshot.ethics.stepsDone < 4) ? (OUTCOME[snapshot.ethics.outcome] ?? snapshot.ethics.outcome) : tr("ما انرفع للجنة بعد") },
        ]
      : [],
  };
  const docTitle: Record<DocKind, string> = { proposal: tr("المقترح البحثي"), methodology: tr("المنهجية"), ethics: tr("الموافقة الأخلاقية") };

  const title = project?.title?.trim() ?? "";
  const hasArabic = /[؀-ۿ]/.test(title);
  const en = project?.description && /[A-Za-z]/.test(project.description) && !/[؀-ۿ]/.test(project.description) ? project.description : "";
  const typeLabel = project?.researchType ? TYPE_LABEL[project.researchType as Exclude<ResearchType, "">]?.[isEn ? 1 : 0] : "";
  const setupStrip = <SvSetupStrip nameDone={nameDone} emailDone={emailDone} timesDone={timesDone} onOpen={() => setSheet("setup")} />;

  return (
    <div className="sv-team">
      {backBtn}

      {/* رأس الفريق: الاسم والموضوع وأزرار الفريق */}
      <section className="sd-glass sv-team-head" aria-labelledby="sv-team-h">
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <p className="m-0 text-[13px] font-bold text-[#ffb547]">
              {leaderFirst ? trx("فريق {0} · {1}", <bdi key="l">{leaderFirst}</bdi>, studentsLabel(snapshot.members.length)) : studentsLabel(snapshot.members.length)}
            </p>
            <h1 id="sv-team-h" className="m-0 text-[26px] font-extrabold leading-snug text-[#f4f0ec]">
              <bdi>{snapshot.teamName}</bdi>
            </h1>
            {title && (
              <h2 className="sv-topic-t" style={{ margin: "8px 0 0" }} dir={hasArabic ? "rtl" : "auto"}>
                {title}
              </h2>
            )}
            {en && <div className="sv-topic-en">{en}</div>}
            {(typeLabel || daysLeft !== null) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {typeLabel && <span className="sv-chip">{trx("بحث {0}", typeLabel)}</span>}
                {daysLeft !== null && (
                  <span className="sv-chip" style={{ color: daysLeft < 0 ? "#FF8A7A" : "#FFC777" }}>
                    {daysLeft < 0 ? tr("فات موعد التسليم") : trx("التسليم بعد {0} يوم", <span key="d" className="sv-num">{daysLeft}</span>)}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="sv-team-acts">
            <button type="button" className={receiptPending ? "sup-btn-cream" : "sv-btn orange"} onClick={() => setSheet("note")} aria-haspopup="dialog">
              <MessageSquareText size={16} aria-hidden />
              {tr("ملاحظة للفريق")}
            </button>
            {bulkCount > 0 && (
              <button type="button" className="sd-open" onClick={approveAll} disabled={!!busy}>
                {confirmAll ? tr("متأكدين؟ اعتمدوا {0}", bulkCount) : tr("اعتمدوا الكل")}
              </button>
            )}
            <Link to={`/supervisor/${token}/report`} className="sd-open" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <FileText size={15} aria-hidden />
              {tr("التقرير")}
            </Link>
            <button type="button" className="sd-open" style={{ display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => setSheet("setup")} aria-haspopup="dialog">
              <Settings2 size={15} aria-hidden />
              {tr("الإعداد")}
            </button>
          </div>
        </div>
      </section>

      {setupFirst && setupStrip}
        {digest && digest.length > 0 && (
          <section className="sd-glass">
            <p className="sv-kind m-0">{trx("من زيارتكم الأخيرة ({0})", formatDateShort(seenBefore!.at))}</p>
            <ul className="m-0 mt-2 list-none space-y-1 p-0 text-[14px] text-[#D9D0C6]">
              {digest.slice(0, 5).map((line, k) => (
                <li key={k}>• {line}</li>
              ))}
              {digest.length > 5 && <li className="text-[12px] text-[#b8ada2]">{tr("و{0} تغييرات ثانية", digest.length - 5)}</li>}
            </ul>
            <button className="sv-more" onClick={markSeen}>
              <Check size={14} />
              {tr("تم الاطلاع")}
            </button>
          </section>
        )}


      {/* إيصالات طلباتها + أثر ملاحظاتها + سجل الوعود */}
      <SvCommitments token={token} name={nameDraft.trim()} teamName={snapshot.teamName} openTarget={openTarget} onToast={setToast} onPending={setReceiptPending} />

      <div className="sv-team-cols">
        <div className="sv-team-col">
        {/* 4) تنتظركم */}
        <section className="sv-sec sd-glass" aria-labelledby="sv-h-wait">
          <h2 id="sv-h-wait" className="sv-h">
            <Inbox size={19} />
            {tr("تنتظركم")}
            {waitingCount > 0 && <span className="sv-count">{waitingCount}</span>}
          </h2>
          {board ? <SvWaiting board={board} busy={busy} error={boardError} leaving={leaving} respond={respond} /> : <div className="h-12 animate-pulse rounded-2xl bg-white/5" />}
        </section>


          <SvTimePanel token={token} name={nameDraft.trim()} openTarget={openTarget} primary={!receiptPending && waitingCount === 0} onToast={setToast} />

        {/* 8) المهام */}
        <section className="sv-sec" aria-labelledby="sv-h-tasks">
          <h2 id="sv-h-tasks" className="sv-h">
            <ListChecks size={19} />
            {tr("المهام")}
          </h2>
          <div className="sv-chips" role="group" aria-label={tr("فلترة المهام")}>
            {(
              [
                ["next", tr("الجاية")],
                ["late", tr("متأخرة · {0}", late.length)],
                ["done", tr("خلصت · {0}", done.length)],
                ["all", tr("الكل")],
              ] as [TaskFilter, string][]
            ).map(([k, label]) => (
              <button key={k} aria-pressed={filter === k} onClick={() => { setFilter(k); setShowAllTasks(false); }}>
                {label}
              </button>
            ))}
          </div>
          <div className="sd-glass !py-1.5">
            {shown.length === 0 && <p className="m-0 py-5 text-center text-[14px] text-[#b8ada2]">{filter === "late" ? tr("ما فيه مهام متأخرة ✓") : filter === "done" ? tr("ما خلصت مهام للحين") : tr("ما فيه مهام جاية")}</p>}
            {shown.map((t, k) => {
              const lateT = isLate(t);
              const d = t.dueDate ? daysUntil(t.dueDate) : null;
              const soon = !lateT && t.status !== "done" && d !== null && d >= 0 && d <= 3;
              const who = t.assigneeName?.trim();
              return (
                <div key={t.title + k} className="sv-task">
                  <span className={`sv-box${t.status === "done" ? " done" : lateT ? " late" : ""}`} aria-label={t.status === "done" ? tr("خلصت") : lateT ? tr("متأخرة") : tr("ما خلصت")} role="img">
                    {t.status === "done" && <Check size={14} strokeWidth={3} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`sv-tt${t.status === "done" ? " done" : ""}`}>{t.title}</div>
                    <div className="sv-tm">
                      {who && (
                        <>
                          <SvAvatar sm name={who} i={memberIndex.get(t.assigneeName ?? "") ?? 0} />
                          <span>{who.split(/\s+/)[0]}</span>
                        </>
                      )}
                      {who && t.dueDate && <span aria-hidden>·</span>}
                      {t.dueDate && <span>{formatDateShort(t.dueDate)}</span>}
                    </div>
                  </div>
                  {lateT && d !== null && <span className="sv-badge late">{lateLabel(-d)}</span>}
                  {soon && t.dueDate && <span className="sv-badge soon">{relativeDayLabel(t.dueDate)}</span>}
                </div>
              );
            })}
          </div>
          {!showAllTasks && lists[filter].length > 5 && (
            <button className="sv-all" onClick={() => setShowAllTasks(true)}>
              {tr("شوفوا كل المهام ({0})", lists[filter].length)}
            </button>
          )}
        </section>

        </div>
        <div className="sv-team-col">
        {/* 5) وضع الفريق */}
        <section className="sv-sec" aria-labelledby="sv-h-status">
          <h2 id="sv-h-status" className="sv-h">
            <Gauge size={19} />
            {tr("وضع الفريق")}
          </h2>
          <div className="sd-glass">
            <div className="flex items-center gap-4">
              <Ring pct={pct} />
              <div className="min-w-0">
                <p className="sv-say">{say}</p>
                <p className="sv-why">{why}</p>
              </div>
            </div>
            <div className="sv-stats">
              <div>
                <span className="sv-num">
                  {done.length - unproven.length}/{tasks.length}
                </span>
                <p>{unproven.length ? tr("خلصت بدليل") : tr("مهام خلصت")}</p>
              </div>
              <div>
                <span className={`sv-num${late.length ? " red" : ""}`}>{late.length}</span>
                <p>{tr("متأخرة")}</p>
              </div>
              <div>
                <span className="sv-num">{daysLeft === null ? "—" : Math.max(0, daysLeft)}</span>
                <p>{tr("يوم للتسليم")}</p>
              </div>
            </div>
            {(board?.lastMeeting?.total || board?.upcoming.length) ? (
              <p className="sv-foot m-0">
                {board?.lastMeeting && board.lastMeeting.total > 0 && trx("آخر اجتماع ({0}): {1} من {2} بنود منجزة.", formatDateShort(board.lastMeeting.meetingDate), <b key="a">{board.lastMeeting.done}</b>, board.lastMeeting.total)}
                {board?.upcoming[0] && <> {trx("الاجتماع الجاي: {0} · {1}", formatDateFull(board.upcoming[0].date), <span key="t" className="sv-num">{board.upcoming[0].time}</span>)}</>}
              </p>
            ) : null}
          </div>
        </section>


          <SvMeetCard token={token} />

        {/* 6) الفريق */}
        <section className="sv-sec" aria-labelledby="sv-h-team">
          <h2 id="sv-h-team" className="sv-h">
            <Users size={19} />
            {tr("الفريق")}
          </h2>
          <div className="sd-glass !py-1.5">
            {snapshot.members.map((mem, k) => {
              const share = done.length ? Math.round(((doneBy.get(mem.name) ?? 0) / done.length) * 100) : 0;
              const activeToday = mem.lastActiveAt ? new Date(mem.lastActiveAt).toDateString() === new Date().toDateString() : false;
              return (
                <div key={mem.name + k} className="sv-mem">
                  <SvAvatar name={mem.name} initials={mem.initials} i={k} active={mem.lastActiveAt === undefined ? null : activeToday} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">
                      <span className="sv-mn">{mem.name.trim()}</span>
                      {mem.role === "leader" && <span className="sv-lead">{tr("القائد")}</span>}
                    </div>
                    {mem.lastActiveAt !== undefined && <div className="sv-ms">{mem.lastActiveAt ? tr("آخر نشاط {0}", relTime(mem.lastActiveAt)) : tr("ما دخل للحين")}</div>}
                    <div className="mt-2 flex items-center gap-2.5">
                      <div className="sv-bar flex-1" role="img" aria-label={tr("مساهمته {0}% من المنجز", share)}>
                        <span style={{ width: `${share}%` }} />
                      </div>
                      <span className="sv-pct">{share}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 7) المستندات */}
        <section className="sv-sec" aria-labelledby="sv-h-docs">
          <h2 id="sv-h-docs" className="sv-h">
            <FileText size={19} />
            {tr("المستندات")}
          </h2>
          <div className="sd-glass !py-1.5">
            {docs.map((d) => {
              const Icon = d.icon;
              return (
                <button key={d.kind} className="sv-doc" onClick={() => setSheet(d.kind)} aria-haspopup="dialog">
                  <span className="sv-di">
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block">
                      <span className="sv-dt">{d.label}</span>
                      {d.waiting && <span className="sv-wait">{tr("بانتظار اعتمادك")}</span>}
                    </span>
                    <span className="sv-dm block">
                      {trx("{0} من {1} أقسام", <span key="x" className="sv-num">{d.x}</span>, <span key="y" className="sv-num">{d.y}</span>)}
                      {d.at ? ` · ${relTime(d.at)}` : ""}
                    </span>
                    <span className="sv-bar block">
                      <span style={{ width: `${d.y ? Math.round((d.x / d.y) * 100) : 0}%` }} />
                    </span>
                  </span>
                  <ChevronLeft size={18} className="flex-none text-[#b8ada2]" />
                </button>
              );
            })}
          </div>
        </section>

          {!setupFirst && setupStrip}
        </div>
      </div>

      {sheet === "setup" && token && (
        <SvSetupSheet token={token} name={nameDraft} onNameChange={setNameDraft} email={email} onEmailChanged={loadEmail} availability={board?.availability ?? null} busy={busy} error={boardError} save={saveAvailability} onClose={() => setSheet(null)} />
      )}
      {sheet === "note" && <SvNoteSheet thread={thread} name={nameDraft} onNameChange={setNameDraft} send={sendMessage} error={noteError} onClose={() => setSheet(null)} />}
      {(sheet === "proposal" || sheet === "methodology" || sheet === "ethics") && (
        <SvDocSheet
          title={docTitle[sheet]}
          rows={docRows[sheet]}
          approved={approved}
          approvingKey={approvingKey}
          onApprove={sheet === "proposal" ? approveSection : undefined}
          comments={sheet === "proposal" ? comments : undefined}
          onComment={sheet === "proposal" ? addComment : undefined}
          send={sendMessage}
          error={noteError}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

/** اجتماع فيديو مع الفريق: يدخل برابطه بدون حساب. لو الفريق داخل يقول له */
function SvMeetCard({ token }: { token: string }) {
  const s = useMeetLive(token);
  if (s && !s.configured) return null;
  const live = !!s?.live;
  return (
    <section className={live ? "mt-strip-live" : "sd-glass"} style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <span className="sup-ic" aria-hidden>
        <Video size={16} />
      </span>
      <div style={{ flex: 1, minWidth: 0, lineHeight: 1.4 }}>
        <b style={{ display: "block", fontSize: 15 }}>{live ? tr("الفريق في اجتماع الحين") : tr("اجتماع فيديو مع الفريق")}</b>
        <span style={{ fontSize: 12, color: "#E9D3B8" }}>{live ? tr("{0} داخلين", s!.names.filter(Boolean).slice(0, 3).join(tr("، ")) || s!.count) : tr("تدخلون برابطكم بدون حساب، وما ينسجل فيديو.")}</span>
      </div>
      <Link to={`/supervisor/${token}/meet`} className="sup-btn-cream" style={{ display: "flex", alignItems: "center", padding: "0 16px", minHeight: 44, flex: "none" }}>
        {tr("ادخلوا")}
      </Link>
    </section>
  );
}
