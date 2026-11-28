import { AwayStrip, useTeamTime } from "../components/sup/StudentTime";
import { MeetLiveStrip } from "../components/meet/MeetLive";
import { useEffect, useMemo, useState } from "react";
import { PartyPopper } from "lucide-react";
import Dialog from "../components/ui/Dialog";
import NotificationsBell from "../components/NotificationsBell";
import HomeToasts from "../components/home/HomeToasts";
import ErrorBoundary from "../components/ErrorBoundary";
import { V3Glow } from "../components/v3/WriteHeader";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { daysUntil, formatDateLong, toISODate } from "../lib/date";
import { useResearchStages } from "../hooks/useResearchStages";
import LuxHome from "../components/home/LuxHome";
import WesyNeeds from "../components/home/WesyNeeds";
import { strictReview } from "../lib/taskLinks";
import { useNavigate } from "react-router-dom";
import { startSeen } from "./Start";
import { useTeamStage } from "../lib/teamStage";
import { useEvidencePapers } from "../hooks/useEvidencePapers";
import { useProposal } from "../hooks/useProposal";
import { useMethodology } from "../hooks/useMethodology";
import { useTasksData } from "../hooks/useTasksData";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useResearchProject } from "../hooks/useResearchProject";
import { useSurveys, useSurveyResponseCounts } from "../hooks/useSurveys";
import { summarizeCollection } from "../lib/dataCollection";
import { computeNextSteps } from "../lib/nextSteps";
import { isStageReady } from "../lib/stageAdvance";
import { getCurrentStage, getOverallProgress } from "../lib/progress";
import { splitReminders } from "../lib/taskReminders";
import { teamWeeks } from "../lib/homeCalm";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import WesyTourOffer from "../components/home/WesyTourOffer";
import { tr } from "../lib/i18n";

// بالعرض التجريبي البيانات مثبّتة على أغسطس 2026، فنثبّت «اليوم» عليه عشان الحسابات تطلع منطقية
const now = isSupabaseConfigured ? new Date() : new Date(2026, 7, 22, 6);
const todayIso = toISODate(now);

const LAST_SEEN_STAGE_KEY = "nursync.lastSeenStage";


export default function Overview() {
  const { currentUser, mode, isLeader, canWrite, team } = useAuth();
  const navigate = useNavigate();
  const { stage: teamStage, loaded: stageLoaded } = useTeamStage(team?.id);
  const { showToast } = useToast();
  const { stages } = useResearchStages();
  const { papers, loading: papersLoading } = useEvidencePapers();
  const { sections, gap, questions } = useProposal();
  const { methodology } = useMethodology();
  const { tasks: allTasks } = useTasksData();
  const { roster, loading: rosterLoading } = useTeamRoster();
  const rosterReady = !rosterLoading && roster.length > 0;
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
    // «وش هذا المكان؟» صارت اختيارية: ويسي يعرض الجولة بالرئيسية (WesyTourOffer) بدل ما نحوّلهم غصب
    const age = team.createdAt ? Date.now() - new Date(team.createdAt).getTime() : Infinity;
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
  // ── سلسلة الفريق بالأسابيع + هل خصم الاستمرار شغّال (السيرفر هو اللي يقرر) ──
  const weeksRun = useMemo(() => teamWeeks(allTasks.map((t) => t.completedAt), todayIso), [allTasks]);
  const [streakOk, setStreakOk] = useState<boolean | null>(null);
  useEffect(() => {
    if (mode !== "supabase" || !supabase || !team) return;
    void supabase.rpc("my_streak_ok").then(({ data, error }) => setStreakOk(error ? null : data === true));
  }, [mode, team]);
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
    memberCount: rosterReady ? roster.length : undefined,
  })[0];

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

      <LuxHome
        firstName={firstName}
        now={now}
        todayIso={todayIso}
        pct={pct}
        step={journeyStep}
        tasks={tasks}
        roster={roster}
        deadline={deadline}
        daysLeft={daysLeft}
        review={review}
        collected={collection.collected}
        target={collection.target ?? 0}
        hasSurvey={surveys.length > 0}
        weeks={weeksRun}
        streakOk={streakOk}
        stagesDone={stagesDone}
        stagesTotal={stages.length}
        canWrite={canWrite}
        onSetDeadline={openDeadlineEditor}
        aside={
          <div className="hidden self-start lg:block">
            <NotificationsBell />
          </div>
        }
        top={
          <>
            <ErrorBoundary>
              <WesyTourOffer firstName={firstName} />
            </ErrorBoundary>
            <ErrorBoundary>
              <WesyNeeds />
            </ErrorBoundary>
            {mode === "supabase" && (
              <ErrorBoundary>
                <HomeAway />
              </ErrorBoundary>
            )}
          </>
        }
      />

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
