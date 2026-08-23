import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  Circle,
  Compass,
  ListTodo,
  Milestone,
  TrendingUp,
  X,
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
  evidenceLibrary,
  projectMeta,
  recentActivity,
  researchStages,
  tasks,
  teamMembers,
} from "../data/mockData";
import { daysUntil, formatDateLong, formatDateShort, getGreeting, toISODate } from "../lib/date";

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

const GUIDE_BANNER_KEY = "nursync.guideBannerDismissed";

export default function Overview() {
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [showGuideBanner, setShowGuideBanner] = useState(
    () => localStorage.getItem(GUIDE_BANNER_KEY) !== "1",
  );

  const dismissGuideBanner = () => {
    localStorage.setItem(GUIDE_BANNER_KEY, "1");
    setShowGuideBanner(false);
  };

  const remainingDays = daysUntil(projectMeta.deadline, today);
  const nextDeadlineDays = daysUntil(projectMeta.nextDeadlineDate, today);

  const reviewedCount = evidenceLibrary.filter((p) => p.reviewStatus === "reviewed").length;
  const collectedCount = evidenceLibrary.length;
  const remainingCount = collectedCount - reviewedCount;
  const litReviewPct = Math.round((reviewedCount / collectedCount) * 100);

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

  const overdueCount = tasks.filter((t) => t.status === "overdue").length;
  const heroMessage =
    priorities.length === 0
      ? "ما عليك شي مستعجل اليوم — وقت زين تراجع المقترح البحثي أو ترتاح شوي ☕"
      : overdueCount > 0
        ? `عندك ${overdueCount} ${overdueCount === 1 ? "مهمة متأخرة" : "مهام متأخرة"} — خلها أول شي تسويه اليوم.`
        : "فريق بحثكم يحقق تقدمًا ثابتًا هذا الأسبوع، كمّلوا بنفس الوتيرة 💪";

  return (
    <div className="space-y-6">
      {showGuideBanner && (
        <div className="flex items-center gap-4 rounded-3xl border border-amber-accent-200 bg-amber-accent-100 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-accent-500 text-white">
            <Compass size={18} />
          </span>
          <p className="min-w-0 flex-1 text-sm font-semibold text-amber-accent-700">
            أول مرة تستخدم NURSYNC؟ راجع{" "}
            <Link to="/guide" className="underline underline-offset-2">
              دليل الطالب
            </Link>{" "}
            عشان تعرف وين تروح ولاش تضيف مهامك.
          </p>
          <button
            onClick={dismissGuideBanner}
            className="shrink-0 rounded-lg p-1.5 text-amber-accent-600 hover:bg-amber-accent-200"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Welcome + progress */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card tone="teal" className="relative overflow-hidden lg:col-span-2">
          <div className="pointer-events-none absolute -left-10 -top-10 h-44 w-44 rounded-full bg-[var(--color-overlay-soft)]" />
          <div className="pointer-events-none absolute -bottom-16 left-28 h-32 w-32 rounded-full bg-amber-accent-200/50" />
          <div className="relative">
            <p className="font-display text-2xl font-extrabold text-brand-950">
              {getGreeting()}، {currentUser?.name.split(" ")[0]} 👋
            </p>
            <p className="mt-1 text-sm text-brand-950/55">{heroMessage}</p>

            <div className="mt-6">
              <p className="text-sm font-semibold text-brand-950/70">{projectMeta.name}</p>
              <p className="text-xs text-brand-700" dir="ltr">
                {projectMeta.subtitle}
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-[var(--color-overlay-soft)] bg-[var(--color-overlay-soft)] p-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold text-brand-950/60">نسبة تقدم البحث</p>
                  <p className="font-display text-4xl font-extrabold text-brand-950">
                    {projectMeta.overallProgress}%
                  </p>
                </div>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-brand-950/70">
                  <CalendarClock size={15} />
                  الموعد النهائي — {formatDateLong(projectMeta.deadline)} (متبقٍ {remainingDays} يومًا)
                </span>
              </div>
              <ProgressBar
                value={projectMeta.overallProgress}
                className="mt-3"
                track="bg-[var(--color-track)]"
              />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={Milestone}
            label="المرحلة الحالية"
            value={projectMeta.currentStageAr}
            sub={projectMeta.currentStageEn}
            color="brand"
            tone="teal"
          />
          <StatCard
            icon={ListTodo}
            label="المهمة الحالية"
            value={projectMeta.currentTask}
            sub="قيد التنفيذ الآن"
            color="amber-accent"
            tone="cream"
          />
          <StatCard
            icon={TrendingUp}
            label="الخطوة التالية"
            value={projectMeta.nextStep}
            sub="بعد إكمال الحالية"
            color="sky-accent"
            tone="sky"
          />
          <StatCard
            icon={CalendarClock}
            label="الموعد القادم"
            value={formatDateShort(projectMeta.nextDeadlineDate)}
            sub={`${projectMeta.nextDeadlineLabel} — متبقٍ ${nextDeadlineDays} أيام`}
            color="brand"
            tone="violet"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Research journey + priorities */}
        <div className="space-y-4 lg:col-span-2">
          <Card tone="cream">
            <CardHeader
              title="رحلة تقدم البحث"
              subtitle="Research Progress Journey"
            />
            <PhaseTracker stages={researchStages} />
          </Card>

          <Card>
            <CardHeader
              title="مهامي القادمة"
              action={
                <Link to="/tasks" className="text-xs font-semibold text-brand-600">
                  عرض الكل
                </Link>
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
            {priorities.length === 0 && (
              <p className="py-6 text-center text-sm text-brand-950/40">
                ما فيه أولويات معلّقة عليك اليوم — استمتع بيومك 🌿
              </p>
            )}
          </Card>
        </div>

        {/* Calendar + upcoming */}
        <div className="space-y-4">
          <Card tone="sky">
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
        <Card tone="violet">
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

        <Card tone="amber">
          <CardHeader
            title="مراجعة الأدبيات"
            action={
              <Link to="/literature-review" className="text-xs font-semibold text-brand-600">
                عرض المكتبة
              </Link>
            }
          />
          <div className="flex items-center gap-2">
            <BookOpenCheck size={18} className="text-amber-accent-600" />
            <p className="text-2xl font-extrabold text-brand-950">
              {reviewedCount}
              <span className="text-base font-medium text-brand-950/40"> / {collectedCount}</span>
            </p>
          </div>
          <p className="mb-3 text-xs text-brand-950/45">دراسة تمت مراجعتها من إجمالي المجمّعة</p>
          <ProgressBar value={litReviewPct} />
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-brand-950/70">الدراسات المتبقية</span>
            <span className="font-semibold text-brand-950">{remainingCount}</span>
          </div>
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
