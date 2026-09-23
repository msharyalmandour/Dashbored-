import { useEffect, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  Circle,
  Coffee,
  Compass,
  Crown,
  GraduationCap,
  History,
  ListTodo,
  Milestone,
  Moon,
  PartyPopper,
  Sparkles,
  TrendingUp,
  UploadCloud,
  Video,
} from "lucide-react";
import Card, { CardHeader } from "../components/ui/Card";
import { AlertCard } from "../components/ui/cards";
import FocusSession from "../components/FocusSession";
import TimeCapsule from "../components/TimeCapsule";
import ShareUpdate from "../components/ShareUpdate";
import TimeOfDayBadge from "../components/TimeOfDayBadge";
import Avatar from "../components/ui/Avatar";
import ProgressBar from "../components/ui/ProgressBar";
import RingProgress from "../components/ui/RingProgress";
import StatCard from "../components/StatCard";
import MiniCalendar from "../components/MiniCalendar";
import PhaseTracker from "../components/PhaseTracker";
import TiltCard from "../components/cinematic/TiltCard";
import CountUp from "../components/cinematic/CountUp";
import { useMouseParallax } from "../hooks/useMouseParallax";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTour } from "../context/TourContext";
import { recentActivity, teamMembers as mockTeamMembers } from "../data/mockData";
import { daysUntil, formatDateLong, formatDateShort, getGreeting, toISODate } from "../lib/date";
import { getDailyQuote } from "../data/motivation";
import { useVisitGap } from "../hooks/useVisitGap";
import { useFirstVisit } from "../hooks/useFirstVisit";
import { useCalendarEvents } from "../hooks/useCalendarEvents";
import { useResearchStages } from "../hooks/useResearchStages";
import { useEvidencePapers } from "../hooks/useEvidencePapers";
import { useProposal } from "../hooks/useProposal";
import { useMethodology } from "../hooks/useMethodology";
import { useTasksData } from "../hooks/useTasksData";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useResearchProject } from "../hooks/useResearchProject";
import { getCurrentStage, getOverallProgress } from "../lib/progress";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { g, isFemaleUser } from "../lib/gender";
import { achievements, getUnlockedAchievementIds } from "../lib/achievements";

const today = isSupabaseConfigured ? new Date() : new Date(2026, 7, 22);
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
const DEADLINE_ALERT_DISMISSED_KEY = "nursync.deadlineAlertDismissedAt";
const DEADLINE_ALERT_RESURFACE_DAYS = 2;
const DEADLINE_ALERT_WINDOW_DAYS = 3;

