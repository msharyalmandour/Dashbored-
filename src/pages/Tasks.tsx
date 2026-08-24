import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Circle, FileText, PartyPopper, Plus, X } from "lucide-react";
import clsx from "clsx";
import Card from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import FileAttach, { type AttachedFileMeta } from "../components/FileAttach";
import { useAuth } from "../context/AuthContext";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useTasksData } from "../hooks/useTasksData";
import { proposalSections } from "../data/mockData";
import type { TaskPriority, TaskStatus } from "../data/types";
import { formatDateShort } from "../lib/date";

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

const statusStyle: Record<TaskStatus, string> = {
  todo: "text-sky-accent-600 bg-sky-accent-50",
  "in-progress": "text-amber-accent-600 bg-amber-accent-50",
  done: "text-brand-600 bg-brand-50",
  overdue: "text-rose-600 bg-rose-50",
};

const statusLabel: Record<TaskStatus, string> = {
  todo: "لم يبدأ",
  "in-progress": "قيد التنفيذ",
  done: "مكتملة",
  overdue: "متأخرة",
};

const priorityStyle: Record<TaskPriority, string> = {
  low: "text-brand-950/40 bg-surface-muted",
  medium: "text-amber-accent-600 bg-amber-accent-50",
  high: "text-rose-600 bg-rose-50",
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
  const { tasks, addTask, updateStatus } = useTasksData();
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{ title: string; line: string } | null>(null);
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
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(null), 3200);
    return () => clearTimeout(timer);
  }, [celebration]);

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

  const toggleDone = async (task: (typeof tasks)[number]) => {
    const canToggle = canWrite && (isLeader || task.assigneeId === currentUser?.id);
    if (!canToggle) return;
    const nextStatus: TaskStatus = task.status === "done" ? "todo" : "done";
    await updateStatus(task.id, nextStatus);
    if (nextStatus === "done") {
      const line = celebrations[Math.floor(Math.random() * celebrations.length)];
      setCelebration({ title: task.title, line });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={clsx(
                "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                filter === f.id
                  ? "bg-brand-500 text-white"
                  : "bg-paper text-brand-950/60 hover:bg-surface-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLeader && canWrite && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600"
          >
            <Plus size={16} />
            إسناد مهمة جديدة
          </button>
        )}
      </div>

      {showForm && isLeader && canWrite && (
        <Card tone="cream" className="relative">
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
              <span className="mb-1 block font-semibold text-brand-950/70">الوصف</span>
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

      <div className="grid grid-cols-1 gap-3">
        {filtered.map((task) => {
          const assignee = memberById(task.assigneeId);
          const canToggle = canWrite && (isLeader || task.assigneeId === currentUser?.id);
          return (
            <Card key={task.id} className="flex flex-wrap items-center gap-4">
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
                  "shrink-0",
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
              <div className="min-w-[200px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-brand-950">{task.title}</p>
                  {task.sectionKey && sectionLabel[task.sectionKey] && (
                    <span className="rounded-full bg-sky-accent-50 px-2 py-0.5 text-[11px] font-bold text-sky-accent-600">
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
              {canToggle && !taskAttachments[task.id] && (
                <FileAttach compact onAttach={(meta) => attachToTask(task.id, meta)} />
              )}
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${priorityStyle[task.priority]}`}>
                {priorityLabel[task.priority]}
              </span>
              <span className="text-sm text-brand-950/50">{formatDateShort(task.dueDate)}</span>
              <div className="flex items-center gap-2">
                <Avatar initials={assignee.initials} color={assignee.color} size="sm" />
                <span className="hidden text-sm font-medium text-brand-950/70 sm:block">
                  {assignee.name.split(" ")[0]}
                </span>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[task.status]}`}>
                {statusLabel[task.status]}
              </span>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-brand-950/40">
            {filter === "mine"
              ? "ما عليك مهام هنا — عاشت الأيادي 🎉"
              : filter === "done"
                ? "ولا مهمة مكتملة بعد بهذا الفلتر"
                : "ما فيه مهام مطابقة لهذا الفلتر حاليًا"}
          </p>
        )}
      </div>

      {celebration && (
        <div className="fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-paper px-5 py-3.5 shadow-lg shadow-brand-950/10">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-accent-500 text-white">
              <PartyPopper size={18} />
            </span>
            <div>
              <p className="text-sm font-bold text-brand-950">{celebration.line}</p>
              <p className="max-w-xs truncate text-xs text-brand-950/50">
                أكملت: {celebration.title}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
