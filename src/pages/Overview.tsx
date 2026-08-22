import { useState } from "react";
import {
  Activity,
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardList,
  Users,
  UserRound,
} from "lucide-react";
import Card, { CardHeader } from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import ProgressBar from "../components/ui/ProgressBar";
import StatCard from "../components/StatCard";
import MiniCalendar from "../components/MiniCalendar";
import PhaseTracker from "../components/PhaseTracker";
import { useAuth } from "../context/AuthContext";
import {
  calendarEvents,
  fieldworkSites,
  projectMeta,
  recentActivity,
  tasks,
  teamMembers,
} from "../data/mockData";
import { getMilestoneGroups } from "../lib/selectors";
import { daysUntil, formatDateLong, formatDateShort, toISODate } from "../lib/date";

const today = new Date(2026, 7, 22);
const todayIso = toISODate(today);

const statusStyle: Record<string, string> = {
  todo: "text-sky-accent-600 bg-sky-accent-50",
  "in-progress": "text-amber-accent-600 bg-amber-accent-50",
  done: "text-brand-600 bg-brand-50",
  overdue: "text-rose-600 bg-rose-50",
};

const statusLabel: Record<string, string> = {
  todo: "لم يبدأ",
  "in-progress": "قيد التنفيذ",
  done: "مكتملة",
  overdue: "متأخرة",
};