export default function Overview() {
  const { currentUser, team } = useAuth();
  const { startTour, finished: tourFinished } = useTour();
  const isFemale = isFemaleUser(currentUser);
  const { ref: heroParallaxRef, offset: heroOffset } = useMouseParallax(6);
  const visitGapDays = useVisitGap();
  const { daysSince: daysSinceFirstVisit } = useFirstVisit();
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const { events: calendarEvents } = useCalendarEvents();
  const { stages: realStages } = useResearchStages();
  const { papers: realEvidencePapers } = useEvidencePapers();
  const { sections: realProposalSections, gap: realResearchGap, questions: realResearchQuestions } = useProposal();
  const { methodology: realMethodology } = useMethodology();
  const { tasks: realTasks } = useTasksData();
  const { roster } = useTeamRoster();
  const { project } = useResearchProject();
  const currentStage = getCurrentStage(realStages);
  const realOverallProgress = getOverallProgress(realStages, {
    proposalSections: realProposalSections,
    researchGap: realResearchGap,
    researchQuestions: realResearchQuestions,
    methodology: realMethodology,
    evidencePapers: realEvidencePapers,
  });
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

  const [showDeadlineAlert, setShowDeadlineAlert] = useState(() => {
    const dismissedAt = localStorage.getItem(DEADLINE_ALERT_DISMISSED_KEY);
    if (!dismissedAt) return true;
    const daysSinceDismiss = (Date.now() - new Date(dismissedAt).getTime()) / 86_400_000;
    return daysSinceDismiss >= DEADLINE_ALERT_RESURFACE_DAYS;
  });
  const dismissDeadlineAlert = () => {
    localStorage.setItem(DEADLINE_ALERT_DISMISSED_KEY, new Date().toISOString());
    setShowDeadlineAlert(false);
  };

  const unlockedAchievementIds = getUnlockedAchievementIds({
    tasks: realTasks,
    evidenceLibrary: realEvidencePapers,
    researchStages: realStages,
    overallProgress: realOverallProgress,
  });
  const unlockedAchievements = achievements.filter((a) => unlockedAchievementIds.has(a.id));
  const { showToast } = useToast();

  useEffect(() => {
    const seen: string[] = JSON.parse(localStorage.getItem(ACHIEVEMENTS_SEEN_KEY) ?? "[]");
    const seenSet = new Set(seen);
    const freshlyUnlocked = achievements.find(
      (a) => unlockedAchievementIds.has(a.id) && !seenSet.has(a.id),
    );
    if (freshlyUnlocked) {
      showToast({
        title: `إنجاز جديد: ${freshlyUnlocked.title}`,
        desc: freshlyUnlocked.desc,
        icon: Award,
        tone: "brand",
      });
      localStorage.setItem(
        ACHIEVEMENTS_SEEN_KEY,
        JSON.stringify([...seenSet, freshlyUnlocked.id]),
      );
      return;
    }

    if (currentStage) {
      const lastSeenStage = localStorage.getItem(LAST_SEEN_STAGE_KEY);
      if (lastSeenStage && lastSeenStage !== currentStage.titleAr) {
        showToast({
          title: "🎉 أنجزتم مرحلة بحثية كاملة!",
          desc: `وصلتوا لمرحلة ${currentStage.titleAr}`,
          icon: PartyPopper,
          tone: "amber",
        });
        localStorage.setItem(LAST_SEEN_STAGE_KEY, currentStage.titleAr);
        return;
      }
      localStorage.setItem(LAST_SEEN_STAGE_KEY, currentStage.titleAr);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weekNumber = Math.floor(daysSinceFirstVisit / 7) + 1;
  const topPerformer = [...roster].sort((a, b) => b.tasksDone - a.tasksDone)[0];
  const topPerformerId = topPerformer && topPerformer.tasksDone > 0 ? topPerformer.id : null;

  const projectTitle = project?.title || "مشروعكم البحثي";
  const projectSubtitle = project?.description ?? "";
  const deadline = project?.targetSubmissionDate ?? null;
  const remainingDays = deadline ? daysUntil(deadline, today) : null;

  const reviewedCount = realEvidencePapers.filter((p) => p.reviewStatus === "reviewed").length;
  const collectedCount = realEvidencePapers.length;
  const remainingCount = collectedCount - reviewedCount;
  const litReviewPct = collectedCount > 0 ? Math.round((reviewedCount / collectedCount) * 100) : 0;

  const priorities = [...realTasks]
    .filter((t) => t.status !== "done")
    .sort((a, b) => {
      const order = { overdue: 0, "in-progress": 1, todo: 2, done: 3 };
      return order[a.status] - order[b.status];
    })
    .slice(0, 5);
  const currentTask = priorities[0]?.title;
  const nextStep = priorities[1]?.title;

  const upcoming = calendarEvents
    .filter((e) => e.date >= todayIso)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 4);

  const dayEvents = calendarEvents
    .filter((e) => e.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  const memberById = (id: string) => roster.find((m) => m.id === id);
  const mockMemberById = (id: string) => mockTeamMembers.find((m) => m.id === id)!;

  const greeting = getGreeting();
  const dailyQuote = getDailyQuote(new Date(), greeting.period);
  const overdueCount = realTasks.filter((t) => t.status === "overdue").length;

  const nextMeeting = calendarEvents
    .filter((e) => e.type === "meeting" && e.date >= todayIso)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];

  const nearestDeadlineEvent = calendarEvents
    .filter((e) => e.type === "deadline" && e.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const nearestDeadlineEventDays = nearestDeadlineEvent
    ? daysUntil(nearestDeadlineEvent.date, today)
    : null;
  const deadlineAlertActive =
    overdueCount > 0 ||
    (nearestDeadlineEventDays !== null && nearestDeadlineEventDays <= DEADLINE_ALERT_WINDOW_DAYS);

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

  const showEmptyProgressState = realOverallProgress === 0 && !currentStage;

  return (
    <div className="space-y-6">
      {showGuideBanner && (
        <AlertCard
          tone="warning"
          icon={Compass}
          onDismiss={dismissGuideBanner}
          action={
            !tourFinished && (
              <button
                onClick={startTour}
                className="shrink-0 rounded-xl bg-gradient-to-l from-amber-accent-500 to-amber-accent-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-amber-accent-500/30 hover:from-amber-accent-600 hover:to-amber-accent-700"
              >
                ابدأ الجولة
              </button>
            )
          }
        >
          أول مرة {g(isFemale, "تستخدمين", "تستخدم")} Wesync؟{" "}
          {tourFinished ? (
            <>
              خلّصتوا الجولة التعريفية 🎉 لو احتجتوا تفاصيل أكثر{" "}
              {g(isFemale, "راجعي", "راجع")}{" "}
              <Link to="/guide" className="underline underline-offset-2">
                دليل الطالب
              </Link>
              .
            </>
          ) : (
            <>
              خلّي مرشدنا ياخذك بجولة سريعة على أهم صفحات الموقع، أو{" "}
              {g(isFemale, "راجعي", "راجع")}{" "}
              <Link to="/guide" className="underline underline-offset-2">
                دليل الطالب
              </Link>{" "}
              المكتوب.
            </>
          )}
        </AlertCard>
      )}

      {showFlashback && (
        <AlertCard tone="success" icon={History} onDismiss={dismissFlashback}>
          قبل {daysSinceFirstVisit} {daysSinceFirstVisit === 1 ? "يوم" : "أيام"} كنت بس{" "}
          {g(isFemale, "بادئة", "بادئ")} بحثك من الصفر — الحين عندك{" "}
          {realOverallProgress}% خلف ظهرك. {g(isFemale, "كملي", "كمل")} بنفس القوة 🌱
        </AlertCard>
      )}

      {showNightOwl && (
        <AlertCard tone="violet" icon={Moon} onDismiss={dismissNightOwl}>
          الساعة كذا وبعدك {g(isFemale, "صاحية", "صاحي")} تراجعين بحثك؟ نحترم الجدّية، بس لا
          تنسى قسط راحتك — بحثك بينتظرك باكر بنفس المكان 🌙
        </AlertCard>
      )}

      {showDeadlineAlert && deadlineAlertActive && (
        <AlertCard
          tone={overdueCount > 0 ? "danger" : "warning"}
          icon={AlertTriangle}
          onDismiss={dismissDeadlineAlert}
        >
          {overdueCount > 0 ? (
            <>
              عندكم {overdueCount} {overdueCount === 1 ? "مهمة متأخرة" : "مهام متأخرة"} —{" "}
              <Link to="/tasks" className="underline underline-offset-2">
                راجعوها أول شي
              </Link>{" "}
              قبل أي شي ثاني.
            </>
          ) : (
            <>
              موعد قريب: <span className="font-extrabold">{nearestDeadlineEvent!.title}</span>{" "}
              بعد {nearestDeadlineEventDays} {nearestDeadlineEventDays === 1 ? "يوم" : "أيام"} —{" "}
              <Link to="/calendar" className="underline underline-offset-2">
                شوفوا التقويم
              </Link>
              .
            </>
          )}
        </AlertCard>
      )}

      {team?.supervisorNote && (
        <div className="flex items-start gap-4 rounded-3xl border border-violet-100 bg-violet-50 px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-500 text-white">
            <GraduationCap size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-violet-500">
              ملاحظة من مشرفكم
              {team.supervisorNoteAt && ` — ${formatDateLong(team.supervisorNoteAt.slice(0, 10))}`}
            </p>
            <p className="mt-1 text-sm font-semibold text-violet-800">{team.supervisorNote}</p>
          </div>
        </div>
      )}

      {/* Welcome + progress — WESYNC OBSIDIAN × EMBER hero. يستخدم متغيرات
          الثيم القياسية (brand-*) مباشرة، مو نسخة محلية — فلو غيّرتوا الثيم
          من المبدّل (أخضر/كحلي/أساسي) الهيرو يتلوّن معه تلقائيًا بدل ما
          يبقى برتقالي ثابت. */}
      <div className="space-y-4">
        <div
          ref={heroParallaxRef}
          className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-500/50 via-white/5 to-brand-700/40 p-[1px] shadow-2xl shadow-black/50"
        >
          <div className="relative overflow-hidden rounded-[calc(2rem-1px)] bg-paper p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 animate-[ember-drift_13s_ease-in-out_infinite] rounded-full bg-brand-500/25 blur-[90px] motion-reduce:animate-none" />
            <div
              className="pointer-events-none absolute -left-16 bottom-0 h-60 w-60 rounded-full bg-[var(--color-overlay-soft)] blur-[80px] transition-transform duration-300 ease-out motion-reduce:transition-none"
              style={{ transform: `translate3d(${heroOffset.x * 0.5}px, ${heroOffset.y * 0.5}px, 0)` }}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-600/60 to-transparent" />

            <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Greeting + progress */}
              <div className="lg:col-span-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-500/30 bg-white/5 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-brand-700 backdrop-blur-sm">
                  <Sparkles size={11} />
                  مساحتكم البحثية
                </span>

                <p className="mt-3 flex items-center gap-2.5 font-display text-2xl font-extrabold text-brand-950 sm:text-3xl">
                  <TimeOfDayBadge period={greeting.period} />
                  {greeting.text}،{" "}
                  <span className="bg-gradient-to-l from-brand-500 to-brand-700 bg-clip-text text-transparent">
                    {currentUser?.name.split(" ")[0]}
                  </span>
                </p>
                <p className="mt-1.5 text-sm text-brand-950/50">{heroMessage}</p>

                <div className="mt-6">
                  <p className="text-sm font-semibold text-brand-950/80">{projectTitle}</p>
                  {projectSubtitle && (
                    <p className="text-xs text-brand-700" dir="ltr">
                      {projectSubtitle}
                    </p>
                  )}
                  {weekNumber >= 1 && (
                    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-bold text-brand-950/50">
                      🔥 أسبوع رقم {weekNumber} من رحلتكم البحثية
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.03] px-3.5 py-2.5 backdrop-blur-sm">
                  {greeting.period === "night" ? (
                    <Moon size={16} className="shrink-0 text-brand-700" />
                  ) : (
                    <Coffee size={16} className="shrink-0 text-brand-600" />
                  )}
                  <p className="text-sm font-medium italic text-brand-950/70">{dailyQuote}</p>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-5 rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-md">
                  <RingProgress value={realOverallProgress} size={104} strokeWidth={9}>
                    <span className="font-display text-xl font-extrabold text-brand-950">
                      <CountUp value={realOverallProgress} suffix="%" />
                    </span>
                  </RingProgress>
                  <div className="min-w-0 flex-1">
                    {showEmptyProgressState ? (
                      <>
                        <p className="font-display text-base font-bold text-brand-950">
                          ابدأوا رحلتكم البحثية اليوم
                        </p>
                        <p className="mt-1 text-sm text-brand-950/50">
                          كل بحث عظيم يبدأ بخطوة أولى — عبّوا مقترحكم البحثي وشوفوا التقدم يتحرك هنا.
                        </p>
                        <Link
                          to="/proposal"
                          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-brand-500 to-brand-600 px-4 py-2 text-xs font-bold text-white shadow-[0_0_16px_-2px_rgba(255,106,0,0.5)] hover:brightness-110"
                        >
                          <Sparkles size={14} />
                          ابدأوا بالمقترح البحثي
                        </Link>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-semibold text-brand-950/50">نسبة تقدم البحث الكلية</p>
                        <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-brand-950/80">
                          <CalendarClock size={15} className="shrink-0" />
                          {deadline
                            ? `الموعد النهائي — ${formatDateLong(deadline)} (متبقٍ ${remainingDays} يومًا)`
                            : "ما فيه موعد نهائي محدد بعد"}
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <Link
                  to="/files"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs font-bold text-brand-950/70 backdrop-blur-sm transition-colors hover:border-brand-500/40 hover:text-brand-700"
                >
                  <UploadCloud size={14} className="text-brand-600" />
                  اسحبوا أي ملف هنا
                </Link>
              </div>

              {/* Next meeting — real data, integrated into the hero */}
              <div className="flex flex-col justify-center">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] backdrop-blur-md">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-950/50">
                    <Video size={13} className="text-brand-600" />
                    الاجتماع القادم
                  </p>
                  {nextMeeting ? (
                    <>
                      <p className="mt-3 font-display text-lg font-extrabold text-brand-950">
                        {nextMeeting.title}
                      </p>
                      <p className="mt-1 text-sm text-brand-700">
                        {formatDateLong(nextMeeting.date)} — {nextMeeting.time}
                      </p>
                      {nextMeeting.location && (
                        <p className="mt-1 truncate text-xs text-brand-950/50">{nextMeeting.location}</p>
                      )}
                      <Link
                        to="/calendar"
                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-brand-500 to-brand-600 px-3.5 py-2 text-xs font-bold text-white shadow-[0_0_16px_-2px_rgba(255,106,0,0.5)] hover:brightness-110"
                      >
                        افتحوا التقويم
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="mt-3 text-sm text-brand-950/60">ما فيه اجتماع مجدول قريب.</p>
                      <Link
                        to="/calendar"
                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2 text-xs font-bold text-brand-700 transition-colors hover:border-brand-500/40"
                      >
                        جدولوا اجتماعًا
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="stagger-in" style={{ "--stagger-i": 0 } as CSSProperties}>
            <TiltCard maxTilt={4}>
              <StatCard
                icon={Milestone}
                label="المرحلة الحالية"
                value={currentStage?.titleAr ?? "لم تبدأ مرحلة بعد"}
                sub={currentStage?.titleEn ?? "Not started yet"}
                color="brand"
                tone="teal"
              />
            </TiltCard>
          </div>
          <div className="stagger-in" style={{ "--stagger-i": 1 } as CSSProperties}>
            <TiltCard maxTilt={4}>
              <StatCard
                icon={ListTodo}
                label="المهمة الحالية"
                value={currentTask ?? "ما فيه مهمة نشطة الحين"}
                sub={currentTask ? "قيد التنفيذ الآن" : "أسندوا أول مهمة من صفحة المهام"}
                color="amber-accent"
                tone="cream"
              />
            </TiltCard>
          </div>
          <div className="stagger-in" style={{ "--stagger-i": 2 } as CSSProperties}>
            <TiltCard maxTilt={4}>
              <StatCard
                icon={TrendingUp}
                label="الخطوة التالية"
                value={nextStep ?? "—"}
                sub={nextStep ? "بعد إكمال الحالية" : "ما فيه خطوة تالية محددة"}
                color="sky-accent"
                tone="sky"
              />
            </TiltCard>
          </div>
          <div className="stagger-in" style={{ "--stagger-i": 3 } as CSSProperties}>
            <TiltCard maxTilt={4}>
              <StatCard
                icon={CalendarClock}
                label="الموعد القادم"
                value={nearestDeadlineEvent ? formatDateShort(nearestDeadlineEvent.date) : "لا يوجد"}
                sub={
                  nearestDeadlineEvent
                    ? `${nearestDeadlineEvent.title} — متبقٍ ${nearestDeadlineEventDays} ${nearestDeadlineEventDays === 1 ? "يوم" : "أيام"}`
                    : "أضيفوا موعدًا بالتقويم"
                }
                color="brand"
                tone="violet"
              />
            </TiltCard>
          </div>
        </div>
      </div>

      <FocusSession />
      <ShareUpdate />
      <TimeCapsule />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Research journey + priorities */}
        <div className="space-y-4 lg:col-span-2">
          <Card tone="cream">
            <CardHeader
              title="رحلة تقدم البحث"
              subtitle="Research Progress Journey"
            />
            <PhaseTracker stages={realStages} />
          </Card>

          <Card interactive>
            <CardHeader
              title="مهامي القادمة"
              action={
                <Link
                  to="/tasks"
                  className="-m-2 select-none p-2 text-xs font-semibold text-brand-600 hover:underline"
                >
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
                      {assignee && <Avatar initials={assignee.initials} color={assignee.color} size="sm" />}
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
              action={
                <Link
                  to="/calendar"
                  className="-m-2 select-none p-2 text-xs font-semibold text-brand-600 hover:underline"
                >
                  عرض الكل
                </Link>
              }
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
        <Card tone="violet" interactive>
          <CardHeader
            title="تقدم الفريق"
            subtitle={topPerformerId ? `🌟 ${topPerformer!.name.split(" ")[0]} الأكثر إنجازًا هذا الأسبوع` : undefined}
            action={
              <Link
                to="/team"
                className="-m-2 select-none p-2 text-xs font-semibold text-brand-600 hover:underline"
              >
                عرض الكل
              </Link>
            }
          />
          <div className="flex justify-between">
            {roster.map((m) => (
              <div key={m.id} className="flex flex-col items-center gap-2">
                <div className="relative">
                  {m.id === topPerformerId && (
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

        <Card tone="amber" interactive>
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
          <ProgressBar value={litReviewPct} color="amber-accent" track="bg-surface-muted" />
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-brand-950/70">الدراسات المتبقية</span>
            <span className="font-semibold text-brand-950">{remainingCount}</span>
          </div>
        </Card>

        <Card interactive>
          <CardHeader
            title="آخر نشاط للفريق"
            action={
              <Link
                to="/team"
                className="-m-2 select-none p-2 text-xs font-semibold text-brand-600 hover:underline"
              >
                عرض الكل
              </Link>
            }
          />
          {isSupabaseConfigured ? (
            <p className="py-6 text-center text-sm text-brand-950/40">
              ما فيه نشاط مسجَّل للفريق بعد — بيظهر هنا أول ما يبدأ الفريق يشتغل 🌱
            </p>
          ) : (
            <ul className="space-y-3">
              {recentActivity.map((activity) => {
                const member = mockMemberById(activity.memberId);
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
          )}
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

    </div>
  );
}
