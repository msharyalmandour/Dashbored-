import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SupervisorEmailCard from "../components/SupervisorEmailCard";
import {
  AlertTriangle,
  BookOpenText,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  FlaskConical,
  MessageSquareText,
  ShieldCheck,
  Users,
} from "lucide-react";
import Logo from "../components/Logo";
import Avatar from "../components/ui/Avatar";
import { supabase } from "../lib/supabaseClient";
import { formatDateShort } from "../lib/date";
import type { AccentColor } from "../lib/colors";
import { buildSeen, diffSince, loadApproved, loadSeen, loadTeams, rememberTeam, saveApproved, saveSeen } from "../lib/supervisorLocal";

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
} | null;

interface ThreadMessage {
  id: string;
  sender: "supervisor" | "team";
  senderName: string;
  body: string;
  createdAt: string;
}

interface Snapshot {
  teamName: string;
  supervisorNote: string | null;
  supervisorNoteAt: string | null;
  members: SnapshotMember[];
  tasks: SnapshotTask[];
  proposalSections: SnapshotProposalSection[];
  methodology: SnapshotMethodology;
}

const statusStyle: Record<SnapshotTask["status"], string> = {
  todo: "text-sky-accent-600 bg-sky-accent-50",
  "in-progress": "text-amber-accent-600 bg-amber-accent-50",
  done: "text-brand-600 bg-brand-50",
  overdue: "text-rose-600 bg-rose-50",
};

const memberColors: AccentColor[] = ["brand", "amber-accent", "sky-accent"];

const statusLabel: Record<SnapshotTask["status"], string> = {
  todo: "لم يبدأ",
  "in-progress": "قيد التنفيذ",
  done: "مكتملة",
  overdue: "متأخرة",
};

const sectionStatusStyle: Record<SnapshotProposalSection["status"], string> = {
  "not-started": "text-brand-950/35 bg-surface-muted",
  "in-progress": "text-amber-accent-600 bg-amber-accent-50",
  done: "text-brand-600 bg-brand-50",
};

const sectionStatusLabel: Record<SnapshotProposalSection["status"], string> = {
  "not-started": "لم يبدأ",
  "in-progress": "قيد التنفيذ",
  done: "مكتملة",
};

function methodologyField(label: string, value: string | string[]) {
  const text = Array.isArray(value) ? value.join("، ") : value;
  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-3.5">
      <p className="text-xs font-bold text-brand-950/45">{label}</p>
      {text ? (
        <p className="mt-1 text-sm font-semibold text-brand-950">{text}</p>
      ) : (
        <p className="mt-1 text-sm italic text-brand-950/30">لم يُحدد بعد</p>
      )}
    </div>
  );
}

