import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Compass, PartyPopper } from "lucide-react";
import { AlertCard } from "../components/ui/cards";
import Dialog from "../components/ui/Dialog";
import NotificationsBell from "../components/NotificationsBell";
import HomeToasts from "../components/home/HomeToasts";
import ErrorBoundary from "../components/ErrorBoundary";
import { MeetLuxCard, TeamRow, WeekLuxCard } from "../components/home/TeamMeetLux";
import {
  AgentPill,
  AgentScene,
  DeadlineCard,
  GlassHeader,
  JourneyCard,
  MobileTiles,
  ProgressCard,
  TeamChartCard,
  TodoCard,
  countAr,
  type AreaBar,
  type JourneyStep,
} from "../components/home/GlassHome";
import { V3Glow, num } from "../components/v3/WriteHeader";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useTour } from "../context/TourContext";
import type { Task } from "../data/types";
import { arabicMonths, daysUntil, formatDateLong, formatDateShort, toISODate } from "../lib/date";
import { useResearchStages } from "../hooks/useResearchStages";
import { useEvidencePapers } from "../hooks/useEvidencePapers";
import { useProposal } from "../hooks/useProposal";
import { useMethodology } from "../hooks/useMethodology";
import { useEthicalApproval } from "../hooks/useEthicalApproval";
import { useTasksData } from "../hooks/useTasksData";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useResearchProject } from "../hooks/useResearchProject";
import { useSurveys, useSurveyResponseCounts } from "../hooks/useSurveys";
import { summarizeCollection } from "../lib/dataCollection";
import { computeNextSteps } from "../lib/nextSteps";
import { isStageReady } from "../lib/stageAdvance";
import { getCurrentStage, getOverallProgress } from "../lib/progress";
import { splitReminders } from "../lib/taskReminders";
import { isLate, todoList, weeklySeries } from "../lib/homeCalm";
import { METHOD_READY, ethicsStepsDone, methodologyReadyCount } from "../lib/writeProgress";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { isEn, tr } from "../lib/i18n";

// بالعرض التجريبي البيانات مثبّتة على أغسطس ٢٠٢٦، فنثبّت «اليوم» عليه عشان الحسابات تطلع منطقية
const now = isSupabaseConfigured ? new Date() : new Date(2026, 7, 22, 6);
const todayIso = toISODate(now);

const GUIDE_BANNER_KEY = "nursync.guideBannerDismissed";
const LAST_SEEN_STAGE_KEY = "nursync.lastSeenStage";
const METHOD_TOTAL = Object.keys(METHOD_READY).length;

const rise = (i: number) => ({ ["--v3-i" as string]: i }) as CSSProperties;

