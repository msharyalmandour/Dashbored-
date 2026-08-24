import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import {
  AlertCircle,
  Award,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  Circle,
  Coffee,
  Compass,
  Crown,
  History,
  ListTodo,
  Milestone,
  Moon,
  PartyPopper,
  TrendingUp,
  X,
} from "lucide-react";
import Card, { CardHeader } from "../components/ui/Card";
import FocusSession from "../components/FocusSession";
import TimeCapsule from "../components/TimeCapsule";
import TimeOfDayBadge from "../components/TimeOfDayBadge";
import Avatar from "../components/ui/Avatar";
import ProgressBar from "../components/ui/ProgressBar";
import StatCard from "../components/StatCard";
import MiniCalendar from "../components/MiniCalendar";
import PhaseTracker from "../components/PhaseTracker";
import TiltCard from "../components/cinematic/TiltCard";
import CountUp from "../components/cinematic/CountUp";
import { useMouseParallax } from "../hooks/useMouseParallax";
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
import { getDailyQuote } from "../data/motivation";
import { useVisitGap } from "../hooks/useVisitGap";
import { useFirstVisit } from "../hooks/useFirstVisit";
import { g, isFemaleUser } from "../lib/gender";
import { achievements, getUnlockedAchievementIds } from "../lib/achievements";

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
const FLASHBACK_DISMISSED_KEY = "nursync.flashbackDismissedAt";
const FLASHBACK_MIN_DAYS = 3;
const FLASHBACK_RESURFACE_DAYS = 7;
const ACHIEVEMENTS_SEEN_KEY = "nursync.achievementsSeen";
const LAST_SEEN_STAGE_KEY = "nursync.lastSeenStage";
const NIGHT_OWL_DISMISSED_KEY = "nursync.nightOwlDismissedOn";

