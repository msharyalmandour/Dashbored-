import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Bell,
  Check,
  MapPin,
  FileText,
  ListChecks,
  MessageCircle,
  PartyPopper as PartyPopperIcon,
  Play,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
  Download,
  MessageSquareQuote,
  Hourglass,
} from "lucide-react";
import AgentWave from "../components/ui/AgentWave";
import ReceiptProof from "../components/sup/ReceiptProof";
import { ExtensionSheet, useTeamTime } from "../components/sup/StudentTime";
import clsx from "clsx";
import Avatar from "../components/ui/Avatar";
import Skeleton from "../components/ui/Skeleton";
import FileAttach, { type AttachedFileMeta } from "../components/FileAttach";
import ImproveWritingButton from "../components/ImproveWritingButton";
import TaskComments from "../components/TaskComments";
import ConfettiBurst from "../components/cinematic/ConfettiBurst";
import ThreeDotsMenu, { type ThreeDotsMenuItem } from "../components/ui/ThreeDotsMenu";
import Dialog from "../components/ui/Dialog";
import { evenPlan } from "../lib/taskBalance";
import { V3Glow, num } from "../components/v3/WriteHeader";
import { LuxHead, ReviewCard, Segmented } from "../components/lux/Lux";
import { SectionSwitch } from "../components/SectionTabs";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useTasksData } from "../hooks/useTasksData";
import { useTaskComments } from "../hooks/useTaskComments";
import { useEvidencePapers } from "../hooks/useEvidencePapers";
import { useProposal } from "../hooks/useProposal";
import { useResearchProject } from "../hooks/useResearchProject";
import { PLACES, inferPlace, placeByKey, placeOf, proofFor, strictReview, type PlaceKey, type Proof } from "../lib/taskLinks";
import type { Task, TaskPriority, TaskStatus } from "../data/types";
import { addDaysISO, daysUntil, formatDateShort } from "../lib/date";
import { groupByDue } from "../lib/taskGroups";
import { nextReminder, splitReminders } from "../lib/taskReminders";
import { playChime } from "../lib/sound";
import { tr } from "../lib/i18n";

const TASK_ATTACHMENTS_KEY = "nursync.taskAttachments";

function loadTaskAttachments(): Record<string, AttachedFileMeta> {
  try {
    const raw = localStorage.getItem(TASK_ATTACHMENTS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, AttachedFileMeta>) : {};
  } catch {
    return {};
  }
}

const celebrations = [
  tr("عاشت الأيادي!"),
  tr("خطوة قدام في بحثك 👏"),
  tr("تقدم ما ينكسر"),
  tr("أنت قدها وقدود!"),
];


const statusClass: Record<TaskStatus, string> = { todo: "todo", "in-progress": "doing", done: "done", overdue: "late" };
const statusLabel: Record<TaskStatus, string> = {
  todo: tr("ما بدأ"),
  "in-progress": tr("نشتغل عليه"),
  done: tr("خلصت"),
  overdue: tr("متأخرة"),
};

type FilterId = "all" | "mine" | "late" | "proof" | "done";
const filters: { id: FilterId; label: string }[] = [
  { id: "all", label: tr("الكل") },
  { id: "mine", label: tr("لي") },
  { id: "late", label: tr("متأخرة") },
  { id: "proof", label: tr("بدون دليل") },
  { id: "done", label: tr("خلصت") },
];


/** تاريخ اليوم بتوقيت الرياض (YYYY-MM-DD) */
const riyadhToday = () => new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);


/** «متأخرة يوم/يومين/3 أيام» */
function lateLabel(dueDate: string) {
  const n = -daysUntil(dueDate);
  if (n <= 0) return tr("متأخرة");
  if (n === 1) return tr("متأخرة يوم");
  if (n === 2) return tr("متأخرة يومين");
  return n <= 10 ? tr("متأخرة {0} أيام", num(n)) : tr("متأخرة {0} يوم", num(n));
}

function taskCount(n: number) {
  if (n === 0) return tr("ولا مهمة");
  if (n === 1) return tr("مهمة وحدة");
  return n <= 10 ? tr("{0} مهام", num(n)) : tr("{0} مهمة", num(n));
}

const ROW_COLS = "grid-cols-[32px_minmax(0,1fr)_44px] md:grid-cols-[44px_minmax(280px,1fr)_150px_130px_130px_40px] xl:grid-cols-[44px_minmax(320px,1fr)_170px_150px_140px_40px]";