export default function Overview() {
  const { currentUser, mode, isLeader, canWrite } = useAuth();
  const { startTour, finished: tourFinished } = useTour();
  const { showToast } = useToast();
  const { stages } = useResearchStages();
  const { papers } = useEvidencePapers();
  const { sections, gap, questions } = useProposal();
  const { methodology } = useMethodology();
  const { ethicalApproval } = useEthicalApproval();
  const { tasks: allTasks, addTask, updateStatus } = useTasksData();
  const { roster } = useTeamRoster();
  const { project, updateProject } = useResearchProject();
  const { surveys } = useSurveys();
  const surveyCounts = useSurveyResponseCounts(surveys);
  const collection = summarizeCollection(surveys, surveyCounts, methodology.sampling.sampleSize);
  const currentStage = getCurrentStage(stages);

  const [showGuide, setShowGuide] = useState(() => {
    try {
      return localStorage.getItem(GUIDE_BANNER_KEY) !== "1";
    } catch {
      return false;
    }
  });
  const [editDeadline, setEditDeadline] = useState(false);
  const [deadlineDraft, setDeadlineDraft] = useState("");
  const [deadlineError, setDeadlineError] = useState<string | null>(null);

  // احتفال انتقال المرحلة (مثل قبل)
  useEffect(() => {
    if (!currentStage) return;
    try {
      const last = localStorage.getItem(LAST_SEEN_STAGE_KEY);
      if (last && last !== currentStage.titleAr) {
        showToast({ title: tr("🎉 أنجزتم مرحلة بحثية كاملة!"), desc: tr("وصلتوا لمرحلة {0}", currentStage.titleAr), icon: PartyPopper, tone: "amber" });
      }
      localStorage.setItem(LAST_SEEN_STAGE_KEY, currentStage.titleAr);
    } catch {
      // بدون تخزين: بدون احتفال
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStage?.titleAr]);

  // التذكيرات («تذكير: …») مو مهام لحالها — نفس منطق صفحة المهام
  const tasks = useMemo(() => splitReminders(allTasks).visible, [allTasks]);
  const firstName = (currentUser?.name ?? "").split(" ")[0];

  const deadline = project?.targetSubmissionDate ?? null;
  const daysLeft = deadline ? daysUntil(deadline, now) : null;
  const supervisor = project?.supervisorName?.trim();

  // ── الأقسام والأدبيات والمنهجية والأخلاقيات ──
  const orderedSections = [...sections].sort((a, b) => a.order - b.order);
  const secTotal = orderedSections.length;
  const secDone = orderedSections.filter((s) => s.status === "done").length;
  const currentSection = orderedSections.find((s) => s.status !== "done");
  const reviewed = papers.filter((p) => p.reviewStatus === "reviewed").length;
  const methReady = methodologyReadyCount(methodology);
  const ethicsDone = ethicsStepsDone(ethicalApproval).filter(Boolean).length;
  const litStageDone = stages.some((s) => s.stageKey === "literature-review" && s.status === "done");
  const methStageDone = stages.some((s) => s.stageKey === "methodology" && s.status === "done");
  const sectionOf = (t: Task) => sections.find((s) => s.key === t.sectionKey);
  const taskLink = (t: Task) => (t.sectionKey && sectionOf(t) ? `/proposal?section=${t.sectionKey}` : `/tasks?task=${t.id}`);
  const sectionTag = (t: Task) => {
    const sec = sectionOf(t);
    return sec ? tr("المقترح · القسم {0}", num(sec.order)) : "";
  };

  // ── تقدّم البحث ──
  const pct = getOverallProgress(stages, {
    proposalSections: sections,
    researchGap: gap,
    researchQuestions: questions,
    methodology,
    evidencePapers: papers,
    dataCollection: { collected: collection.collected, target: collection.target },
  });
  const stagesDone = stages.filter((s) => s.status === "done").length;
  const [lastWeek, thisWeek] = weeklySeries(tasks, todayIso, 2);
  const weekDiff = (thisWeek?.done ?? 0) - (lastWeek?.done ?? 0);
  const progressNote =
    weekDiff > 0
      ? tr("أحسن من الأسبوع اللي قبله بـ{0} 👏", countAr(weekDiff, tr("مهمة"), tr("مهمتين"), "{0} مهام", "{0} مهمة"))
      : currentStage
        ? tr("المرحلة الحالية: {0}", isEn ? currentStage.titleEn : currentStage.titleAr)
        : tr("كل المراحل خلصت 🎉");

  // ── رحلة البحث: الموضوع ← المقترح ← الأدبيات ← المنهجية ← التسليم ──
  const journey: JourneyStep[] = useMemo(() => {
    const hasTitle = !!project?.title?.trim();
    const areas = [
      { key: "topic", label: tr("الموضوع"), done: hasTitle, d: hasTitle ? 1 : 0, n: 1, unit: "", to: "/proposal" },
      { key: "proposal", label: tr("المقترح"), done: secTotal > 0 && secDone === secTotal, d: secDone, n: secTotal, unit: countAr(secTotal, tr("قسم"), tr("قسمين"), "{0} أقسام", "{0} قسم"), to: "/proposal" },
      { key: "lit", label: tr("الأدبيات"), done: litStageDone || (papers.length > 0 && reviewed === papers.length), d: reviewed, n: papers.length, unit: countAr(papers.length, tr("دراسة"), tr("دراستين"), "{0} دراسات", "{0} دراسة"), to: "/literature-review" },
      { key: "method", label: tr("المنهجية"), done: methStageDone || methReady === METHOD_TOTAL, d: methReady, n: METHOD_TOTAL, unit: countAr(METHOD_TOTAL, tr("جزء"), tr("جزأين"), "{0} أجزاء", "{0} جزء"), to: "/methodology" },
    ];
    const cur = areas.findIndex((a) => !a.done);
    const steps: JourneyStep[] = areas.map((a, i) => {
      const started = a.d > 0 && a.key !== "topic";
      const progress = tr("{0} من {1}", num(a.d), a.unit);
      return {
        key: a.key,
        label: a.label,
        to: a.to,
        state: a.done ? "done" : i === cur ? "now" : "todo",
        long: a.done ? tr("خلص ✓") : started ? progress : tr("ما بدأت"),
        short: a.done ? "✓" : started ? tr("{0} من {1}", num(a.d), num(a.n)) : "—",
      };
    });
    const dl = deadline ? new Date(`${deadline}T00:00:00`) : null;
    steps.push({
      key: "deliver",
      label: tr("التسليم"),
      to: "/timeline",
      state: "deliver",
      long: deadline ? (isEn ? formatDateShort(deadline) : `${num(dl!.getDate())} ${arabicMonths[dl!.getMonth()]}`) : tr("ما انحدد"),
      short: deadline ? (isEn ? formatDateShort(deadline) : `${num(dl!.getDate())} ${arabicMonths[dl!.getMonth()].slice(0, 3)}`) : "—",
    });
    return steps;
  }, [project?.title, secTotal, secDone, litStageDone, papers.length, reviewed, methStageDone, methReady, deadline]);
  const nowStep = journey.find((s) => s.state === "now");
  const journeyNote = nowStep?.key === "proposal" && currentSection ? tr("القسم {0} من {1}", num(currentSection.order), num(secTotal)) : nowStep ? nowStep.long : journey[journey.length - 1].long;

  // ── أشرطة «باقي على التسليم» ──
  const bars: AreaBar[] = [
    {
      key: "proposal",
      label: tr("المقترح"),
      icon: "proposal",
      done: secDone,
      total: secTotal,
      late: orderedSections.filter((s) => s.status !== "done" && tasks.some((t) => t.sectionKey === s.key && isLate(t, todayIso))).length,
      to: "/proposal",
    },
    { key: "lit", label: tr("الأدبيات"), icon: "lit", done: reviewed, total: papers.length, late: 0, to: "/literature-review" },
    { key: "method", label: tr("المنهجية"), icon: "method", done: methReady, total: METHOD_TOTAL, late: 0, to: "/methodology" },
    { key: "ethics", label: tr("الأخلاقيات"), icon: "ethics", done: ethicsDone, total: 4, late: 0, to: "/ethical-approval" },
  ];

  // ── الزر الأساسي بالجوال: أهم مهمة (عليك أول)، وإلا خطوة الرحلة المقترحة ──
  const openTodo = todoList(tasks, todayIso, { limit: 50 }).items.filter((r) => r.kind !== "done").map((r) => r.task);
  const nextTask = openTodo.find((t) => t.assigneeId === currentUser?.id) ?? openTodo[0];
  const journeyStep = computeNextSteps({
    stageReady:
      !!currentStage &&
      isStageReady(
        currentStage,
        { dataCollection: { collected: collection.collected, target: collection.target }, proposalSections: sections, researchGap: gap, researchQuestions: questions, methodology, evidencePapers: papers },
        project?.title ?? "",
      ),
    todayIso,
    currentUserId: currentUser?.id ?? "",
    tasks,
    stages,
    sections,
    hasDeadline: !!deadline,
    evidenceCount: papers.length,
    hasTitle: !!project?.title?.trim(),
  })[0];
  const primary = nextTask ? { to: taskLink(nextTask), label: tr("افتح «{0}» ←", nextTask.title) } : journeyStep ? { to: journeyStep.to, label: `${journeyStep.cta} ←` } : null;

  // ── بطاقات مشهد الوكيل (من بيانات المشروع) ──
  const agentCards = [
    { title: tr("المقترح"), sub: currentSection ? (isEn ? currentSection.labelEn : currentSection.labelAr) : secTotal ? tr("خلص ✓") : tr("ابدأوا الكتابة") },
    { title: tr("الأدبيات"), sub: papers.length ? countAr(papers.length, tr("دراسة وحدة"), tr("دراستين"), "{0} دراسات", "{0} دراسة") : tr("ما فيه دراسات بعد") },
    { title: tr("المنهجية"), sub: methodology.studyDesign.trim() || (methReady ? tr("{0} من {1}", num(methReady), num(METHOD_TOTAL)) : tr("ما بدأت")) },
    { title: tr("ملاحظات المشرف/ة"), sub: supervisor || tr("المشرف/ة") },
  ];

  const toggleTask = async (t: Task, done: boolean) => {
    const { error } = await updateStatus(t.id, done ? "done" : "todo");
    if (error) showToast({ title: tr("ما قدرنا نحفظ المهمة"), desc: error, icon: AlertTriangle, tone: "rose" });
  };
  const addTodayTask = async (title: string) => {
    if (!currentUser) return false;
    const { error } = await addTask({ title, description: "", assigneeId: currentUser.id, dueDate: todayIso, priority: "medium" });
    if (error) {
      showToast({ title: tr("ما قدرنا نضيف المهمة"), desc: error, icon: AlertTriangle, tone: "rose" });
      return false;
    }
    return true;
  };

  const saveDeadline = async () => {
    if (!deadlineDraft) return;
    const { error } = await updateProject({ targetSubmissionDate: deadlineDraft });
    if (error) {
      setDeadlineError(error);
      return;
    }
    setDeadlineError(null);
    setEditDeadline(false);
  };
  const openDeadlineEditor = () => {
    setDeadlineDraft(deadline ?? toISODate(new Date(now.getTime() + 30 * 86400000)));
    setDeadlineError(null);
    setEditDeadline(true);
  };

  return (
    <div className="v3 relative">
      <V3Glow />
      <ErrorBoundary>
        <HomeToasts />
      </ErrorBoundary>

      {showGuide && (
        <div className="relative mb-4">
          <AlertCard
            tone="warning"
            icon={Compass}
            onDismiss={() => {
              try {
                localStorage.setItem(GUIDE_BANNER_KEY, "1");
              } catch {
                // ما يهم
              }
              setShowGuide(false);
            }}
            action={
              !tourFinished && (
                <button onClick={startTour} className="v3-bd shrink-0 !min-h-[40px] !text-sm">
                  {tr("ابدأ الجولة")}
                </button>
              )
            }
          >
            {tr("أول مرة تستخدمون Wesync؟ خذوا جولة سريعة على أهم الصفحات، أو افتحوا ")}
            <Link to="/guide" className="underline underline-offset-2">
              {tr("دليل الطالب")}
            </Link>
            .
          </AlertCard>
        </div>
      )}

      {/* ── الترحيب + زر الوكيل + الجرس ── */}
      <GlassHeader
        firstName={firstName}
        now={now}
        aside={
          <div className="hidden items-center gap-3 lg:flex">
            <AgentPill firstName={firstName} />
            <NotificationsBell />
          </div>
        }
      />

      {/* ── الصف الأول: To-do · تقدّم البحث · باقي على التسليم (الجوال: التقدّم أول، بعده البلاطتين، بعده To-do والزر) ── */}
      <div className="relative mb-2.5 grid grid-cols-1 items-stretch gap-2.5 lg:mb-[18px] lg:grid-cols-3 lg:gap-[18px]">
        <ErrorBoundary>
          <ProgressCard className="order-1 lg:order-2" style={rise(1)} pct={pct} stagesDone={stagesDone} stagesTotal={stages.length} note={progressNote} />
        </ErrorBoundary>
        <div className="order-2 lg:hidden">
          <MobileTiles deadline={deadline} daysLeft={daysLeft} weekDone={thisWeek?.done ?? 0} weekDiff={weekDiff} canWrite={canWrite} onSetDeadline={openDeadlineEditor} />
        </div>
        <ErrorBoundary>
          <TodoCard
            className="order-3 lg:order-1"
            style={rise(2)}
            tasks={tasks}
            today={todayIso}
            roster={roster}
            canWrite={canWrite}
            sectionTag={sectionTag}
            taskLink={taskLink}
            onToggle={toggleTask}
            onAdd={addTodayTask}
          />
        </ErrorBoundary>
        {primary && (
          <Link to={primary.to} className="hg-primary order-4 lg:hidden">
            <span dir="auto">{primary.label}</span>
          </Link>
        )}
        <ErrorBoundary>
          <DeadlineCard className="hidden lg:order-3 lg:flex" style={rise(3)} deadline={deadline} daysLeft={daysLeft} bars={bars} canWrite={canWrite} onSetDeadline={openDeadlineEditor} />
        </ErrorBoundary>
      </div>

      {/* ── رحلة البحث + إنجاز الفريق ── */}
      <div className="relative mb-3 grid grid-cols-1 items-stretch gap-2.5 lg:mb-[18px] lg:grid-cols-[1.75fr_1fr] lg:gap-[18px]">
        <ErrorBoundary>
          <JourneyCard steps={journey} headerNote={journeyNote} style={rise(4)} />
        </ErrorBoundary>
        <ErrorBoundary>
          <TeamChartCard className="hidden lg:block" tasks={tasks} today={todayIso} style={rise(5)} />
        </ErrorBoundary>
      </div>

      {/* ── وكيل Wesync ── */}
      <ErrorBoundary>
        <AgentScene cards={agentCards} style={rise(6)} />
      </ErrorBoundary>

      {/* ── الفريق مع بعض (بعرض الصفحة) + الاجتماع الجاي (يمين) وهالأسبوع (يسار) ── */}
      <ErrorBoundary>
        <TeamRow tasks={tasks} today={todayIso} style={rise(7)} />
      </ErrorBoundary>
      <div className="relative mb-4 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-[1.1fr_1fr] lg:gap-[18px]">
        <ErrorBoundary>
          <MeetLuxCard now={now} style={rise(8)} />
        </ErrorBoundary>
        <ErrorBoundary>
          <WeekLuxCard today={todayIso} now={now} style={rise(8)} />
        </ErrorBoundary>
      </div>

      {mode !== "supabase" && <p className="v3-mut relative mt-3 text-center text-xs">{tr("عرض تجريبي — التاريخ مثبّت على {0}", formatDateLong(todayIso))}</p>}

      <Dialog open={editDeadline} onClose={() => setEditDeadline(false)} title={tr("موعد التسليم")}>
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            {tr("تاريخ التسليم")}
            <input type="date" value={deadlineDraft} onChange={(e) => setDeadlineDraft(e.target.value)} className="v3-select w-full [color-scheme:dark]" />
          </label>
          {deadlineError && (
            <p className="m-0 text-sm text-[var(--ws-c-late)]" role="alert">
              {deadlineError}
            </p>
          )}
          {!isLeader && <p className="v3-mut m-0 text-xs">{tr("الموعد مشترك لكل الفريق.")}</p>}
          <button type="button" className="v3-bw" onClick={saveDeadline} disabled={!deadlineDraft}>
            {tr("احفظ الموعد")}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