export default function SupervisorView() {
  const { token } = useParams<{ token: string }>();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [nameDraft, setNameDraft] = useState(() => {
    try {
      return localStorage.getItem("wesync-supervisor-name") ?? "";
    } catch {
      return "";
    }
  });
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteSent, setNoteSent] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [threadLoaded, setThreadLoaded] = useState(false);
  const [digestDismissed, setDigestDismissed] = useState(false);
  const [approved, setApproved] = useState<string[]>(() => (token ? loadApproved(token) : []));
  const [approvingKey, setApprovingKey] = useState<string | null>(null);

  const loadThread = useCallback(async () => {
    if (!supabase || !token) return;
    const { data } = await supabase.rpc("get_supervisor_thread", { p_token: token });
    if (Array.isArray(data)) {
      setThread(data as ThreadMessage[]);
      setThreadLoaded(true);
    }
  }, [token]);

  useEffect(() => {
    if (!supabase || !token) {
      setLoading(false);
      setError(
        !supabase
          ? "هذي الميزة تحتاج مشروع Supabase حقيقي متصل — غير متاحة بالعرض التجريبي."
          : "رابط غير صالح.",
      );
      return;
    }
    supabase
      .rpc("get_team_snapshot", { p_token: token })
      .then(({ data, error: rpcError }) => {
        if (rpcError || !data) {
          setError("الرابط غير صالح أو منتهي.");
        } else {
          setSnapshot(data as Snapshot);
        }
        setLoading(false);
      });
    loadThread();
    // نحدّث المحادثة كل نصف دقيقة عشان ترى ردود الفريق بدون ما تعيد فتح الرابط
    const timer = setInterval(loadThread, 30_000);
    return () => clearInterval(timer);
  }, [token, loadThread]);

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

  // لو ظلت الصفحة مفتوحة ٥ دقايق نعتبرها «مقروءة» حتى لو ما ضغطت الزر
  useEffect(() => {
    if (!token || !snapshot || !threadLoaded) return;
    const t = setTimeout(() => saveSeen(token, buildSeen(snapshot, thread.filter((m) => m.sender === "team").length)), 5 * 60_000);
    return () => clearTimeout(t);
  }, [token, snapshot, threadLoaded, thread]);

  const approveSection = async (key: string, label: string) => {
    if (!supabase || !token || approvingKey) return;
    setApprovingKey(key);
    const { error: rpcError } = await supabase.rpc("submit_supervisor_message", {
      p_token: token,
      p_body: `✅ اعتمدنا قسم «${label}» — تقدرون تكملون للي بعده.`,
      p_name: nameDraft.trim(),
    });
    setApprovingKey(null);
    if (rpcError) {
      setNoteError(rpcError.message.includes("rate limit") ? "أرسلتم رسائل كثيرة بوقت قصير — جرّبوا بعد شوي." : "ما انرسل الاعتماد — حاولوا مرة ثانية.");
      return;
    }
    const next = [...approved, key];
    setApproved(next);
    saveApproved(token, next);
    loadThread();
  };

  const submitNote = async () => {
    if (!supabase || !token || noteSubmitting) return;
    const body = noteDraft.trim();
    if (!body) return;
    setNoteSubmitting(true);
    setNoteError(null);
    const { error: rpcError } = await supabase.rpc("submit_supervisor_message", {
      p_token: token,
      p_body: body,
      p_name: nameDraft.trim(),
    });
    setNoteSubmitting(false);
    if (rpcError) {
      setNoteError(
        rpcError.message.includes("rate limit")
          ? "أرسلتم رسائل كثيرة بوقت قصير — جرّبوا بعد شوي."
          : "ما انرسلت الرسالة — تأكدوا من الرابط وحاولوا مرة ثانية.",
      );
      return;
    }
    try {
      if (nameDraft.trim()) localStorage.setItem("wesync-supervisor-name", nameDraft.trim());
    } catch {
      // ما يهم
    }
    setNoteDraft("");
    setNoteSent(true);
    setTimeout(() => setNoteSent(false), 2500);
    loadThread();
  };

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-brand-50 via-paper to-paper px-4 py-10">
        <div className="mx-auto max-w-3xl animate-pulse">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-brand-100" />
              <div className="h-4 w-20 rounded bg-brand-100" />
            </div>
            <div className="h-7 w-24 rounded-full bg-brand-100" />
          </div>
          <div className="h-28 rounded-3xl bg-brand-100" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-brand-100" />
            ))}
          </div>
          <div className="mt-4 h-40 rounded-3xl bg-brand-100" />
          <div className="mt-4 h-52 rounded-3xl bg-brand-100" />
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gradient-to-b from-brand-50 via-paper to-paper px-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-500">
          <AlertTriangle size={22} />
        </span>
        <p className="max-w-sm text-sm font-semibold text-brand-950/60">{error}</p>
      </div>
    );
  }

  const done = snapshot.tasks.filter((t) => t.status === "done").length;
  const total = snapshot.tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const overdue = snapshot.tasks.filter((t) => t.status === "overdue").length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-brand-50 via-paper to-paper px-4 py-10">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-accent-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-40 h-64 w-64 rounded-full bg-brand-200/25 blur-3xl" />

      <div className="relative mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-2xl bg-gradient-to-br from-amber-accent-300 to-brand-400 p-[1.5px]">
              <div className="rounded-[0.9rem] bg-paper p-1">
                <Logo size={28} />
              </div>
            </div>
            <span className="font-display text-base font-extrabold text-brand-950">Wesync</span>
          </div>
          <div className="flex items-center gap-2">
            {loadTeams().length > 1 && (
              <Link to="/supervisor" className="rounded-full border border-brand-100 bg-paper px-3 py-1.5 text-xs font-bold text-brand-700 shadow-sm shadow-brand-950/5 hover:bg-brand-50">
                فرقي ({loadTeams().length})
              </Link>
            )}
            <span className="flex items-center gap-1.5 rounded-full border border-brand-100 bg-paper px-3 py-1.5 text-xs font-bold text-brand-950/55 shadow-sm shadow-brand-950/5">
              <ShieldCheck size={13} className="text-brand-500" />
              تقرير قراءة فقط
            </span>
          </div>
        </div>

        <nav aria-label="أقسام التقرير" className="sticky top-2 z-20 -mx-1 mb-4 flex gap-2 overflow-x-auto rounded-full border border-brand-100/70 bg-paper/85 p-1.5 shadow-sm shadow-brand-950/5 backdrop-blur-xl">
          {[
            ["sv-summary", "الملخص"],
            ["sv-tasks", "المهام"],
            ["sv-proposal", "المقترح"],
            ...(snapshot.methodology ? [["sv-methodology", "المنهجية"]] : []),
            ["sv-chat", "راسلوا الفريق"],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold text-brand-950/60 hover:bg-brand-50 hover:text-brand-900"
            >
              {label}
            </a>
          ))}
        </nav>

        {seenBefore && !digestDismissed && digest && (
          <div className="mb-4 rounded-3xl border border-amber-accent-200/70 bg-amber-accent-50/70 p-5">
            <p className="text-xs font-extrabold text-amber-accent-700">منذ زيارتكم الأخيرة ({formatDateShort(seenBefore.at)})</p>
            {digest.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {digest.slice(0, 8).map((line, i) => (
                  <li key={i} className="text-sm font-semibold text-brand-950/80">• {line}</li>
                ))}
                {digest.length > 8 && <li className="text-xs text-brand-950/50">و{digest.length - 8} تغييرات ثانية</li>}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-brand-950/60">ما تغيّر شي من زيارتكم الأخيرة.</p>
            )}
            <button onClick={markSeen} className="mt-3 rounded-full bg-amber-accent-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-accent-600">
              تم الاطلاع
            </button>
          </div>
        )}

        <div id="sv-summary" className="scroll-mt-16 rounded-[2rem] bg-gradient-to-br from-amber-accent-300 via-brand-300 to-amber-accent-400 p-[1.5px] shadow-lg shadow-brand-950/10">
          <div className="relative overflow-hidden rounded-[calc(2rem-1.5px)] bg-paper p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-accent-100/60 blur-2xl" />
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-accent-300/60 bg-amber-accent-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber-accent-700">
                <FlaskConical size={11} />
                تقرير متابعة فريق البحث
              </span>
              <h1 className="mt-3 font-display text-2xl font-extrabold text-brand-950 sm:text-3xl">
                {snapshot.teamName}
              </h1>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-center">
                  <p className="font-display text-3xl font-extrabold text-brand-950">{pct}%</p>
                  <p className="mt-1 text-xs font-semibold text-brand-950/50">نسبة إنجاز المهام</p>
                </div>
                <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-center">
                  <p className="font-display text-3xl font-extrabold text-brand-950">
                    {done}
                    <span className="text-base font-medium text-brand-950/40"> / {total}</span>
                  </p>
                  <p className="mt-1 text-xs font-semibold text-brand-950/50">مهام مكتملة</p>
                </div>
                <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-center">
                  <p className="font-display text-3xl font-extrabold text-brand-950">{overdue}</p>
                  <p className="mt-1 text-xs font-semibold text-brand-950/50">مهام متأخرة</p>
                </div>
              </div>

              <div className="mt-8">
                <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-brand-950/80">
                  <Users size={14} className="text-brand-500" />
                  أعضاء الفريق ({snapshot.members.length})
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {snapshot.members.map((m, i) => (
                    <span
                      key={m.name}
                      className="flex items-center gap-2 rounded-full border border-brand-100 bg-paper py-1 pe-3 ps-1 text-xs font-semibold text-brand-950/75 shadow-sm shadow-brand-950/5"
                    >
                      <Avatar initials={m.initials} color={memberColors[i % memberColors.length]} size="sm" />
                      {m.name}
                      {m.role === "leader" && (
                        <span className="text-amber-accent-600"> · قائد الفريق</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              <div id="sv-tasks" className="mt-8 scroll-mt-16">
                <p className="mb-3 text-sm font-bold text-brand-950/80">المهام</p>
                <ul className="divide-y divide-brand-50">
                  {snapshot.tasks.map((t, i) => (
                    <li key={i} className="flex items-center gap-3 py-3">
                      {t.status === "done" ? (
                        <CheckCircle2 size={16} className="shrink-0 text-brand-500" />
                      ) : t.status === "overdue" ? (
                        <AlertTriangle size={16} className="shrink-0 text-rose-500" />
                      ) : t.status === "in-progress" ? (
                        <Clock size={16} className="shrink-0 text-amber-accent-500" />
                      ) : (
                        <Circle size={16} className="shrink-0 text-brand-950/25" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-950">
                        {t.title}
                      </span>
                      <span className="whitespace-nowrap text-xs text-brand-950/40">
                        {t.assigneeName ?? ""}
                        {t.dueDate ? ` — ${formatDateShort(t.dueDate)}` : ""}
                      </span>
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[t.status]}`}
                      >
                        {statusLabel[t.status]}
                      </span>
                    </li>
                  ))}
                  {snapshot.tasks.length === 0 && (
                    <p className="py-6 text-center text-sm text-brand-950/40">ما فيه مهام مسجّلة بعد</p>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div id="sv-proposal" className="mt-4 scroll-mt-16 rounded-3xl border border-brand-100/70 bg-paper p-6 shadow-sm shadow-brand-950/5 sm:p-8">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-brand-950/80">
            <BookOpenText size={14} className="text-brand-500" />
            المقترح البحثي
          </p>
          <ul className="divide-y divide-brand-50">
            {snapshot.proposalSections.map((s) => (
              <li key={s.key} className="py-3">
                <div className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 text-sm font-semibold text-brand-950">
                    {s.labelAr}
                    <span className="ms-1.5 text-xs font-normal text-brand-950/40">{s.labelEn}</span>
                  </span>
                  <span
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${sectionStatusStyle[s.status]}`}
                  >
                    {sectionStatusLabel[s.status]}
                  </span>
                  {s.status === "done" &&
                    (approved.includes(s.key) ? (
                      <span className="whitespace-nowrap rounded-full bg-brand-500 px-2.5 py-1 text-xs font-bold text-white">معتمد ✓</span>
                    ) : (
                      <button
                        onClick={() => approveSection(s.key, s.labelAr)}
                        disabled={approvingKey === s.key}
                        className="whitespace-nowrap rounded-full border border-brand-300 px-2.5 py-1 text-xs font-bold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
                      >
                        اعتماد
                      </button>
                    ))}
                </div>
                {s.content ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-brand-950/65">{s.content}</p>
                ) : (
                  <p className="mt-2 text-sm italic text-brand-950/30">لم يُكتب بعد</p>
                )}
              </li>
            ))}
            {snapshot.proposalSections.length === 0 && (
              <p className="py-6 text-center text-sm text-brand-950/40">ما فيه مقترح بحثي مسجّل بعد</p>
            )}
          </ul>
        </div>

        {snapshot.methodology && (
          <div id="sv-methodology" className="mt-4 scroll-mt-16 rounded-3xl border border-brand-100/70 bg-paper p-6 shadow-sm shadow-brand-950/5 sm:p-8">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-brand-950/80">
              <FlaskConical size={14} className="text-brand-500" />
              المنهجية
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {methodologyField("تصميم الدراسة", snapshot.methodology.studyDesign)}
              {methodologyField("مكان الدراسة", snapshot.methodology.studySetting)}
              {methodologyField("مجتمع الدراسة", snapshot.methodology.population)}
              {methodologyField("حجم العينة", snapshot.methodology.sampleSize)}
              {methodologyField("أسلوب اختيار العينة", snapshot.methodology.samplingTechnique)}
              {methodologyField("معايير الاشتمال", snapshot.methodology.samplingInclusion)}
              {methodologyField("معايير الاستبعاد", snapshot.methodology.samplingExclusion)}
              {methodologyField("طريقة جمع البيانات", snapshot.methodology.dataCollectionMethods)}
              {methodologyField("إجراء جمع البيانات", snapshot.methodology.dataCollectionProcedure)}
              {methodologyField("تحليل البيانات", snapshot.methodology.dataAnalysis)}
              {methodologyField("الاعتبارات الأخلاقية", snapshot.methodology.ethicalConsiderations)}
              {methodologyField("أداة الدراسة", snapshot.methodology.studyToolName)}
            </div>
          </div>
        )}

        {token && <SupervisorEmailCard token={token} />}

        <div id="sv-chat" className="mt-4 scroll-mt-16 rounded-3xl border border-brand-100/70 bg-paper p-6 shadow-sm shadow-brand-950/5 sm:p-8">
          <p className="flex items-center gap-1.5 text-sm font-bold text-brand-950/80">
            <MessageSquareText size={15} className="text-brand-500" />
            محادثتكم مع الفريق
          </p>
          <p className="mt-1 text-xs text-brand-950/40">
            رسائلكم توصل للفريق كتنبيه بلوحتهم، وردودهم تظهر هنا. كل الرسائل محفوظة — ما تنمسح برسالة جديدة.
          </p>

          {thread.length > 0 && (
            <ul className="mt-4 max-h-96 space-y-2.5 overflow-y-auto pe-1">
              {thread.map((m) => {
                const mine = m.sender === "supervisor";
                return (
                  <li key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                        mine ? "bg-brand-500/10 text-brand-950" : "border border-brand-100 bg-surface-muted text-brand-950"
                      }`}
                    >
                      <p className="text-[11px] font-bold text-brand-950/45">
                        {mine ? m.senderName || "أنتم" : m.senderName ? `الفريق — ${m.senderName}` : "الفريق"}
                        <span className="ms-2 font-medium">{formatDateShort(m.createdAt.slice(0, 10))}</span>
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            maxLength={80}
            placeholder="اسمكم (اختياري) — مثل: د. نورة"
            className="mt-4 w-full rounded-2xl border border-brand-100 px-3.5 py-2.5 text-sm text-brand-950 outline-none placeholder:text-brand-950/30 focus:border-brand-300"
          />
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            rows={3}
            maxLength={1500}
            placeholder="مثال: راجعوا صياغة الفجوة البحثية قبل الاجتماع الجاي، وركّزوا على ربطها بالهدف."
            className="mt-2 w-full rounded-2xl border border-brand-100 px-3.5 py-3 text-sm text-brand-950 outline-none placeholder:text-brand-950/30 focus:border-brand-300"
          />
          {noteError && <p className="mt-2 text-xs font-semibold text-rose-600">{noteError}</p>}
          <button
            onClick={submitNote}
            disabled={noteSubmitting || !noteDraft.trim()}
            className="mt-3 flex items-center gap-2 rounded-xl bg-gradient-to-l from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-brand-500/30 hover:from-brand-600 hover:to-brand-700 disabled:opacity-50"
          >
            {noteSent ? <Check size={15} /> : null}
            {noteSubmitting ? "..." : noteSent ? "تم الإرسال" : "إرسال للفريق"}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-brand-950/35">
          مشاركة من فريق البحث عبر Wesync — رابط قراءة فقط
        </p>
      </div>
    </div>
  );
}
