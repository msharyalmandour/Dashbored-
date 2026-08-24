import { useState } from "react";
import clsx from "clsx";
import Avatar from "./ui/Avatar";
import EmptyState from "./ui/EmptyState";
import { Inbox } from "lucide-react";
import type { Task, TaskStatus, TeamMember } from "../data/types";
import { formatDateShort } from "../lib/date";

const columns: { id: TaskStatus; label: string; tone: string }[] = [
  { id: "todo", label: "لم يبدأ", tone: "text-sky-accent-600 bg-sky-accent-50" },
  { id: "in-progress", label: "قيد التنفيذ", tone: "text-amber-accent-600 bg-amber-accent-50" },
  { id: "overdue", label: "متأخرة", tone: "text-rose-600 bg-rose-50" },
  { id: "done", label: "مكتملة", tone: "text-brand-600 bg-brand-50" },
];

const priorityStyle: Record<Task["priority"], string> = {
  low: "text-brand-950/40 bg-surface-muted",
  medium: "text-amber-accent-600 bg-amber-accent-50",
  high: "text-rose-600 bg-rose-50",
};

export default function TasksKanban({
  tasks,
  memberById,
  canToggleTask,
  onChangeStatus,
}: {
  tasks: Task[];
  memberById: (id: string) => Pick<TeamMember, "id" | "name" | "initials" | "color">;
  canToggleTask: (task: Task) => boolean;
  onChangeStatus: (task: Task, nextStatus: TaskStatus) => void;
}) {
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = e.dataTransfer.getData("text/plain");
    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== status && canToggleTask(task)) {
      onChangeStatus(task, status);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {columns.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id);
        return (
          <div
            key={col.id}
            data-status={col.id}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverCol(col.id);
            }}
            onDragLeave={() => setDragOverCol((c) => (c === col.id ? null : c))}
            onDrop={(e) => handleDrop(e, col.id)}
            className={clsx(
              "flex min-h-[160px] flex-col gap-2 rounded-3xl border border-dashed p-3 transition-colors",
              dragOverCol === col.id
                ? "border-brand-400 bg-brand-50/50"
                : "border-brand-100/60 bg-surface-muted/40",
            )}
          >
            <div className="flex items-center justify-between px-1">
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${col.tone}`}>{col.label}</span>
              <span className="text-xs font-semibold text-brand-950/35">{colTasks.length}</span>
            </div>

            {colTasks.map((task) => {
              const assignee = memberById(task.assigneeId);
              const draggable = canToggleTask(task);
              return (
                <div
                  key={task.id}
                  data-task-id={task.id}
                  draggable={draggable}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", task.id);
                  }}
                  className={clsx(
                    "space-y-2 rounded-3xl border border-brand-100/60 bg-paper p-3 shadow-sm shadow-brand-950/5",
                    draggable ? "cursor-grab active:cursor-grabbing" : "opacity-80",
                  )}
                >
                  <p className="text-sm font-semibold text-brand-950">{task.title}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${priorityStyle[task.priority]}`}>
                      {task.priority === "low" ? "منخفضة" : task.priority === "medium" ? "متوسطة" : "عالية"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-brand-950/45">{formatDateShort(task.dueDate)}</span>
                      <Avatar initials={assignee.initials} color={assignee.color} size="sm" />
                    </div>
                  </div>
                </div>
              );
            })}

            {colTasks.length === 0 && (
              <div className="py-4">
                <EmptyState icon={Inbox} title="فاضية" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
