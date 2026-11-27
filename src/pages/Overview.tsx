import { AwayStrip, useTeamTime } from "../components/sup/StudentTime";
import { MeetLiveStrip } from "../components/meet/MeetLive";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { AlertTriangle, PartyPopper } from "lucide-react";
import Dialog from "../components/ui/Dialog";
import NotificationsBell from "../components/NotificationsBell";
import HomeToasts from "../components/home/HomeToasts";
import ErrorBoundary from "../components/ErrorBoundary";
import { MeetLuxCard, TeamMini, WeekLuxCard } from "../components/home/TeamMeetLux";
import {
  AgentPill,
  DeadlineCard,
  GlassHeader,
  ProgressCard,
  TodoCard,
  countAr,
  type AreaBar,
} from "../components/home/GlassHome";
import { V3Glow, num } from "../components/v3/WriteHeader";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import type { Task } from "../data/types";
import { daysUntil, formatDateLong, toISODate } from "../lib/date";
import { useResearchStages } from "../hooks/useResearchStages";
import FirstWeekCard from "../components/home/FirstWeekCard";
import WesyOffice from "../components/home/WesyOffice";
import WesyNeeds from "../components/home/WesyNeeds";
import { placeOf, strictReview } from "../lib/taskLinks";
import { ReviewCard } from "../components/lux/Lux";
import { useNavigate } from "react-router-dom";
import { startSeen } from "./Start";
import { explainSeen } from "./Explain";
import { useTeamStage } from "../lib/teamStage";
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
import { isLate, weeklySeries } from "../lib/homeCalm";
import { METHOD_READY, ethicsStepsDone, methodologyReadyCount } from "../lib/writeProgress";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { isEn, tr } from "../lib/i18n";

// بالعرض التجريبي البيانات مثبّتة على أغسطس 2026، فنثبّت «اليوم» عليه عشان الحسابات تطلع منطقية
const now = isSupabaseConfigured ? new Date() : new Date(2026, 7, 22, 6);
const todayIso = toISODate(now);

const LAST_SEEN_STAGE_KEY = "nursync.lastSeenStage";
const METHOD_TOTAL = Object.keys(METHOD_READY).length;

const rise = (i: number) => ({ ["--v3-i" as string]: i }) as CSSProperties;

