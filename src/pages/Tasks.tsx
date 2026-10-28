import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Bell,
  Check,
  FileText,
  LayoutGrid,
  List,
  MessageCircle,
  PartyPopper as PartyPopperIcon,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import clsx from "clsx";
import Avatar from "../components/ui/Avatar";
import Skeleton from "../components/ui/Skeleton";
import FileAttach, { type AttachedFileMeta } from "../components/FileAttach";
import ImproveWritingButton from "../components/ImproveWritingButton";
import TaskComments from "../components/TaskComments";
import ConfettiBurst from "../components/cinematic/ConfettiBurst";
import TasksKanban from "../components/TasksKanban";
import ThreeDotsMenu, { type ThreeDotsMenuItem } from "../components/ui/ThreeDotsMenu";
import { V3Glow, num } from "../components/v3/WriteHeader";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useTasksData } from "../hooks/useTasksData";
import { useTaskComments } from "../hooks/useTaskComments";
import { proposalSections } from "../data/mockData";
import type { Task, TaskPriority, TaskStatus } from "../data/types";
import { addDaysISO, daysUntil, formatDateShort } from "../lib/date";
import { groupByDue, type DueGroup } from "../lib/taskGroups";
import { nextReminder, splitReminders } from "../lib/taskReminders";
import { openAgent } from "../lib/agentBus";
import { playChime } from "../lib/sound";
import { isEn, tr } from "../lib/i18n";

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

const sectionLabel: Record<string, string> = Object.fromEntries(
  proposalSections.map((s) => [s.key, isEn ? s.labelEn : s.labelAr]),
);

const statusClass: Record<TaskStatus, string> = { todo: "todo", "in-progress": "doing", done: "done", overdue: "late" };
const statusLabel: Record<TaskStatus, string> = {
  todo: tr("ما بدأ"),
  "in-progress": tr("نشتغل عليه"),
  done: tr("خلصت"),
  overdue: tr("متأخرة"),
};

type FilterId = "all" | "mine" | "late" | "in-progress" | "done";
const filters: { id: FilterId; label: string }[] = [
  { id: "all", label: tr("الكل") },
  { id: "mine", label: tr("مهامي") },
  { id: "late", label: tr("متأخرة") },
  { id: "in-progress", label: tr("نشتغل عليها") },
  { id: "done", label: tr("خلصت") },
];

const GROUP_DOT: Record<DueGroup<Task>["key"], string> = {
  overdue: "#FF8A7A",
  soon: "#FFB444",
  week: "#F6F1EC",
  later: "rgba(255,255,255,.3)",
  done: "#7FE0A6",
};

/** تاريخ اليوم بتوقيت الرياض (YYYY-MM-DD) */
const riyadhToday = () => new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);

const rise = (i: number) => ({ ["--v3-i" as string]: i }) as CSSProperties;

/** «متأخرة يوم/يومين/٣ أيام» */
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

const ROW_COLS = "grid-cols-[28px_minmax(0,1fr)_44px] md:grid-cols-[28px_minmax(0,1fr)_120px_110px_130px_44px]";

