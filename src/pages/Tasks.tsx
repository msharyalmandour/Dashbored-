import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  FileText,
  LayoutGrid,
  List,
  ListChecks,
  MessageCircle,
  PartyPopper as PartyPopperIcon,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import clsx from "clsx";
import Card from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import FileAttach, { type AttachedFileMeta } from "../components/FileAttach";
import ImproveWritingButton from "../components/ImproveWritingButton";
import TaskComments from "../components/TaskComments";
import ConfettiBurst from "../components/cinematic/ConfettiBurst";
import TasksKanban from "../components/TasksKanban";
import ThreeDotsMenu from "../components/ui/ThreeDotsMenu";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useTasksData } from "../hooks/useTasksData";
import { useTaskComments } from "../hooks/useTaskComments";
import { proposalSections } from "../data/mockData";
import type { TaskPriority, TaskStatus } from "../data/types";
import { formatDateShort, relativeDayLabel } from "../lib/date";
import {
  HighlightCard,
  PageColumns,
  PageHeader,
  Panel,
  ReadinessPanel,
  Segmented,
  StatusChip,
  primaryBtn,
  rowSurface,
  type ChipTone,
} from "../components/ui/page";
import { playChime } from "../lib/sound";

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
  "عاشت الأيادي!",
  "خطوة قدام في بحثك 👏",
  "تقدم ما ينكسر",
  "أنت قدها وقدود!",
];

const sectionLabel = Object.fromEntries(
  proposalSections.map((s) => [s.key, s.labelAr]),
);

const statusTone: Record<TaskStatus, ChipTone> = {
  todo: "todo",
  "in-progress": "active",
  done: "done",
  overdue: "late",
};

const statusLabel: Record<TaskStatus, string> = {
  todo: "لم يبدأ",
  "in-progress": "قيد التنفيذ",
  done: "مكتملة",
  overdue: "متأخرة",
};

const priorityLabel: Record<TaskPriority, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
};

const filters: { id: string; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "mine", label: "مهامي" },
  { id: "todo", label: "لم تبدأ" },
  { id: "in-progress", label: "قيد التنفيذ" },
  { id: "overdue", label: "متأخرة" },
  { id: "done", label: "مكتملة" },
];

