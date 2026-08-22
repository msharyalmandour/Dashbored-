import { useMemo, useState } from "react";
import { AlertCircle, Plus, X } from "lucide-react";
import clsx from "clsx";
import Card from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import { useAuth } from "../context/AuthContext";
import { tasks as initialTasks, teamMembers } from "../data/mockData";
import type { Task, TaskPriority, TaskStatus } from "../data/types";
import { formatDateShort } from "../lib/date";

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

let taskIdCounter = initialTasks.length + 1;

export default function Tasks() {
  const { currentUser, isLeader } = useAuth();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);

  const assignableMembers = teamMembers.filter((m) => m.id !== currentUser?.id);

  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeId: assignableMembers[0]?.id ?? "",
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

  const memberById = (id: string) => teamMembers.find((m) => m.id === id)!;

  const handleAssign = () => {
    if (!form.title.trim() || !form.assigneeId) return;
    const newTask: Task = {
      id: `t${taskIdCounter++}`,
      title: form.title.trim(),
      description: form.description.trim(),
      assigneeId: form.assigneeId,
      dueDate: form.dueDate,
      status: "todo",
      priority: form.priority,
    };
    setTasks((prev) => [newTask, ...prev]);
    setForm({ ...form, title: "", description: "" });
    setShowForm(false);
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
                  : "bg-white text-brand-950/60 hover:bg-surface-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLeader && (
          <button
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600"
          >
            <Plus size={16} />
            إسناد مهمة جديدة
          </button>
        )}
      </div>

      {showForm && isLeader && (
        <Card className="relative">
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
                value={form.assigneeId}
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
          return (
            <Card key={task.id} className="flex flex-wrap items-center gap-4">
              {task.status === "overdue" && (
                <AlertCircle size={18} className="shrink-0 text-rose-500" />
              )}
              <div className="min-w-[200px] flex-1">
                <p className="font-semibold text-brand-950">{task.title}</p>
                {task.description && (
                  <p className="mt-0.5 truncate text-sm text-brand-950/45">{task.description}</p>
                )}
              </div>
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
          <p className="py-10 text-center text-sm text-brand-950/40">لا توجد مهام مطابقة</p>
        )}
      </div>
    </div>
  );
}
