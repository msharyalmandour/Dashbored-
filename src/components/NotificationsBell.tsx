import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Bell, Clock } from "lucide-react";
import { recentActivity, teamMembers } from "../data/mockData";
import { useAuth } from "../context/AuthContext";
import { useTasksData } from "../hooks/useTasksData";
import { daysUntil } from "../lib/date";
import Avatar from "./ui/Avatar";

const URGENT_WINDOW_DAYS = 2;

function dueLabel(days: number): string {
  if (days < 0) return "متأخرة";
  if (days === 0) return "مستحقة اليوم";
  if (days === 1) return "مستحقة غدًا";
  return `مستحقة بعد ${days} أيام`;
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const { currentUser } = useAuth();
  const { tasks } = useTasksData();
  const memberById = (id: string) => teamMembers.find((m) => m.id === id);
  const activityItems = recentActivity.slice(0, 5);

  const urgentTasks = tasks
    .filter((t) => t.assigneeId === currentUser?.id && t.status !== "done")
    .map((t) => ({ task: t, days: daysUntil(t.dueDate) }))
    .filter(({ days }) => days <= URGENT_WINDOW_DAYS)
    .sort((a, b) => a.days - b.days)
    .slice(0, 4);

  const badgeCount = urgentTasks.length > 0 ? urgentTasks.length : activityItems.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="التنبيهات"
        className="relative rounded-xl border border-brand-100 p-2 text-brand-950/60 hover:bg-surface-muted"
      >
        <Bell size={18} />
        {badgeCount > 0 && (
          <span
            className={`absolute -top-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white ${
              urgentTasks.length > 0 ? "bg-rose-500" : "bg-amber-accent-500"
            }`}
          >
            {badgeCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute end-0 top-12 z-20 w-80 rounded-2xl border border-brand-100 bg-paper p-2 shadow-lg shadow-brand-950/10">
            {urgentTasks.length > 0 && (
              <>
                <p className="px-2 py-1.5 text-xs font-bold text-brand-950/45">يحتاج انتباهك</p>
                <div className="mb-2 space-y-1">
                  {urgentTasks.map(({ task, days }) => (
                    <Link
                      key={task.id}
                      to="/tasks"
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-2.5 rounded-xl px-2 py-2 hover:bg-surface-muted"
                    >
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                          days < 0 ? "bg-rose-50 text-rose-500" : "bg-amber-accent-50 text-amber-accent-600"
                        }`}
                      >
                        {days < 0 ? <AlertTriangle size={13} /> : <Clock size={13} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-brand-950">{task.title}</p>
                        <p
                          className={`mt-0.5 text-xs font-semibold ${
                            days < 0 ? "text-rose-500" : "text-brand-950/45"
                          }`}
                        >
                          {dueLabel(days)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            <p className="px-2 py-1.5 text-xs font-bold text-brand-950/45">آخر تنبيهات الفريق</p>
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {activityItems.map((activity) => {
                const member = memberById(activity.memberId);
                if (!member) return null;
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-2.5 rounded-xl px-2 py-2 hover:bg-surface-muted"
                  >
                    <Avatar initials={member.initials} color={member.color} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-brand-950">
                        <span className="font-semibold">{member.name.split(" ")[0]}</span>{" "}
                        {activity.action}{" "}
                        <span className="font-semibold text-brand-700">"{activity.target}"</span>
                      </p>
                      <p className="mt-0.5 text-xs text-brand-950/40">{activity.timeAgo}</p>
                    </div>
                  </div>
                );
              })}
              {activityItems.length === 0 && (
                <p className="px-2 py-4 text-center text-sm text-brand-950/40">لا توجد تنبيهات جديدة</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