export default function Overview() {
  const { currentUser, mode, isLeader, canWrite, team } = useAuth();
  const navigate = useNavigate();
  const { stage: teamStage, loaded: stageLoaded } = useTeamStage(team?.id);
  const { showToast } = useToast();
  const { stages } = useResearchStages();
  const { papers, loading: papersLoading } = useEvidencePapers();
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
  // «بدأتوا قبل؟»: فريق جديد (أسبوعين) ما حدد وين وصل ومكتبته ومقترحه فاضيين → نفتحها له مرة وحدة
  useEffect(() => {
    if (mode !== "supabase" || !team || !currentUser) return;
    // «وش هذا المكان؟» أول زيارة (للفرق اللي عمرها أقل من شهر)
    const age = team.createdAt ? Date.now() - new Date(team.createdAt).getTime() : Infinity;
    if (!explainSeen(currentUser.id) && age < 30 * 86400000) return void navigate("/explain", { replace: true });
    if (!stageLoaded || papersLoading || !sections.length || teamStage || startSeen(team.id)) return;
    const fresh = age < 14 * 86400000;
    const empty = papers.length === 0 && sections.every((x) => !x.content.trim());
    if (fresh && empty) navigate("/start", { replace: true });
  }, [mode, team, currentUser, stageLoaded, papersLoading, teamStage, papers.length, sections, navigate]);
  // «قبل لا تشوفها الدكتورة» — نفس المراجعة الصارمة بصفحة المهام
  const review = useMemo(
    () => strictReview({ tasks, papers, sections, deadline: deadline ?? undefined, today: todayIso, nameOf: (id) => roster.find((m) => m.id === id)?.name.split(" ")[0] ?? "" }),
    [tasks, papers, sections, deadline, roster],
  );
  const daysLeft = deadline ? daysUntil(deadline, now) : null;

  // ── الأقسام والأدبيات والمنهجية والأخلاقيات ──
  const orderedSections = [...sections].sort((a, b) => a.order - b.order);
  const secTotal = orderedSections.length;
  const secDone = orderedSections.filter((s) => s.status === "done").length;
  const reviewed = papers.filter((p) => p.reviewStatus === "reviewed").length;
  const methReady = methodologyReadyCount(methodology);
  const ethicsDone = ethicsStepsDone(ethicalApproval).filter(Boolean).length;
  const sectionOf = (t: Task) => sections.find((s) => s.key === t.sectionKey);
  // المهمة توديك لمكان شغلها (قسم المقترح، مكتبة الأدلة، الأخلاقيات…) — المكان المحفوظ أو المستنتج من العنوان
  const taskLink = (t: Task) => placeOf(t)?.route ?? `/tasks?task=${t.id}`;
  const sectionTag = (t: Task) => {
    const sec = sectionOf(t);
    return sec ? tr("المقترح · القسم {0}", num(sec.order)) : placeOf(t)?.label ?? "";
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

  // ── «الجاي لكم»: مهمة متأخرة عليكم أول، وإلا خطوة الرحلة (NextCard) ──
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
    <div className="v3 nx-on relative">
      <V3Glow />
      <ErrorBoundary>
        <HomeToasts />
      </ErrorBoundary>

      {/* ── الترحيب + زر ويسي + الجرس ── */}
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

      {/* «الجاي لكم»: خطوة وحدة بزر برتقالي واحد — أول شي بالصفحة (docs/DESIGN_BRIEF_UNLOCK.md) */}
      <ErrorBoundary>
        <WesyOffice urgent={journeyStep} fallback={journeyStep} />
      </ErrorBoundary>
      <ErrorBoundary>
        <WesyNeeds />
      </ErrorBoundary>

      {mode === "supabase" && (
        <ErrorBoundary>
          <HomeAway />
        </ErrorBoundary>
      )}

      {/* ── ثلاث أعمدة، كل عمود سؤال واحد: وش علينا اليوم؟ · وين وصلنا؟ · وش الجاي بالتقويم؟
          كل عمود له عنوان صغير بنفس المكان، وآخر بطاقة فيه تمتد لين تتساوى نهايات الأعمدة ── */}
      <div className="relative mb-4 grid grid-cols-1 gap-2.5 lg:gap-[18px] xl:grid-cols-3 xl:items-stretch">
        <HomeColumn label={tr("اليوم")}>
          {mode === "supabase" && (
            <ErrorBoundary>
              <FirstWeekCard style={rise(1)} />
            </ErrorBoundary>
          )}
          <ErrorBoundary>
            <TodoCard
              style={rise(2)}
              tasks={tasks}
              today={todayIso}
              roster={roster}
              canToggle={(t) => canWrite && (isLeader || t.assigneeId === currentUser?.id)}
              canAdd={canWrite && isLeader}
              sectionTag={sectionTag}
              taskLink={taskLink}
              onToggle={toggleTask}
              onAdd={addTodayTask}
            />
          </ErrorBoundary>
          <Stretch>
            <ErrorBoundary>
              <ReviewCard items={review} limit={2} />
            </ErrorBoundary>
          </Stretch>
        </HomeColumn>

        <HomeColumn label={tr("وين وصلنا")}>
          <ErrorBoundary>
            <ProgressCard style={rise(3)} pct={pct} stagesDone={stagesDone} stagesTotal={stages.length} note={progressNote} />
          </ErrorBoundary>
          <ErrorBoundary>
            <DeadlineCard className="flex" style={rise(3)} deadline={deadline} daysLeft={daysLeft} bars={bars} canWrite={canWrite} onSetDeadline={openDeadlineEditor} />
          </ErrorBoundary>
          <Stretch>
            <ErrorBoundary>
              <TeamMini tasks={tasks} today={todayIso} style={rise(4)} />
            </ErrorBoundary>
          </Stretch>
        </HomeColumn>

        <HomeColumn label={tr("المواعيد")}>
          <ErrorBoundary>
            <MeetLuxCard now={now} style={rise(5)} />
          </ErrorBoundary>
          <Stretch>
            <ErrorBoundary>
              <WeekLuxCard today={todayIso} now={now} style={rise(6)} />
            </ErrorBoundary>
          </Stretch>
        </HomeColumn>
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

/** شريط «المشرف/ة مو متاح/ة» تحت الترحيب (SupAwayM) */
function HomeAway() {
  const { away, extensions } = useTeamTime();
  return (
    <>
      <MeetLiveStripHome />
      {away && (
        <div className="mb-2.5 lg:mb-[18px]">
          <AwayStrip away={away} pending={extensions.filter((e) => e.status === "pending").length} />
        </div>
      )}
    </>
  );
}
function MeetLiveStripHome() {
  return (
    <div className="mb-2.5 empty:hidden lg:mb-[18px]">
      <MeetLiveStrip />
    </div>
  );
}

/** عمود من أعمدة الرئيسية الثلاثة: عنوان صغير ثابت فوق، والبطاقات تحته بنفس المسافة */
function HomeColumn({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-2.5 lg:gap-[18px]" aria-label={label}>
      <h2 className="lux-eye m-0 flex items-center gap-2.5 px-1 pt-1 !text-base">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-ws-accent2" aria-hidden />
        {label}
        <span className="h-px flex-1 bg-gradient-to-l from-white/15 to-transparent" aria-hidden />
      </h2>
      {children}
    </section>
  );
}

/** آخر بطاقة بالعمود تمتد لين نهاية الصف — عشان الأعمدة تخلص على خط واحد */
function Stretch({ children }: { children: ReactNode }) {
  return <div className="flex min-h-0 flex-col xl:flex-1 xl:[&>*]:flex-1">{children}</div>;
}
