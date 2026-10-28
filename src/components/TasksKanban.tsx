import { useState } from "react";
import clsx from "clsx";
import Avatar from "./ui/Avatar";
import EmptyState from "./ui/EmptyState";
import ThreeDotsMenu from "./ui/ThreeDotsMenu";
import { Inbox, Trash2 } from "lucide-react";
import type { Task, TaskStatus, TeamMember } from "../data/types";
import { formatDateShort } from "../lib/date";
import { tr } from "../lib/i18n";

const columns: { id: TaskStatus; label: string; tone: string }[] = [
  { id: "todo", label: tr("ما بدأ"), tone: "todo" },
  { id: "in-progress", label: tr("نشتغل عليه"), tone: "doing" },
  { id: "overdue", label: tr("متأخرة"), tone: "late" },
  { id: "done", label: tr("خلصت"), tone: "done" },
];

const priorityStyle: Record<Task["priority"], string> = {
  low: "todo",
  medium: "doing",
  high: "late",
};

export default function TasksKanban({
  tasks,
  memberById,
  canToggleTask,
  onChangeStatus,
  isLeader,
  onDelete,
}: {
  tasks: Task[];
  memberById: (id: string) => Pick<TeamMember, "id" | "name" | "initials" | "color">;
  canToggleTask: (task: Task) => boolean;
  onChangeStatus: (task: Task, nextStatus: TaskStatus) => void;
  isLeader?: boolean;
  onDelete?: (taskId: string) => void;
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
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
                ? "border-[rgba(255,180,68,.6)] bg-white/[0.06]"
                : "border-white/10 bg-white/[0.03]",
            )}
          >
            <div className="flex items-center justify-between px-1">
              <span className={`v3-st ${col.tone}`}>{col.label}</span>
              <span className="text-xs font-semibold text-[#8F857C]">{colTasks.length}</span>
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
                    "space-y-2 rounded-[20px] border border-white/[0.08] bg-white/[0.05] p-3",
                    draggable ? "cursor-grab active:cursor-grabbing" : "opacity-80",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-[#F6F1EC]" dir="auto">{task.title}</p>
                    {isLeader && onDelete && (
                      <ThreeDotsMenu
                        items={[
                          {
                            label: tr("حذف المهمة"),
                            confirmLabel: tr("تأكيد الحذف؟"),
                            icon: Trash2,
                            tone: "danger",
                            onClick: () => onDelete(task.id),
                          },
                        ]}
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`v3-st text-[11px] ${priorityStyle[task.priority]}`}>
                      {task.priority === "low" ? tr("منخفضة") : task.priority === "medium" ? tr("متوسطة") : tr("عالية")}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[#B8ADA2]">{formatDateShort(task.dueDate)}</span>
                      <Avatar initials={assignee.initials} color={assignee.color} size="sm" />
                    </div>
                  </div>
                </div>
              );
            })}

            {colTasks.length === 0 && (
              <div className="py-4">
                <EmptyState icon={Inbox} title={tr("فاضية")} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