export default function Tasks() {
  const { currentUser, isLeader, canWrite } = useAuth();
  const { roster } = useTeamRoster();
  const { tasks, loading, addTask, updateStatus, deleteTask } = useTasksData();
  const { comments, addComment } = useTaskComments();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<FilterId>("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "board">("list");
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
  const { visible, byTask, linked } = useMemo(() => splitReminders(tasks), [tasks]);
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

  const assignableMembers = roster.filter((m) => m.id !== currentUser?.id);

  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeId: "",
    dueDate: "2026-08-30",
    priority: "medium" as TaskPriority,
  });

  const matches = (t: Task, f: FilterId) =>
    f === "all" ? true : f === "mine" ? t.assigneeId === currentUser?.id : f === "late" ? isLate(t) : t.status === f;

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
    });
    if (error) {
      setFormError(error);
      return;
    }
    setForm({ ...form, title: "", description: "" });
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

  const toggleDone = (task: Task) => changeStatus(task, task.status === "done" ? "todo" : "done");

  const openTask = (id: string) => {
    setExpandedTaskId(id);
    setScrollToTaskId(id);
  };

  // ── «ركّز على هذي اليوم»: أقرب مهمة متأخرة أو موعدها اليوم (مهامك أول) ──
  const open = visible.filter((t) => t.status !== "done").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const urgent = open.filter((t) => isLate(t) || t.dueDate === today);
  const focus =
    urgent.find((t) => t.assigneeId === currentUser?.id) ?? urgent[0] ?? open.find((t) => t.assigneeId === currentUser?.id) ?? open[0];
  const doneCount = visible.filter((t) => t.status === "done").length;
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

  // ── التذكيرات الجاية ──
  const upcomingReminders = linked.filter((r) => r.status !== "done" && r.dueDate >= today);
  const remindersTomorrow = upcomingReminders.filter((r) => r.dueDate === tomorrow).length;
  const remindersToday = upcomingReminders.filter((r) => r.dueDate === today).length;

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
    const sub = [task.sectionKey ? sectionLabel[task.sectionKey] : "", task.description].filter(Boolean).join(" — ");
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
    if (isLeader)
      menu.push({ label: tr("حذف المهمة"), confirmLabel: tr("تأكيد الحذف؟"), icon: Trash2, tone: "danger", onClick: () => deleteTask(task.id) });

    return (
      <div
        key={task.id}
        id={`task-${task.id}`}
        role="listitem"
        className={clsx(
          "scroll-mt-24 rounded-2xl px-3 py-2.5 transition-colors sm:px-3.5",
          late ? "v3-late-row bg-[rgba(255,120,100,.06)]" : "hover:bg-white/[0.03]",
          isExpanded && !late && "bg-white/[0.04]",
        )}
      >
        <div className={clsx("grid items-center gap-x-3", ROW_COLS)}>
          <button
            type="button"
            onClick={() => toggleDone(task)}
            disabled={!canToggle}
            aria-label={task.status === "done" ? tr("إلغاء الإكمال") : tr("تعليم كمكتملة")}
            aria-pressed={task.status === "done"}
            className={clsx("v3-tap -m-2 grid h-11 w-11 place-items-center rounded-full", canToggle ? "cursor-pointer" : "cursor-default opacity-60")}
          >
            <span
              className={clsx("grid h-[22px] w-[22px] place-items-center rounded-full border-[1.8px] transition-colors")}
              style={{
                borderColor: task.status === "done" ? "#7FE0A6" : late ? "#FF8A7A" : "rgba(255,255,255,.3)",
                background: task.status === "done" ? "rgba(127,224,166,.18)" : undefined,
              }}
            >
              {task.status === "done" && <Check size={13} strokeWidth={3} className="text-[#7FE0A6]" />}
            </span>
          </button>

          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
              aria-expanded={isExpanded}
              className="flex min-h-[28px] w-full flex-wrap items-center gap-x-2 gap-y-1 text-start"
            >
              <span className={clsx("text-[15px] font-bold", task.status === "done" && "text-[var(--ws-c-muted)] line-through decoration-white/30")} dir="auto">
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
            {sub && (
              <div className="v3-mut truncate text-[13px]" dir="auto">
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

  const collapsedText = (g: DueGroup<Task>) =>
    g.key === "later" ? tr("{0} بعد الأسبوع الجاي", taskCount(g.items.length)) : tr("{0} خلصت", taskCount(g.items.length));

  return (
    <div className="v3 relative">
      <V3Glow />

      {/* ── الترويسة ── */}
      <header className="v3-rise relative mb-5 flex flex-wrap items-end gap-4" style={rise(0)}>
        <div className="min-w-0 flex-[1_1_280px]">
          <div className="v3-eye">{tr("شغل الفريق")}</div>
          <h1 className="v3-k m-0 text-[30px] leading-snug sm:text-[38px]">{tr("مهامي")}</h1>
          {!isEn && <div className="v3-en -mt-1">My Tasks</div>}
          <p className="v3-mut m-0 mt-1 text-[15px] sm:text-base">{tr("كل اللي عليك وعلى الفريق، مرتبة بالأقرب موعد.")}</p>
        </div>
        {isLeader && canWrite && (
          <button type="button" onClick={() => setShowForm((s) => !s)} className="v3-bd" aria-expanded={showForm}>
            <Plus size={18} aria-hidden />
            {tr("مهمة جديدة")}
          </button>
        )}
      </header>

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
                    {m.name}
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

      {/* ── ركّز على هذي اليوم + حلقة الإنجاز ── */}
      <div className="relative mb-4 flex flex-col gap-4 lg:flex-row lg:gap-[18px]">
        <section
          className={clsx("v3-g v3-rise flex flex-[1.3] items-center gap-5 p-5 sm:px-6 sm:py-[22px]", focus && "v3-sheen")}
          style={{ ...rise(1), background: "linear-gradient(160deg,rgba(170,48,6,.75),rgba(50,12,3,.6))" }}
          aria-labelledby="focus-title"
        >
          <div className="min-w-0 flex-1">
            <div className="text-[13px] text-[#F3D9C4]">{tr("ركّز على هذي اليوم")}</div>
            {!isEn && <div className="v3-en text-[#D8B9A2]">Today's focus</div>}
            {focus ? (
              <>
                <h2 id="focus-title" className="v3-k m-0 my-1 text-[22px] leading-snug sm:text-[26px]" dir="auto">
                  {focus.title}
                </h2>
                <div className="text-sm text-[#F3D9C4]">
                  {[
                    isLate(focus) ? lateLabel(focus.dueDate) : focus.dueDate === today ? tr("موعدها اليوم") : tr("موعدها {0}", formatDateShort(focus.dueDate)),
                    focus.sectionKey ? sectionLabel[focus.sectionKey] : "",
                    focus.assigneeId !== currentUser?.id ? firstName(focus.assigneeId) : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </>
            ) : (
              <h2 id="focus-title" className="v3-k m-0 my-1 text-[22px] sm:text-[26px]">
                {tr("ما عندكم مهام مفتوحة")} 🎉
              </h2>
            )}
          </div>
          {focus && (
            <button type="button" className={clsx(showForm ? "v3-bd" : "v3-bw", "shrink-0")} onClick={() => openTask(focus.id)}>
              {tr("افتح ←")}
            </button>
          )}
        </section>

        <section className="v3-g v3-hover v3-rise flex flex-1 items-center gap-5 p-5 sm:px-6" style={rise(2)} aria-label={tr("إنجاز المهام")}>
          <div className="relative h-[84px] w-[84px] shrink-0">
            <div className="v3-ring h-[84px] w-[84px]" style={{ ["--v3-target" as string]: `${pct}%` }} role="img" aria-label={tr("{0}٪ مكتمل", num(pct))} />
            <span className="v3-k absolute inset-0 grid place-items-center text-xl" aria-hidden>
              {num(pct)}٪
            </span>
          </div>
          <div className="min-w-0">
            <div className="v3-k text-[17px]">{tr("خلصتوا {0} من {1} مهمة", num(doneCount), num(visible.length))}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {lateCount > 0 && <span className="v3-st late">{tr("{0} متأخرة", num(lateCount))}</span>}
              {tomorrowCount > 0 && <span className="v3-st doing">{tr("{0} بكرة", num(tomorrowCount))}</span>}
              {lateCount === 0 && tomorrowCount === 0 && <span className="v3-st done">{tr("ولا شي متأخر")}</span>}
            </div>
          </div>
        </section>
      </div>

      {/* ── الفلاتر + البحث + قائمة/شبكة ── */}
      <div className="relative mb-4 flex flex-wrap items-center gap-3">
        <div className="v3-g v3-rise v3-scroll-x flex max-w-full gap-1 !rounded-full p-1.5" style={rise(3)} role="tablist" aria-label={tr("فلترة المهام")}>
          {filters.map((f) => {
            const on = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setFilter(f.id)}
                className={clsx(
                  "v3-tap flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-4 text-[15px] transition-all",
                  on ? "bg-[#F6F1EC] font-bold text-[#160904] shadow-[0_0_22px_rgba(255,200,140,.35)]" : "text-[var(--ws-c-text)] hover:text-[var(--ws-c-text)]",
                )}
              >
                {f.label}
                <span className={clsx("rounded-full px-[7px] text-xs font-bold", on ? "bg-[#160904] text-[#FFB444]" : "bg-white/10")}>{num(counts[f.id])}</span>
              </button>
            );
          })}
        </div>
        <label className="v3-g v3-rise flex min-h-[48px] min-w-[200px] flex-1 items-center gap-2 !rounded-full px-4" style={rise(4)}>
          <Search size={17} className="shrink-0 text-[var(--ws-c-muted)]" aria-hidden />
          <span className="sr-only">{tr("ابحث في المهام")}</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr("ابحث في المهام…")}
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--ws-c-text)] outline-none placeholder:text-[var(--ws-c-muted)]"
            type="search"
          />
        </label>
        <div className="v3-g v3-rise flex gap-1 !rounded-full p-1" style={rise(5)} role="group" aria-label={tr("طريقة العرض")}>
          {(
            [
              ["list", List, tr("عرض قائمة")],
              ["board", LayoutGrid, tr("عرض شبكة")],
            ] as const
          ).map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              aria-pressed={view === id}
              aria-label={label}
              title={label}
              className={clsx(
                "v3-tap grid h-11 w-11 place-items-center rounded-full transition-colors",
                view === id ? "bg-[#F6F1EC] text-[#160904]" : "text-[var(--ws-c-text)] hover:text-[var(--ws-c-text)]",
              )}
            >
              <Icon size={17} />
            </button>
          ))}
        </div>
      </div>

      {/* ── القائمة + الجنب ── */}
      <div className="relative grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-[18px]">
        <section className="v3-g v3-rise min-w-0 px-2 py-4 sm:px-2.5" style={rise(6)} aria-label={tr("كل المهام")}>
          {loading ? (
            <div className="flex flex-col gap-3 px-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : view === "board" ? (
            <div className="px-1.5">
              <TasksKanban
                tasks={filtered}
                memberById={memberById}
                canToggleTask={canToggleTask}
                onChangeStatus={changeStatus}
                isLeader={isLeader}
                onDelete={deleteTask}
              />
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
              <div className={clsx("v3-mut hidden gap-x-3 px-3.5 pb-1 text-xs md:grid", ROW_COLS)} aria-hidden>
                <span />
                <span>{tr("المهمة")}</span>
                <span>{tr("مين")}</span>
                <span>{tr("الموعد")}</span>
                <span>{tr("الحالة")}</span>
                <span />
              </div>
              <div role="list" className="flex flex-col">
                {groups.map((g, gi) => {
                  const collapsible = g.key === "later" || g.key === "done";
                  const expanded = !collapsible || openGroups[g.key] || g.items.some((t) => t.id === expandedTaskId) || !!query.trim();
                  return (
                    <div key={g.key} role="group" aria-labelledby={`grp-${g.key}`} className="flex flex-col gap-0.5">
                      {gi > 0 && <div className="mx-1 my-1.5 h-px bg-white/[0.07]" />}
                      <div className="flex items-center gap-2.5 px-3.5 pb-1.5 pt-1">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: GROUP_DOT[g.key] }} />
                        <span id={`grp-${g.key}`} className="v3-k text-base">
                          {g.label}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.07] px-2 text-xs">{num(g.items.length)}</span>
                        {collapsible && expanded && !query.trim() && (
                          <button type="button" className="v3-link ms-auto !min-h-[36px]" onClick={() => setOpenGroups((s) => ({ ...s, [g.key]: false }))}>
                            {tr("اخفها")}
                          </button>
                        )}
                      </div>
                      {expanded ? (
                        g.items.map((t) => renderRow(t, g.key === "overdue"))
                      ) : (
                        <div className="v3-mut flex flex-wrap items-center gap-x-1.5 px-3.5 pb-1 text-sm md:ps-[52px]">
                          {collapsedText(g)} ·
                          <button type="button" className="v3-link" onClick={() => setOpenGroups((s) => ({ ...s, [g.key]: true }))}>
                            {tr("اعرضها")}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <aside className="flex min-w-0 flex-col gap-4">
          {/* حمل الفريق */}
          <section className="v3-g v3-hover v3-rise flex flex-col gap-3 p-[18px]" style={rise(7)} aria-labelledby="load-title">
            <div>
              <h2 id="load-title" className="v3-k m-0 text-base">
                {tr("حمل الفريق")}
              </h2>
              {!isEn && <div className="v3-en">Team workload</div>}
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
              <button
                type="button"
                className="v3-bd !text-sm"
                onClick={() =>
                  openAgent(
                    handOff
                      ? tr("وزّع المهام المفتوحة بالتساوي على الأعضاء. مثلًا «{0}» من {1} لـ{2}. اعرض عليّ الاقتراح قبل أي تغيير.", handOff.title, most.member.name, least.member.name)
                      : tr("وزّع المهام المفتوحة بالتساوي على الأعضاء، واعرض عليّ الاقتراح قبل أي تغيير."),
                  )
                }
              >
                <Sparkles size={15} aria-hidden />
                {tr("وزّعها بالتساوي")}
              </button>
            )}
          </section>

          {/* التذكيرات */}
          <section className="v3-g v3-hover v3-rise flex flex-col gap-2 p-[18px]" style={rise(8)} aria-labelledby="rem-title">
            <div>
              <h2 id="rem-title" className="v3-k m-0 text-base">
                {tr("التذكيرات")}
              </h2>
              {!isEn && <div className="v3-en">Reminders</div>}
            </div>
            <p className="v3-mut m-0 text-[13px] leading-relaxed">{tr("صارت جرس صغير على المهمة نفسها بدل ما تطلع كمهمة ثانية مكررة.")}</p>
            <div className="flex items-center gap-2 text-sm">
              <Bell size={16} className="shrink-0 text-[#FFB444]" aria-hidden />
              {remindersTomorrow > 0
                ? tr("{0} تذكير بكرة الصبح ٨:٠٥", num(remindersTomorrow))
                : remindersToday > 0
                  ? tr("{0} تذكير اليوم", num(remindersToday))
                  : upcomingReminders.length > 0
                    ? tr("{0} تذكير جاي", num(upcomingReminders.length))
                    : tr("ما فيه تذكيرات جاية")}
            </div>
          </section>
        </aside>
      </div>

      <ConfettiBurst active={justCompleted} />
    </div>
  );
}