export default function Overview() {
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState(todayIso);

  const milestoneGroups = getMilestoneGroups();
  const remainingDays = daysUntil(projectMeta.deadline, today);
  const collectedPct = Math.round(
    (projectMeta.participantsCollected / projectMeta.participantsTarget) * 100,
  );

  const priorities = [...tasks]
    .filter((t) => t.status !== "done")
    .sort((a, b) => {
      const order = { overdue: 0, "in-progress": 1, todo: 2, done: 3 };
      return order[a.status] - order[b.status];
    })
    .slice(0, 5);

  const upcoming = calendarEvents
    .filter((e) => e.date >= todayIso)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 4);

  const dayEvents = calendarEvents
    .filter((e) => e.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  const memberById = (id: string) => teamMembers.find((m) => m.id === id)!;

  return (
    <div className="space-y-6">
      {/* Welcome + deadline */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="relative overflow-hidden lg:col-span-2">
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-brand-50" />
          <div className="pointer-events-none absolute -bottom-16 left-24 h-32 w-32 rounded-full bg-amber-accent-50" />
          <div className="relative">
            <p className="text-xl font-extrabold text-brand-950">
              صباح الخير، {currentUser?.name.split(" ")[0]} 👋
            </p>
            <p className="mt-1 text-sm text-brand-950/50">
              فريق بحثكم يحقق تقدمًا ثابتًا هذا الأسبوع.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-white">
                <UserRound size={20} />
              </div>
              <div>
                <p className="text-lg font-bold text-brand-950">{projectMeta.name}</p>
                <p className="text-sm text-brand-600">{projectMeta.subtitle}</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-brand-100 bg-surface-muted p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-semibold text-brand-950/70">
                  <CalendarClock size={15} />
                  الموعد النهائي للتسليم — {formatDateLong(projectMeta.deadline)}
                </span>
                <span className="font-extrabold text-brand-600">
                  متبقٍ {remainingDays} يومًا
                </span>
              </div>
              <ProgressBar
                value={projectMeta.overallProgress}
                className="mt-3"
              />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={Activity}
            label="تقدم البحث"
            value={`${projectMeta.overallProgress}%`}
            sub="على المسار الصحيح"
            color="brand"
          />
          <StatCard
            icon={Users}
            label="الفريق"
            value={`${teamMembers.length} أعضاء`}
            sub={`${teamMembers.filter((m) => m.progress > 0).length} نشطون`}
            color="sky-accent"
          />
          <StatCard
            icon={ClipboardList}
            label="المهام"
            value={`${tasks.length}`}
            sub={`${tasks.filter((t) => t.status === "done").length} مكتملة`}
            color="amber-accent"
          />
          <StatCard
            icon={UserRound}
            label="المشاركون"
            value={`${projectMeta.participantsCollected}/${projectMeta.participantsTarget}`}
            progress={collectedPct}
            color="brand"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Research progress + priorities */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="تقدم البحث بالمراحل" subtitle={`${projectMeta.overallProgress}% إجمالي التقدم`} />
            <PhaseTracker groups={milestoneGroups} />
          </Card>

          <Card>
            <CardHeader
              title="أولويات اليوم"
              action={
                <span className="text-xs font-semibold text-brand-600">عرض الكل</span>
              }
            />
            <ul className="divide-y divide-brand-50">
              {priorities.map((task) => {
                const assignee = memberById(task.assigneeId);
                return (
                  <li key={task.id} className="flex items-center gap-3 py-3">
                    {task.status === "overdue" ? (
                      <AlertCircle size={18} className="shrink-0 text-rose-500" />
                    ) : task.status === "in-progress" ? (
                      <Circle size={18} className="shrink-0 fill-amber-accent-100 text-amber-accent-500" />
                    ) : (
                      <Circle size={18} className="shrink-0 text-sky-accent-400" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-950">
                      {task.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <Avatar initials={assignee.initials} color={assignee.color} size="sm" />
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[task.status]}`}
                      >
                        {statusLabel[task.status]}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>

        {/* Calendar + upcoming */}
        <div className="space-y-4">
          <Card>
            <MiniCalendar
              events={calendarEvents}
              today={today}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          </Card>

          <Card>
            <CardHeader
              title={selectedDate === todayIso ? "أحداث اليوم" : formatDateShort(selectedDate)}
              action={<span className="text-xs font-semibold text-brand-600">عرض الكل</span>}
            />
            <ul className="space-y-3">
              {(dayEvents.length > 0 ? dayEvents : upcoming).map((event) => (
                <li key={event.id} className="flex items-center gap-3">
                  <div className="w-12 shrink-0 text-xs font-bold text-brand-950/50">
                    {event.time}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-brand-950">
                      {event.title}
                    </p>
                    <p className="truncate text-xs text-brand-950/45">{event.location}</p>
                  </div>
                </li>
              ))}
              {dayEvents.length === 0 && upcoming.length === 0 && (
                <p className="text-sm text-brand-950/40">لا توجد أحداث</p>
              )}
            </ul>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title="تقدم الفريق" action={<span className="text-xs font-semibold text-brand-600">عرض الكل</span>} />
          <div className="flex justify-between">
            {teamMembers.map((m) => (
              <div key={m.id} className="flex flex-col items-center gap-2">
                <Avatar initials={m.initials} color={m.color} />
                <span className="text-xs font-semibold text-brand-950/70">
                  {m.name.split(" ")[0]}
                </span>
                <span className="text-sm font-extrabold text-brand-600">{m.progress}%</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="تقدم الميدان" action={<span className="text-xs font-semibold text-brand-600">عرض الخريطة</span>} />
          <p className="text-2xl font-extrabold text-brand-950">
            {projectMeta.participantsCollected}
            <span className="text-base font-medium text-brand-950/40"> / {projectMeta.participantsTarget}</span>
          </p>
          <p className="mb-3 text-xs text-brand-950/45">مشارك تم جمع بياناته</p>
          <ProgressBar value={collectedPct} />
          <ul className="mt-4 space-y-2">
            {fieldworkSites.slice(0, 3).map((site) => (
              <li key={site.id} className="flex items-center justify-between text-sm">
                <span className="text-brand-950/70">{site.city}</span>
                <span className="font-semibold text-brand-950">
                  {site.collected}/{site.target}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="آخر نشاط للفريق" action={<span className="text-xs font-semibold text-brand-600">عرض الكل</span>} />
          <ul className="space-y-3">
            {recentActivity.map((activity) => {
              const member = memberById(activity.memberId);
              return (
                <li key={activity.id} className="flex items-start gap-3">
                  <Avatar initials={member.initials} color={member.color} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-brand-950">
                      <span className="font-semibold">{member.name.split(" ")[0]}</span>{" "}
                      {activity.action}{" "}
                      <span className="font-semibold text-brand-700">"{activity.target}"</span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-brand-950/40">
                      <CheckCircle2 size={12} />
                      {activity.timeAgo}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