export default function Overview() {
  const { currentUser } = useAuth();
  const isFemale = isFemaleUser(currentUser);
  const { ref: heroParallaxRef, offset: heroOffset } = useMouseParallax(6);
  const visitGapDays = useVisitGap();
  const { daysSince: daysSinceFirstVisit } = useFirstVisit();
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [showGuideBanner, setShowGuideBanner] = useState(
    () => localStorage.getItem(GUIDE_BANNER_KEY) !== "1",
  );
  const [showFlashback, setShowFlashback] = useState(() => {
    if (daysSinceFirstVisit < FLASHBACK_MIN_DAYS) return false;
    const dismissedAt = localStorage.getItem(FLASHBACK_DISMISSED_KEY);
    if (!dismissedAt) return true;
    const daysSinceDismiss = (Date.now() - new Date(dismissedAt).getTime()) / 86_400_000;
    return daysSinceDismiss >= FLASHBACK_RESURFACE_DAYS;
  });

  const dismissGuideBanner = () => {
    localStorage.setItem(GUIDE_BANNER_KEY, "1");
    setShowGuideBanner(false);
  };

  const dismissFlashback = () => {
    localStorage.setItem(FLASHBACK_DISMISSED_KEY, new Date().toISOString());
    setShowFlashback(false);
  };

  const currentHour = new Date().getHours();
  const isDeepNight = currentHour >= 1 && currentHour < 5;
  const [showNightOwl, setShowNightOwl] = useState(
    () => isDeepNight && localStorage.getItem(NIGHT_OWL_DISMISSED_KEY) !== toISODate(new Date()),
  );
  const dismissNightOwl = () => {
    localStorage.setItem(NIGHT_OWL_DISMISSED_KEY, toISODate(new Date()));
    setShowNightOwl(false);
  };

  const unlockedAchievementIds = getUnlockedAchievementIds({
    tasks,
    evidenceLibrary,
    researchStages,
    overallProgress: projectMeta.overallProgress,
  });
  const unlockedAchievements = achievements.filter((a) => unlockedAchievementIds.has(a.id));
  const [newAchievement, setNewAchievement] = useState<(typeof achievements)[number] | null>(null);
  const [stageCelebration, setStageCelebration] = useState(false);

  useEffect(() => {
    const seen: string[] = JSON.parse(localStorage.getItem(ACHIEVEMENTS_SEEN_KEY) ?? "[]");
    const seenSet = new Set(seen);
    const freshlyUnlocked = achievements.find(
      (a) => unlockedAchievementIds.has(a.id) && !seenSet.has(a.id),
    );
    if (freshlyUnlocked) {
      setNewAchievement(freshlyUnlocked);
      localStorage.setItem(
        ACHIEVEMENTS_SEEN_KEY,
        JSON.stringify([...seenSet, freshlyUnlocked.id]),
      );
      const timer = setTimeout(() => setNewAchievement(null), 4500);
      return () => clearTimeout(timer);
    }

    const lastSeenStage = localStorage.getItem(LAST_SEEN_STAGE_KEY);
    if (lastSeenStage && lastSeenStage !== projectMeta.currentStageAr) {
      setStageCelebration(true);
      const timer = setTimeout(() => setStageCelebration(false), 4500);
      localStorage.setItem(LAST_SEEN_STAGE_KEY, projectMeta.currentStageAr);
      return () => clearTimeout(timer);
    }
    localStorage.setItem(LAST_SEEN_STAGE_KEY, projectMeta.currentStageAr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weekNumber = Math.floor(daysSinceFirstVisit / 7) + 1;
  const topPerformer = [...teamMembers].sort((a, b) => b.tasksDone - a.tasksDone)[0];

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

  const greeting = getGreeting();
  const dailyQuote = getDailyQuote(new Date(), greeting.period);
  const overdueCount = tasks.filter((t) => t.status === "overdue").length;
  const heroMessage =
    overdueCount > 0
      ? `عندك ${overdueCount} ${overdueCount === 1 ? "مهمة متأخرة" : "مهام متأخرة"} — خلها أول شي ${g(isFemale, "تسوينه", "تسويه")} اليوم.`
      : visitGapDays !== null && visitGapDays >= 2
        ? `غبتِ ${visitGapDays} أيام — طبيعي جدًا، ${g(isFemale, "خذي", "خذ")} وقتك بس لا تنسى إن بحثك يستناك 🌱`
        : visitGapDays === 1
          ? `من زمان ما شفناك من أمس! ${g(isFemale, "رجّعي", "رجّع")} نفسك بخطوة بسيطة اليوم 🌱`
          : priorities.length === 0
            ? `ما عليك شي مستعجل اليوم — وقت زين ${g(isFemale, "تراجعين", "تراجع")} المقترح البحثي أو ${g(isFemale, "ترتاحين", "ترتاح")} شوي ☕`
            : "فريق بحثكم يحقق تقدمًا ثابتًا هذا الأسبوع، كمّلوا بنفس الوتيرة 💪";

  return (
    <div className="space-y-6">
      {showGuideBanner && (
        <div className="flex items-center gap-4 rounded-3xl border border-amber-accent-200 bg-amber-accent-100 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-accent-500 text-white">
            <Compass size={18} />
          </span>
          <p className="min-w-0 flex-1 text-sm font-semibold text-amber-accent-700">
            أول مرة {g(isFemale, "تستخدمين", "تستخدم")} NURSYNC؟{" "}
            {g(isFemale, "راجعي", "راجع")}{" "}
            <Link to="/guide" className="underline underline-offset-2">
              دليل الطالب
            </Link>{" "}
            عشان {g(isFemale, "تعرفين", "تعرف")} وين {g(isFemale, "تروحين", "تروح")} ولاش{" "}
            {g(isFemale, "تضيفين", "تضيف")} مهامك.
          </p>
          <button
            onClick={dismissGuideBanner}
            className="shrink-0 rounded-lg p-1.5 text-amber-accent-600 hover:bg-amber-accent-200"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {showFlashback && (
        <div className="flex items-center gap-4 rounded-3xl border border-brand-200 bg-brand-50 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white">
            <History size={18} />
          </span>
          <p className="min-w-0 flex-1 text-sm font-semibold text-brand-700">
            قبل {daysSinceFirstVisit} {daysSinceFirstVisit === 1 ? "يوم" : "أيام"} كنت بس{" "}
            {g(isFemale, "بادئة", "بادئ")} بحثك من الصفر — الحين عندك{" "}
            {projectMeta.overallProgress}% خلف ظهرك. {g(isFemale, "كملي", "كمل")} بنفس القوة 🌱
          </p>
          <button
            onClick={dismissFlashback}
            className="shrink-0 rounded-lg p-1.5 text-brand-600 hover:bg-brand-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {showNightOwl && (
        <div className="flex items-center gap-4 rounded-3xl border border-violet-100 bg-violet-50 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500 text-white">
            <Moon size={18} />
          </span>
          <p className="min-w-0 flex-1 text-sm font-semibold text-violet-700">
            الساعة كذا وبعدك {g(isFemale, "صاحية", "صاحي")} تراجعين بحثك؟ نحترم الجدّية، بس لا
            تنسى قسط راحتك — بحثك بينتظرك باكر بنفس المكان 🌙
          </p>
          <button
            onClick={dismissNightOwl}
            className="shrink-0 rounded-lg p-1.5 text-violet-600 hover:bg-violet-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Welcome + progress */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div ref={heroParallaxRef} className="lg:col-span-2">
        <Card tone="teal" className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute -left-10 -top-10 h-44 w-44 rounded-full bg-[var(--color-overlay-soft)] transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{ transform: `translate3d(${heroOffset.x * 0.6}px, ${heroOffset.y * 0.6}px, 0)` }}
          />
          <div
            className="pointer-events-none absolute -bottom-16 left-28 h-32 w-32 rounded-full bg-amber-accent-200/50 transition-transform duration-300 ease-out motion-reduce:transition-none"
            style={{ transform: `translate3d(${heroOffset.x * -0.4}px, ${heroOffset.y * -0.4}px, 0)` }}
          />
          <div className="relative">
            <p className="flex items-center gap-2.5 font-display text-2xl font-extrabold text-brand-950">
              <TimeOfDayBadge period={greeting.period} />
              {greeting.text}، {currentUser?.name.split(" ")[0]}
            </p>
            <p className="mt-1 text-sm text-brand-950/55">{heroMessage}</p>

            <div className="mt-6">
              <p className="text-sm font-semibold text-brand-950/70">{projectMeta.name}</p>
              <p className="text-xs text-brand-700" dir="ltr">
                {projectMeta.subtitle}
              </p>
              {weekNumber >= 1 && (
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-950/5 px-2.5 py-1 text-[11px] font-bold text-brand-950/50">
                  🌱 أسبوع رقم {weekNumber} من رحلتكم البحثية
                </span>
              )}
            </div>

            <div
              className={clsx(
                "mt-4 flex items-center gap-2 rounded-2xl px-3.5 py-2.5",
                greeting.period === "night" ? "bg-brand-100/70" : "bg-amber-accent-100/70",
              )}
            >
              {greeting.period === "night" ? (
                <Moon size={16} className="shrink-0 text-brand-700" />
              ) : (
                <Coffee size={16} className="shrink-0 text-amber-accent-600" />
              )}
              <p
                className={clsx(
                  "text-sm font-medium italic",
                  greeting.period === "night" ? "text-brand-700" : "text-amber-accent-700",
                )}
              >
                {dailyQuote}
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--color-overlay-soft)] bg-[var(--color-overlay-soft)] p-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold text-brand-950/60">نسبة تقدم البحث</p>
                  <p className="font-display text-4xl font-extrabold text-brand-950">
                    <CountUp value={projectMeta.overallProgress} suffix="%" />
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TiltCard maxTilt={4}>
            <StatCard
              icon={Milestone}
              label="المرحلة الحالية"
              value={projectMeta.currentStageAr}
              sub={projectMeta.currentStageEn}
              color="brand"
              tone="teal"
            />
          </TiltCard>
          <TiltCard maxTilt={4}>
            <StatCard
              icon={ListTodo}
              label="المهمة الحالية"
              value={projectMeta.currentTask}
              sub="قيد التنفيذ الآن"
              color="amber-accent"
              tone="cream"
            />
          </TiltCard>
          <TiltCard maxTilt={4}>
            <StatCard
              icon={TrendingUp}
              label="الخطوة التالية"
              value={projectMeta.nextStep}
              sub="بعد إكمال الحالية"
              color="sky-accent"
              tone="sky"
            />
          </TiltCard>
          <TiltCard maxTilt={4}>
            <StatCard
              icon={CalendarClock}
              label="الموعد القادم"
              value={formatDateShort(projectMeta.nextDeadlineDate)}
              sub={`${projectMeta.nextDeadlineLabel} — متبقٍ ${nextDeadlineDays} أيام`}
              color="brand"
              tone="violet"
            />
          </TiltCard>
        </div>
      </div>

      <FocusSession />
      <TimeCapsule />

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
          <CardHeader
            title="تقدم الفريق"
            subtitle={topPerformer ? `🌟 ${topPerformer.name.split(" ")[0]} الأكثر إنجازًا هذا الأسبوع` : undefined}
            action={<span className="text-xs font-semibold text-brand-600">عرض الكل</span>}
          />
          <div className="flex justify-between">
            {teamMembers.map((m) => (
              <div key={m.id} className="flex flex-col items-center gap-2">
                <div className="relative">
                  {m.id === topPerformer?.id && (
                    <Crown
                      size={14}
                      className="absolute -top-2 start-1/2 -translate-x-1/2 -translate-y-1/2 rotate-0 fill-amber-accent-400 text-amber-accent-500"
                    />
                  )}
                  <Avatar initials={m.initials} color={m.color} />
                </div>
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
              <CountUp value={reviewedCount} />
              <span className="text-base font-medium text-brand-950/40">
                {" "}
                / <CountUp value={collectedCount} />
              </span>
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

      {unlockedAchievements.length > 0 && (
        <Card>
          <CardHeader title="إنجازاتكم" subtitle="Achievements" />
          <div className="flex flex-wrap gap-3">
            {unlockedAchievements.map((a) => (
              <div
                key={a.id}
                title={a.desc}
                className="flex items-center gap-2.5 rounded-2xl border border-brand-100/70 bg-surface-muted px-3.5 py-2.5"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
                  <a.icon size={15} />
                </span>
                <div>
                  <p className="text-sm font-bold text-brand-950">{a.title}</p>
                  <p className="text-[11px] text-brand-950/45">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {newAchievement && (
        <div className="fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-2xl border border-brand-100 bg-paper px-5 py-3.5 shadow-lg shadow-brand-950/10">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-white">
              <Award size={18} />
            </span>
            <div>
              <p className="text-sm font-bold text-brand-950">إنجاز جديد: {newAchievement.title}</p>
              <p className="text-xs text-brand-950/50">{newAchievement.desc}</p>
            </div>
          </div>
        </div>
      )}

      {stageCelebration && (
        <div className="fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-2xl border border-amber-accent-200 bg-paper px-5 py-3.5 shadow-lg shadow-brand-950/10">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-accent-500 text-white">
              <PartyPopper size={18} />
            </span>
            <div>
              <p className="text-sm font-bold text-brand-950">🎉 أنجزتم مرحلة بحثية كاملة!</p>
              <p className="text-xs text-brand-950/50">وصلتوا لمرحلة {projectMeta.currentStageAr}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