export default function Tasks() {
  const { currentUser, isLeader, canWrite } = useAuth();
  const { roster } = useTeamRoster();
  const { tasks, loading, addTask, updateStatus, deleteTask, reassignTask } = useTasksData();
  // ربط المهام بالشغل: الدراسات وأقسام المقترح هي «الدليل» إن المهمة خلصت فعلًا
  const { papers } = useEvidencePapers();
  const { sections } = useProposal();
  const { project } = useResearchProject();
  const navigate = useNavigate();
  const [strict, setStrict] = useState<{ task: Task; proof: Proof } | null>(null);
  // طلب تمديد رسمي من المشرف/ة (SupExtM)
  const [extFor, setExtFor] = useState<Task | null>(null);
  const teamTime = useTeamTime();
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [balancing, setBalancing] = useState(false);
  const { comments, addComment } = useTaskComments();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [searchParams, setSearchParams] = useSearchParams();
  // ?new=1 (من البحث السريع Ctrl+K) يفتح نموذج مهمة جديدة مباشرة
  useEffect(() => {
    if (searchParams.get("new")) {
      setShowForm(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [formError, setFormError] = useState<string | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  // ?task=<id> (من تنبيهات الرئيسية والجرس) يفتح المهمة نفسها وينزل لها
  const [scrollToTaskId, setScrollToTaskId] = useState<string | null>(null);
  const [taskAttachments, setTaskAttachments] =
    useState<Record<string, AttachedFileMeta>>(loadTaskAttachments);

  const today = riyadhToday();
  const tomorrow = addDaysISO(today, 1);

  // التذكيرات («تذكير: …») تنشال من القائمة وتصير جرس على مهمتها الأصلية — البيانات نفسها ما تتغير
  const { visible, byTask } = useMemo(() => splitReminders(tasks), [tasks]);
  const taskOf = (id: string) => {
    if (visible.some((t) => t.id === id)) return id;
    for (const [orig, rs] of byTask) if (rs.some((r) => r.id === id)) return orig;
    return id;
  };

  useEffect(() => {
    const id = searchParams.get("task");
    if (id) {
      const target = taskOf(id);
      setFilter("all");
      setQuery("");
      setExpandedTaskId(target);
      setScrollToTaskId(target);
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams, byTask]);

  const attachToTask = (taskId: string, meta: AttachedFileMeta) => {
    setTaskAttachments((prev) => {
      const updated = { ...prev, [taskId]: meta };
      localStorage.setItem(TASK_ATTACHMENTS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    if (!justCompleted) return;
    const timer = setTimeout(() => setJustCompleted(false), 1000);
    return () => clearTimeout(timer);
  }, [justCompleted]);

  const isLate = (t: Task) => t.status !== "done" && (t.status === "overdue" || t.dueDate < today);

  // القائد يقدر يعطي نفسه مهمة كمان (أنا آخر القائمة)
  const assignableMembers = [...roster.filter((m) => m.id !== currentUser?.id), ...roster.filter((m) => m.id === currentUser?.id)];

  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeId: "",
    dueDate: addDaysISO(riyadhToday(), 7),
    priority: "medium" as TaskPriority,
    place: "" as PlaceKey | "",
  });
  const suggestedPlace = form.place ? null : placeByKey(inferPlace(form.title, form.description));

  const matches = (t: Task, f: FilterId) =>
    f === "all" ? true : f === "mine" ? t.assigneeId === currentUser?.id : f === "late" ? isLate(t) : f === "proof" ? t.status === "done" && proofOf(t)?.met === false : t.status === f;

  const counts = useMemo(
    () => Object.fromEntries(filters.map((f) => [f.id, visible.filter((t) => matches(t, f.id)).length])) as Record<FilterId, number>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible, currentUser, today],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return visible.filter(
      (t) => matches(t, filter) && (!q || t.title.toLowerCase().includes(q) || (t.description ?? "").toLowerCase().includes(q)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, filter, query, currentUser, today]);

  const groups = useMemo(() => groupByDue(filtered, today), [filtered, today]);

  useEffect(() => {
    if (!scrollToTaskId) return;
    const t = visible.find((x) => x.id === scrollToTaskId);
    if (t && !isLate(t) && t.status !== "done" && t.dueDate > addDaysISO(today, 7)) setOpenGroups((g) => ({ ...g, later: true }));
    if (t?.status === "done") setOpenGroups((g) => ({ ...g, done: true }));
    const el = document.getElementById(`task-${scrollToTaskId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setScrollToTaskId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToTaskId, visible, openGroups]);

  const memberById = (id: string) =>
    roster.find((m) => m.id === id) ?? {
      id,
      name: tr("عضو"),
      initials: tr("؟"),
      color: "brand",
    };
  const firstName = (id: string) => memberById(id).name.split(" ")[0];

  const handleAssign = async () => {
    const assigneeId = form.assigneeId || assignableMembers[0]?.id;
    if (!form.title.trim() || !assigneeId) return;
    const { error } = await addTask({
      title: form.title.trim(),
      description: form.description.trim(),
      assigneeId,
      dueDate: form.dueDate,
      priority: form.priority,
      sectionKey: form.place || null,
    });
    if (error) {
      setFormError(error);
      return;
    }
    setForm({ ...form, title: "", description: "", place: "" });
    setFormError(null);
    setShowForm(false);
  };

  const canToggleTask = (task: Task) => canWrite && (isLeader || task.assigneeId === currentUser?.id);

  const changeStatus = async (task: Task, nextStatus: TaskStatus) => {
    if (!canToggleTask(task)) return;
    await updateStatus(task.id, nextStatus);
    if (nextStatus === "done") {
      const line = celebrations[Math.floor(Math.random() * celebrations.length)];
      showToast({ title: line, desc: tr("أكملت: {0}", task.title), icon: PartyPopperIcon, tone: "amber" });
      playChime();
      setJustCompleted(true);
    }
  };

  const proofOf = (task: Task) => proofFor(task, { papers, sections });
  // الطالب الصارم: لو المهمة لها رقم (5 دراسات) والموجود أقل، نسأل قبل ما تنحسب خلصت
  const toggleDone = (task: Task) => {
    if (task.status !== "done") {
      const proof = proofOf(task);
      if (proof && !proof.met) {
        setStrict({ task, proof });
        return;
      }
    }
    return changeStatus(task, task.status === "done" ? "todo" : "done");
  };
  const review = useMemo(
    () => strictReview({ tasks: visible, papers, sections, deadline: project?.targetSubmissionDate, today, nameOf: (id) => roster.find((m) => m.id === id)?.name.split(" ")[0] ?? "" }),
    [visible, papers, sections, project?.targetSubmissionDate, today, roster],
  );


  // ── «ركّز على هذي اليوم»: أقرب مهمة متأخرة أو موعدها اليوم (مهامك أول) ──
  const open = visible.filter((t) => t.status !== "done").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const doneCount = visible.filter((t) => t.status === "done").length;
  const unprovenCount = visible.filter((t) => t.status === "done" && proofOf(t)?.met === false).length;
  const pct = visible.length ? Math.round((doneCount / visible.length) * 100) : 0;
  const lateCount = open.filter(isLate).length;
  const tomorrowCount = open.filter((t) => !isLate(t) && t.dueDate === tomorrow).length;

  // ── حمل الفريق: المهام المفتوحة لكل عضو ──
  const load = roster
    .map((m) => ({ member: m, open: open.filter((t) => t.assigneeId === m.id) }))
    .sort((a, b) => b.open.length - a.open.length);
  const maxLoad = Math.max(1, ...load.map((r) => r.open.length));
  const most = load[0];
  const least = load[load.length - 1];
  const imbalanced = load.length > 1 && most.open.length - least.open.length >= 2;
  const handOff = imbalanced
    ? [...most.open].filter((t) => !isLate(t)).sort((a, b) => b.dueDate.localeCompare(a.dueDate))[0] ?? most.open[most.open.length - 1]
    : undefined;

  const balanceMoves = isLeader ? evenPlan(open, roster.map((m) => m.id), today) : [];
  const applyBalance = async () => {
    setBalancing(true);
    let failed = 0;
    for (const m of balanceMoves) {
      const { error } = await reassignTask(m.task.id, m.to);
      if (error) failed++;
    }
    setBalancing(false);
    setBalanceOpen(false);
    showToast(
      failed
        ? { title: tr("ما قدرنا ننقل {0}", taskCount(failed)), desc: tr("جرّبوا مرة ثانية"), icon: ListChecks, tone: "rose" }
        : { title: tr("توزّعت المهام ✓"), desc: tr("انتقلت {0}", taskCount(balanceMoves.length)), icon: ListChecks, tone: "brand" },
    );
  };
  const reassign = async (task: Task, to: string) => {
    if (to === task.assigneeId) return;
    const { error } = await reassignTask(task.id, to);
    showToast(
      error
        ? { title: tr("ما قدرنا ننقل المهمة"), desc: error, icon: ListChecks, tone: "rose" }
        : { title: tr("انتقلت المهمة لـ{0}", firstName(to)), desc: task.title, icon: ListChecks, tone: "brand" },
    );
  };

  // ── التذكيرات الجاية ──

  const reminderBadge = (task: Task) => {
    const r = nextReminder(byTask.get(task.id), today);
    if (!r) return null;
    const when = r.dueDate === today ? tr("تذكير اليوم") : r.dueDate === tomorrow ? tr("تذكير بكرة") : tr("تذكير {0}", formatDateShort(r.dueDate));
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-[rgba(255,180,68,.3)] bg-white/[0.06] px-2 py-0.5 text-xs text-[#FFB444]">
        <Bell size={11} aria-hidden />
        {when}
      </span>
    );
  };

  const dueText = (t: Task) =>
    t.status !== "done" && isLate(t) ? (
      <span className="font-bold text-[#FF8A7A]">{lateLabel(t.dueDate)}</span>
    ) : (
      <span className="text-[var(--ws-c-text)]">
        {t.dueDate === today ? tr("اليوم") : t.dueDate === tomorrow ? tr("بكرة") : formatDateShort(t.dueDate)}
      </span>
    );

  const statusChip = (t: Task) => <span className={clsx("v3-st", statusClass[t.status])}>{statusLabel[t.status]}</span>;

  const renderRow = (task: Task, late: boolean) => {
    const assignee = memberById(task.assigneeId);
    const canToggle = canToggleTask(task);
    const taskComments = comments.filter((c) => c.taskId === task.id);
    const isExpanded = expandedTaskId === task.id;
    const reminders = (byTask.get(task.id) ?? []).slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const place = placeOf(task);
    const proof = proofOf(task);
    const sub = task.description;
    const menu: ThreeDotsMenuItem[] = [
      {
        label: isExpanded ? tr("اقفل التفاصيل") : taskComments.length ? tr("التعليقات ({0}) والمرفق", num(taskComments.length)) : tr("التعليقات والمرفق"),
        icon: MessageCircle,
        onClick: () => setExpandedTaskId(isExpanded ? null : task.id),
      },
    ];
    if (canToggle && task.status !== "in-progress" && task.status !== "done")
      menu.push({ label: tr("بدأنا فيها"), icon: Play, onClick: () => changeStatus(task, "in-progress") });
    if (canToggle)
      menu.push(
        task.status === "done"
          ? { label: tr("رجّعها ما خلصت"), icon: RotateCcw, onClick: () => toggleDone(task) }
          : { label: tr("علّمها خلصت"), icon: Check, onClick: () => toggleDone(task) },
      );
    if (canWrite && task.status !== "done")
      menu.push({ label: tr("تحتاجون وقت أكثر؟"), icon: Hourglass, onClick: () => setExtFor(task) });
    if (isLeader)
      menu.push({ label: tr("حذف المهمة"), confirmLabel: tr("تأكيد الحذف؟"), icon: Trash2, tone: "danger", onClick: () => deleteTask(task.id) });

    return (
      <div
        key={task.id}
        id={`task-${task.id}`}
        role="listitem"
        className={clsx(
          "scroll-mt-24 flex min-h-[64px] flex-col justify-center rounded-[18px] px-3 py-1.5 transition-colors sm:px-3.5",
          late || (task.status === "done" && proof?.met === false) ? "bg-[rgba(255,199,119,.035)] shadow-[inset_0_0_0_1px_rgba(255,199,119,.14)]" : "hover:bg-white/[0.03]",
          isExpanded && !late && "bg-white/[0.04]",
        )}
      >
        <div className={clsx("grid items-center gap-x-3", ROW_COLS)}>
          <button
            type="button"
            onClick={() => toggleDone(task)}
            disabled={!canToggle}
            data-learn="task-done"
            aria-label={task.status === "done" ? tr("إلغاء الإكمال") : tr("تعليم كمكتملة")}
            aria-pressed={task.status === "done"}
            className={clsx("v3-tap -m-2 grid h-11 w-11 place-items-center rounded-full", canToggle ? "cursor-pointer" : "cursor-default opacity-60")}
          >
            <span
              className="grid h-[26px] w-[26px] place-items-center rounded-[9px] transition-colors"
              style={
                task.status === "done"
                  ? proof?.met === false
                    ? { boxShadow: "0 0 0 2px #FFC777, 0 0 0 5px rgba(255,199,119,.14)", background: "rgba(255,199,119,.08)", color: "#FFC777" }
                    : { background: "#FFC777", color: "#2A1404" }
                  : task.status === "in-progress"
                    ? { boxShadow: "inset 0 0 0 1.6px #FF9A3C" }
                    : { boxShadow: `inset 0 0 0 1.6px ${late ? "#FF8A7A" : "rgba(255,255,255,.3)"}` }
              }
            >
              {task.status === "done" && <Check size={14} strokeWidth={3} />}
              {task.status === "in-progress" && <i className="block h-2.5 w-2.5 rounded-[3px] bg-[#FF9A3C]" />}
            </span>
          </button>

          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
              aria-expanded={isExpanded}
              className="flex min-h-[28px] w-full flex-wrap items-center gap-x-2 gap-y-1 text-start"
            >
              <span className={clsx("min-w-0 max-w-full truncate text-[15px] font-bold", task.status === "done" && "text-[var(--ws-c-muted)] line-through decoration-white/30")} dir="auto" title={task.title}>
                {task.title}
              </span>
              {task.priority === "high" && task.status !== "done" && <span className="v3-st late text-xs">{tr("أولوية عالية")}</span>}
              {reminderBadge(task)}
              {taskAttachments[task.id] && <FileText size={13} className="text-[var(--ws-c-muted)]" aria-label={tr("فيها مرفق")} />}
              {taskComments.length > 0 && (
                <span className="inline-flex items-center gap-0.5 text-xs text-[var(--ws-c-muted)]">
                  <MessageCircle size={12} aria-hidden />
                  {num(taskComments.length)}
                </span>
              )}
            </button>
            {(place || proof || task.dropId || task.source === "supervisor") && (
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {place && (
                  <Link to={place.route} className="tk-place" aria-label={tr("افتحوا مكان الشغل: {0}", place.label)}>
                    <MapPin size={13} aria-hidden />
                    {place.label}
                  </Link>
                )}
                {proof && (
                  <span className={clsx("tk-proof", proof.met ? "met" : task.status === "done" ? "warn" : "")}>
                    {task.status === "done" && !proof.met ? tr("خلصت بدون دليل · {0}", proof.label) : proof.label}
                  </span>
                )}
                {task.source === "supervisor" && (
                  <span className="tk-place tk-doc">
                    <MessageSquareQuote size={13} aria-hidden />
                    {tr("من الدكتورة")}
                  </span>
                )}
                {task.dropId && (
                  <Link to={`/drop?d=${task.dropId}`} className="tk-place tk-drop" aria-label={tr("افتحوا الرمية اللي طلعت منها المهمة")}>
                    <Download size={13} aria-hidden />
                    {tr("من رمية")}
                  </Link>
                )}
              </div>
            )}
            {sub && (
              <div className="v3-mut mt-0.5 truncate text-[13px]" dir="auto">
                {sub}
              </div>
            )}
            {/* الجوال: مين · الموعد · الحالة تحت العنوان */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] md:hidden">
              <span className="flex items-center gap-1.5">
                <Avatar initials={assignee.initials} color={assignee.color} size="sm" />
                {firstName(task.assigneeId)}
              </span>
              {dueText(task)}
              {statusChip(task)}
            </div>
          </div>

          <div className="hidden min-w-0 items-center gap-2 md:flex">
            <Avatar initials={assignee.initials} color={assignee.color} size="sm" />
            <span className="truncate text-[13px]">{firstName(task.assigneeId)}</span>
          </div>
          <div className="hidden text-[13px] md:block">{dueText(task)}</div>
          <div className="hidden md:block">{statusChip(task)}</div>
          <ThreeDotsMenu
            items={menu}
            buttonClassName="v3-tap grid h-11 w-11 place-items-center rounded-full text-[var(--ws-c-muted)] transition-colors hover:bg-white/[0.07] hover:text-[var(--ws-c-text)]"
          />
        </div>

        {isExpanded && (
          <div className="mt-3 flex flex-col gap-3 border-t border-white/[0.07] pt-3 md:ms-10">
            {task.commitmentId && <ReceiptProof task={task} />}
            {task.description && (
              <p className="m-0 whitespace-pre-wrap text-sm leading-7 text-[var(--ws-c-text)]" dir="auto">
                {task.description}
              </p>
            )}
            {reminders.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <Bell size={14} className="text-[#FFB444]" aria-hidden />
                <span className="v3-mut">{tr("تذكيرات هالمهمة:")}</span>
                {reminders.map((r) => (
                  <span key={r.id} className={clsx("v3-st", r.status === "done" || r.dueDate < today ? "todo" : "doing")}>
                    {r.dueDate === today ? tr("اليوم") : r.dueDate === tomorrow ? tr("بكرة") : formatDateShort(r.dueDate)}
                  </span>
                ))}
              </div>
            )}
            {isLeader && canWrite && task.status !== "done" && (
              <label className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="v3-mut">{tr("المسؤول:")}</span>
                <select value={task.assigneeId} onChange={(e) => reassign(task, e.target.value)} className="v3-select !min-h-[40px] !w-auto !py-1.5 [color-scheme:dark]" aria-label={tr("انقل المهمة لعضو ثاني")}>
                  {roster.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {taskAttachments[task.id] ? (
                <span className="flex items-center gap-1.5 text-[13px] text-[var(--ws-c-muted)]">
                  <FileText size={14} />
                  <bdi className="truncate">{taskAttachments[task.id].name}</bdi>
                </span>
              ) : canToggle ? (
                <FileAttach compact onAttach={(meta) => attachToTask(task.id, meta)} buttonClassName="v3-bd !min-h-[40px] !px-4 !text-[13px]" />
              ) : null}
            </div>
            <TaskComments
              comments={taskComments}
              memberById={memberById}
              canComment={canWrite}
              onSubmit={(body) => addComment(task.id, currentUser!.id, body)}
            />
          </div>
        )}
      </div>
    );
  };


  return (
    <div className="v3 relative">
      <V3Glow />

      {/* ── الترويسة (TasksLux): العنوان + تبويبات القسم + «مهمة جديدة» الزر البرتقالي الوحيد ── */}
      <LuxHead kicker={tr("شغل الفريق")} title={tr("مهامي")} sub={tr("كل اللي عليكم وعلى الفريق، مرتبة بالأقرب موعد")}>
        <SectionSwitch />
        {isLeader && canWrite && (
          <button type="button" onClick={() => setShowForm((s) => !s)} className="lx-go" aria-expanded={showForm}>
            <Plus size={18} aria-hidden />
            {tr("مهمة جديدة")}
          </button>
        )}
      </LuxHead>

      {/* ── إسناد مهمة جديدة (نفس الحقول ونفس الحفظ) ── */}
      {showForm && isLeader && canWrite && (
        <section className="v3-g v3-rise relative mb-5 p-5 sm:p-6" aria-labelledby="new-task-title">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            aria-label={tr("إغلاق")}
            className="v3-tap absolute end-3 top-3 grid h-11 w-11 place-items-center rounded-full text-[var(--ws-c-muted)] hover:text-[var(--ws-c-text)]"
          >
            <X size={18} />
          </button>
          <h2 id="new-task-title" className="v3-k m-0 mb-4 text-lg">
            {tr("إسناد مهمة جديدة")}
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1.5 block font-bold">{tr("عنوان المهمة")}</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={clsx("v3-field !py-2.5", !form.title && "v3-empty")}
                placeholder={tr("مثال: مراجعة الفصل الثالث")}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-bold">{tr("إسناد إلى")}</span>
              <select
                value={form.assigneeId || assignableMembers[0]?.id || ""}
                onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                className="v3-select w-full"
              >
                {assignableMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id === currentUser?.id ? tr("{0} (أنا)", m.name) : m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1.5 flex items-center justify-between font-bold">
                {tr("الوصف")}
                <ImproveWritingButton value={form.description} onImproved={(text) => setForm({ ...form, description: text })} />
              </span>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="v3-field"
                placeholder={tr("تفاصيل مختصرة عن المهمة")}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-bold">{tr("تاريخ الاستحقاق")}</span>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="v3-select w-full [color-scheme:dark]"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-bold">{tr("الأولوية")}</span>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
                className="v3-select w-full"
              >
                <option value="low">{tr("منخفضة")}</option>
                <option value="medium">{tr("متوسطة")}</option>
                <option value="high">{tr("عالية")}</option>
              </select>
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1.5 block font-bold">{tr("وين الشغل؟")}</span>
              <select value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value as PlaceKey | "" })} className="v3-select w-full">
                <option value="">{suggestedPlace ? tr("تلقائي: {0}", suggestedPlace.label) : tr("اختاروا المكان (يساعد الفريق يوصل للشغل بضغطة)")}</option>
                {PLACES.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {formError && (
            <p className="mt-3 rounded-2xl bg-[rgba(255,138,122,.13)] px-3 py-2 text-sm font-bold text-[#FF8A7A]" role="alert">
              {formError}
            </p>
          )}
          <button type="button" onClick={handleAssign} className="v3-bw mt-4">
            {tr("إسناد المهمة")}
          </button>
        </section>
      )}

      {/* ── الملخص: الحلقة + تحتاج دليل + متأخرة + موعد التسليم ── */}
      <section className="lx-card gold lx-in mb-[18px] grid grid-cols-3 items-start gap-y-4 px-4 py-[18px] lg:flex lg:items-center lg:px-[22px]" aria-label={tr("إنجاز المهام")}>
        <div className="col-span-3 flex items-center gap-4 lg:pe-[22px]">
          <div className="relative h-[92px] w-[92px] flex-none">
            <div className="v3-ring h-[92px] w-[92px]" style={{ ["--v3-target" as string]: `${pct}%` }} role="img" aria-label={tr("{0} من {1} خلصت", num(doneCount), num(visible.length))} />
            <div className="absolute inset-0 flex flex-col items-center justify-center leading-[1.1]" aria-hidden>
              <b className="text-[23px] font-extrabold text-[#EAE3DC]" dir="ltr">
                {num(doneCount)}/{num(visible.length)}
              </b>
              <span className="mt-1 text-[12px] text-[#ABA095]">{tr("خلصت")}</span>
            </div>
          </div>
          <div className="leading-[1.4]">
            <b className="text-[18px]">{visible.length && doneCount === visible.length ? tr("خلصتوا كل المهام") : tr("{0} باقية", num(visible.length - doneCount))}</b>
            <div className="text-[13px] font-bold text-[#FFC777]">
              {unprovenCount > 0 ? tr("بس {0} منها بدون دليل", num(unprovenCount)) : doneCount ? tr("كلها بدليل ✓") : tr("ابدأوا بأقرب موعد")}
            </div>
          </div>
        </div>
        <div className="lx-stat">
          <b dir="ltr" className="text-[#FFC777]">
            {num(unprovenCount)}
          </b>
          <div>{tr("تحتاج دليل")}</div>
          <small>{tr("الدكتورة تشوفها «بدون دليل»")}</small>
        </div>
        <div className="lx-stat">
          <b dir="ltr" className={lateCount ? "text-[#FF8A7A]" : "text-[#EAE3DC]"}>
            {num(lateCount)}
          </b>
          <div>{tr("متأخرة")}</div>
          <small>{lateCount ? (tomorrowCount ? tr("و{0} بكرة", num(tomorrowCount)) : tr("خلّصوها أول")) : tr("ممتاز، كملوا كذا")}</small>
        </div>
        <div className="lx-stat">
          <b dir="ltr" className={project?.targetSubmissionDate ? "text-[#EAE3DC]" : "text-[#ABA095]"}>
            {project?.targetSubmissionDate ? num(Math.max(0, daysUntil(project.targetSubmissionDate))) : "—"}
          </b>
          <div>{tr("موعد التسليم")}</div>
          <small>{project?.targetSubmissionDate ? tr("يوم · {0}", formatDateShort(project.targetSubmissionDate)) : tr("ما تحدد للحين")}</small>
        </div>
      </section>

      {/* ── الجدول: الفلاتر + البحث + المهام ── */}
      <section className="lx-card lx-in mb-[18px] px-2.5 pb-2.5 pt-4" aria-label={tr("كل المهام")}>
        <div className="flex flex-wrap items-center gap-3 px-2 pb-3.5">
          <Segmented label={tr("فلترة المهام")} value={filter} onChange={setFilter} items={filters.map((f) => ({ id: f.id, label: f.label, count: counts[f.id] }))} />
          <span className="flex-1" />
          <label className="lx-search">
            <Search size={16} className="shrink-0" aria-hidden />
            <span className="sr-only">{tr("ابحث في المهام")}</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr("ابحثوا في المهام…")} type="search" />
          </label>
        </div>
          {loading ? (
            <div className="flex flex-col gap-3 px-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="v3-k text-lg">
                {query.trim()
                  ? tr("ما لقينا مهمة بهالكلمة")
                  : filter === "mine"
                    ? tr("ما عليك مهام هنا")
                    : filter === "done"
                      ? tr("ولا مهمة خلصت بعد")
                      : filter === "late"
                        ? tr("ولا مهمة متأخرة")
                        : tr("ما فيه مهام مطابقة")}
              </div>
              <p className="v3-mut m-0 mt-1 text-sm">{filter === "mine" || filter === "late" ? tr("عاشت الأيادي 🎉") : tr("بهذا الفلتر حاليًا")}</p>
            </div>
          ) : (
            <>
              <div className={clsx("lx-th hidden gap-x-3.5 px-3.5 pb-2 md:grid", ROW_COLS)} aria-hidden>
                <span />
                <span>{tr("المهمة")}</span>
                <span>{tr("مين")}</span>
                <span>{tr("الموعد")}</span>
                <span>{tr("الحالة")}</span>
                <span />
              </div>
              <div role="list" className="flex flex-col gap-1">
                {groups.flatMap((g) => g.items.map((t) => renderRow(t, g.key === "overdue")))}
              </div>
            </>
          )}
      </section>

      {/* ── تحت: حمل الفريق + قبل لا تشوفها الدكتورة ── */}
      <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {!loading && <ReviewCard items={review} className="lg:order-1" />}
        <div className="lg:order-2">
          {/* حمل الفريق */}
          <section className="lx-card lx-in flex flex-col gap-3 p-[18px]" aria-labelledby="load-title">
            <div>
              <h2 id="load-title" className="v3-k m-0 text-base">
                {tr("حمل الفريق")}
              </h2>
            </div>
            {load.length === 0 ? (
              <p className="v3-mut m-0 text-sm">{tr("أول ما ينضم أعضاء، يطلع حمل كل واحد هنا.")}</p>
            ) : (
              load.map(({ member, open: mine }) => (
                <div key={member.id} className="flex items-center gap-2.5">
                  <Avatar initials={member.initials} color={member.color} size="sm" />
                  <span className="w-[56px] shrink-0 truncate text-sm">{member.name.split(" ")[0]}</span>
                  <div className="v3-bar flex-1" role="img" aria-label={tr("{0}: {1}", member.name, taskCount(mine.length))}>
                    <i
                      style={{
                        width: `${mine.length === 0 ? 0 : Math.max(8, (mine.length / maxLoad) * 100)}%`,
                        background:
                          imbalanced && member.id === most.member.id
                            ? "linear-gradient(90deg,#FF6B00,#FF8A7A)"
                            : "linear-gradient(90deg,#FF6B00,#FFD25A)",
                      }}
                    />
                  </div>
                  <span className="v3-mut w-[60px] shrink-0 text-end text-xs">{taskCount(mine.length)}</span>
                </div>
              ))
            )}
            {imbalanced && handOff ? (
              <div className="v3-g2 flex gap-2 !rounded-2xl px-3 py-2.5 text-[13px] leading-relaxed">
                <span className="v3-orb mt-0.5 h-4 w-4" aria-hidden />
                <span>
                  {most.member.id === currentUser?.id
                    ? tr("عليك {0}، و{1}: {2} بس. نعطي «{3}» لـ{1}؟", taskCount(most.open.length), least.member.name.split(" ")[0], taskCount(least.open.length), handOff.title)
                    : tr("{0}: {1}، و{2}: {3} بس. نعطي «{4}» لـ{2}؟", most.member.name.split(" ")[0], taskCount(most.open.length), least.member.name.split(" ")[0], taskCount(least.open.length), handOff.title)}
                </span>
              </div>
            ) : (
              load.length > 1 && <p className="v3-mut m-0 text-[13px]">{tr("الحمل متقارب بينكم ✓")}</p>
            )}
            {isLeader && canWrite && load.length > 1 && (
              <button type="button" className="v3-bd !text-sm" onClick={() => setBalanceOpen(true)}>
                <AgentWave size={15} />
                {tr("وزّعها بالتساوي")}
              </button>
            )}
          </section>

        </div>
      </div>

      <ConfettiBurst active={justCompleted} />
      <Dialog open={!!strict} onClose={() => setStrict(null)} title={tr("متأكدين إنها خلصت؟")}>
        {strict && (
          <div className="space-y-3">
            <p className="m-0 text-[15px] leading-relaxed" dir="auto">
              {tr("مهمة «{0}» تطلب {1}، والموجود فعلًا {2}.", strict.task.title, num(strict.proof.need), strict.proof.label)}
            </p>
            <p className="m-0 text-[13px] text-[#ABA095]">{tr("المشرف/ة يشوف التقدّم من شغلكم الفعلي. لو خلصتوها برا الموقع، أضيفوها هنا عشان تنحسب لكم.")}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                className="v3-bw"
                onClick={() => {
                  const to = placeOf(strict.task)?.route;
                  setStrict(null);
                  if (to) navigate(to);
                }}
              >
                {tr("أضيفوها الحين")}
              </button>
              <button
                type="button"
                className="v3-bd"
                onClick={() => {
                  const t = strict.task;
                  setStrict(null);
                  void changeStatus(t, "done");
                }}
              >
                {tr("خلصت على مسؤوليتي")}
              </button>
            </div>
          </div>
        )}
      </Dialog>
      {extFor && (
        <ExtensionSheet
          task={{ id: extFor.id, title: extFor.title, dueDate: extFor.dueDate || null }}
          fromSupervisor={extFor.source === "supervisor"}
          pendingFor={teamTime.extensions.find((e) => e.task_id === extFor.id && e.status === "pending") ?? null}
          onClose={() => setExtFor(null)}
          onSent={(m) => {
            setExtFor(null);
            showToast({ title: m, desc: tr("كل طلب ورد ينحفظ بسجل يشوفه الطرفين."), icon: Hourglass, tone: "brand" });
            void teamTime.reload();
          }}
        />
      )}
      <Dialog open={balanceOpen} onClose={() => setBalanceOpen(false)} title={tr("وزّعها بالتساوي")}>
        {balanceMoves.length === 0 ? (
          <p className="m-0 text-[15px]">{tr("الحمل متقارب بينكم، ما فيه شي يحتاج ينتقل ✓")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="v3-mut m-0 text-sm">{tr("هذا الاقتراح، وما يتغيّر شي إلا لما توافقون. المتأخرة واللي «قيد التنفيذ» تبقى عند أصحابها.")}</p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {balanceMoves.map((m) => (
                <li key={m.task.id} className="v3-g2 flex flex-wrap items-center gap-2 !rounded-2xl px-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 font-bold" dir="auto">
                    {m.task.title}
                  </span>
                  <span className="v3-mut whitespace-nowrap">
                    {firstName(m.from)} ← {firstName(m.to)}
                  </span>
                </li>
              ))}
            </ul>
            <button type="button" className="v3-bw" onClick={applyBalance} disabled={balancing}>
              {balancing ? tr("جاري النقل…") : tr("وافق وانقلها ({0})", num(balanceMoves.length))}
            </button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