export default function Tasks() {
  const { currentUser, isLeader, canWrite } = useAuth();
  const { roster } = useTeamRoster();
  const { tasks, loading, addTask, updateStatus, deleteTask } = useTasksData();
  const { comments, addComment } = useTaskComments();
  const { showToast } = useToast();
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<"list" | "board">("list");
  const [showForm, setShowForm] = useState(false);
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
  useEffect(() => {
    const id = searchParams.get("task");
    if (id) {
      setFilter("all");
      setExpandedTaskId(id);
      setScrollToTaskId(id);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [taskAttachments, setTaskAttachments] =
    useState<Record<string, AttachedFileMeta>>(loadTaskAttachments);

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

  useEffect(() => {
    if (!scrollToTaskId) return;
    const el = document.getElementById(`task-${scrollToTaskId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setScrollToTaskId(null);
    }
  }, [scrollToTaskId, tasks]);

  const assignableMembers = roster.filter((m) => m.id !== currentUser?.id);

  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeId: "",
    dueDate: "2026-08-30",
    priority: "medium" as TaskPriority,
  });

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      if (filter === "all") return true;
      if (filter === "mine") return task.assigneeId === currentUser?.id;
      return task.status === filter;
    });
  }, [tasks, filter, currentUser]);

  const memberById = (id: string) =>
    roster.find((m) => m.id === id) ?? {
      id,
      name: "عضو",
      initials: "؟",
      color: "brand",
    };

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

  const changeStatus = async (task: (typeof tasks)[number], nextStatus: TaskStatus) => {
    const canToggle = canWrite && (isLeader || task.assigneeId === currentUser?.id);
    if (!canToggle) return;
    await updateStatus(task.id, nextStatus);
    if (nextStatus === "done") {
      const line = celebrations[Math.floor(Math.random() * celebrations.length)];
      showToast({ title: line, desc: `أكملت: ${task.title}`, icon: PartyPopperIcon, tone: "amber" });
      playChime();
      setJustCompleted(true);
    }
  };

  const toggleDone = (task: (typeof tasks)[number]) =>
    changeStatus(task, task.status === "done" ? "todo" : "done");

  const canToggleTask = (task: (typeof tasks)[number]) =>
    canWrite && (isLeader || task.assigneeId === currentUser?.id);

  const openTasks = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const nearest = openTasks[0];
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const railItems = [...tasks]
    .sort((a, b) => Number(a.status === "done") - Number(b.status === "done") || a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5)
    .map((t) => ({ label: t.title, done: t.status === "done" }));

  const header = (
    <PageHeader
      kicker="الفريق"
      title="مهامي"
      subtitle="كل اللي عليك وعلى الفريق، مرتبة بالأقرب موعد."
      action={
        isLeader && canWrite ? (
          <button onClick={() => setShowForm((s) => !s)} className={primaryBtn}>
            <Plus size={16} />
            مهمة جديدة
          </button>
        ) : undefined
      }
    />
  );

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Segmented items={filters} value={filter} onChange={setFilter} />
      <div className="flex items-center gap-1 rounded-full border border-brand-500/30 bg-paper/50 p-1">
        <button
          onClick={() => setView("list")}
          title="عرض قائمة"
          className={clsx(
            "rounded-full p-2",
            view === "list" ? "bg-brand-500 text-[#1a0f00]" : "text-brand-950/50 hover:bg-surface-muted",
          )}
        >
          <List size={16} />
        </button>
        <button
          onClick={() => setView("board")}
          title="عرض لوحة"
          className={clsx(
            "rounded-full p-2",
            view === "board" ? "bg-brand-500 text-[#1a0f00]" : "text-brand-950/50 hover:bg-surface-muted",
          )}
        >
          <LayoutGrid size={16} />
        </button>
      </div>
    </div>
  );

  const side = (
    <>
      {nearest ? (
        <HighlightCard
          kicker="أقرب موعد"
          title={nearest.title}
          subtitle={`${relativeDayLabel(nearest.dueDate)} · ${memberById(nearest.assigneeId).name}`}
        />
      ) : (
        <HighlightCard kicker="أقرب موعد" title="ما عندكم مهام مفتوحة" subtitle="عاشت الأيادي 🎉" />
      )}
      <ReadinessPanel
        title="إنجاز المهام"
        subtitle={`${doneCount} من ${tasks.length}`}
        done={doneCount}
        total={tasks.length}
        items={railItems}
      />
    </>
  );

  return (
    <div className="space-y-6">
      {header}
      {toolbar}
      <PageColumns
        side={side}
        main={
          <>
      {showForm && isLeader && canWrite && (
        <Card tone="paper" className="relative !rounded-[28px] !border-brand-500/30">
          <button
            onClick={() => setShowForm(false)}
            className="absolute left-4 top-4 text-brand-950/40 hover:text-brand-700"
          >
            <X size={18} />
          </button>
          <h3 className="mb-4 text-base font-bold text-brand-950">إسناد مهمة جديدة</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-brand-950/70">عنوان المهمة</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-lg border border-brand-100 px-3 py-2 outline-none focus:border-brand-300"
                placeholder="مثال: مراجعة الفصل الثالث"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-brand-950/70">إسناد إلى</span>
              <select
                value={form.assigneeId || assignableMembers[0]?.id || ""}
                onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}
                className="w-full rounded-lg border border-brand-100 px-3 py-2 outline-none focus:border-brand-300"
              >
                {assignableMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 flex items-center justify-between font-semibold text-brand-950/70">
                الوصف
                <ImproveWritingButton
                  value={form.description}
                  onImproved={(text) => setForm({ ...form, description: text })}
                />
              </span>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-brand-100 px-3 py-2 outline-none focus:border-brand-300"
                placeholder="تفاصيل مختصرة عن المهمة"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-brand-950/70">تاريخ الاستحقاق</span>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full rounded-lg border border-brand-100 px-3 py-2 outline-none focus:border-brand-300"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold text-brand-950/70">الأولوية</span>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
                className="w-full rounded-lg border border-brand-100 px-3 py-2 outline-none focus:border-brand-300"
              >
                <option value="low">منخفضة</option>
                <option value="medium">متوسطة</option>
                <option value="high">عالية</option>
              </select>
            </label>
          </div>
          {formError && (
            <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
              {formError}
            </p>
          )}
          <button
            onClick={handleAssign}
            className="mt-4 rounded-xl bg-brand-500 px-5 py-2 text-sm font-bold text-white hover:bg-brand-600"
          >
            إسناد المهمة
          </button>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : view === "board" ? (
        <TasksKanban
          tasks={filtered}
          memberById={memberById}
          canToggleTask={canToggleTask}
          onChangeStatus={changeStatus}
          isLeader={isLeader}
          onDelete={deleteTask}
        />
      ) : (
        <Panel title="كل المهام" hint={`${openTasks.length} مهمة مفتوحة`}>
        <div className="flex flex-col gap-2.5">
          {filtered.map((task) => {
            const assignee = memberById(task.assigneeId);
            const canToggle = canToggleTask(task);
            const taskComments = comments.filter((c) => c.taskId === task.id);
            const isExpanded = expandedTaskId === task.id;
            return (
              <div
                key={task.id}
                id={`task-${task.id}`}
                className={clsx(rowSurface, "flex scroll-mt-24 flex-col gap-3")}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleDone(task)}
                    disabled={!canToggle}
                    title={
                      canToggle
                        ? task.status === "done"
                          ? "إلغاء الإكمال"
                          : "تعليم كمكتملة"
                        : undefined
                    }
                    className={clsx(
                      "mt-0.5 shrink-0",
                      canToggle ? "cursor-pointer" : "cursor-default opacity-60",
                    )}
                  >
                    {task.status === "done" ? (
                      <CheckCircle2 size={20} className="text-brand-500" />
                    ) : task.status === "overdue" ? (
                      <AlertCircle size={20} className="text-rose-500" />
                    ) : (
                      <Circle size={20} className="text-brand-950/25" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-brand-950">{task.title}</p>
                      {task.sectionKey && sectionLabel[task.sectionKey] && (
                        <span className="rounded-full border border-brand-500/30 px-2 py-0.5 text-[11px] font-bold text-amber-accent-400">
                          {sectionLabel[task.sectionKey]}
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="mt-0.5 truncate text-sm text-brand-950/45">{task.description}</p>
                    )}
                    {taskAttachments[task.id] && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-brand-600">
                        <FileText size={12} />
                        <bdi className="truncate">{taskAttachments[task.id].name}</bdi>
                      </p>
                    )}
                  </div>
                  {isLeader && (
                    <ThreeDotsMenu
                      items={[
                        {
                          label: "حذف المهمة",
                          confirmLabel: "تأكيد الحذف؟",
                          icon: Trash2,
                          tone: "danger",
                          onClick: () => deleteTask(task.id),
                        },
                      ]}
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-brand-100/20 pt-3">
                  <StatusChip tone={statusTone[task.status]}>{statusLabel[task.status]}</StatusChip>
                  {task.priority === "high" && <StatusChip tone="late">أولوية {priorityLabel[task.priority]}</StatusChip>}
                  <span className="text-sm text-brand-950/50">{formatDateShort(task.dueDate)}</span>
                  {canToggle && !taskAttachments[task.id] && (
                    <FileAttach compact onAttach={(meta) => attachToTask(task.id, meta)} />
                  )}
                  <button
                    onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                    title="التعليقات"
                    className={clsx(
                      "flex items-center gap-1 text-xs font-semibold",
                      isExpanded ? "text-brand-600" : "text-brand-950/45 hover:text-brand-600",
                    )}
                  >
                    <MessageCircle size={16} />
                    {taskComments.length > 0 && taskComments.length}
                  </button>
                  <div className="ms-auto flex items-center gap-2">
                    <span className="hidden text-sm font-medium text-brand-950/70 sm:block">
                      {assignee.name.split(" ")[0]}
                    </span>
                    <Avatar initials={assignee.initials} color={assignee.color} size="sm" />
                  </div>
                </div>
                {isExpanded && (
                  <TaskComments
                    comments={taskComments}
                    memberById={memberById}
                    canComment={canWrite}
                    onSubmit={(body) => addComment(task.id, currentUser!.id, body)}
                  />
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <EmptyState
              icon={ListChecks}
              title={
                filter === "mine"
                  ? "ما عليك مهام هنا"
                  : filter === "done"
                    ? "ولا مهمة مكتملة بعد"
                    : "ما فيه مهام مطابقة"
              }
              desc={filter === "mine" ? "عاشت الأيادي 🎉" : "بهذا الفلتر حاليًا"}
            />
          )}
        </div>
        </Panel>
      )}
          </>
        }
      />

      <ConfettiBurst active={justCompleted} />
    </div>
  );
}
