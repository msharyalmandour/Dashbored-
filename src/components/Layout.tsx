import { applyReduceMotion, getReduceMotion, setReduceMotion } from "../lib/motionPref";
import { storePaperMode } from "../lib/paperMode";
import { loadProfilePrefs } from "../lib/profilePrefs";
import { Suspense, useEffect, useState } from "react";
import { lazyPage } from "../lib/lazyPage";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { AlertTriangle, CreditCard } from "lucide-react";
import GiftMotion from "./GiftMotion";
import Sidebar from "./Sidebar";
import Header from "./Header";
import SectionTabs from "./SectionTabs";
import { PageHelpButton } from "./help/PageHelp";
import PaymentProofUpload from "./PaymentProofUpload";
import CheckoutModal from "./CheckoutModal";
import { AlertCard } from "./ui/cards";
import CommandPalette from "./CommandPalette";
import AgentPanel from "./agent/AgentPanel";
import { ResearchAgentProvider } from "../context/ResearchAgentContext";
import TourGuide from "./TourGuide";
import AcademyCoach from "./AcademyCoach";
import WesyNudges from "./onboarding/WesyNudges";
import PendingTaskRedirect from "./onboarding/PendingTaskRedirect";
import GlobalDrop from "./drop/GlobalDrop";
import BottomNav from "./BottomNav";
import AppSplash from "./ui/AppSplash";
import RouteFallback from "./ui/RouteFallback";
import DriveNotice from "./ui/DriveNotice";
import StageCelebration from "./ui/StageCelebration";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { daysUntil } from "../lib/date";
import { tr, trx } from "../lib/i18n";
import StudToast from "./notify/StudToast";
import InviteSeats from "./growth/InviteSeats";
import GiftNotice from "./growth/GiftNotice";
import SideHandle, { useSideHidden } from "./SideHandle";
import { clearDocCode, clearSignupRef, parseRef, storedDocCode, storedSignupRef } from "../lib/signupSource";
import { supabase } from "../lib/supabaseClient";

const LandingV3 = lazyPage(() => import("../pages/LandingV3"));

const titles: Record<string, string> = {
  "/": tr("نظرة عامة"),
  "/proposal": tr("المقترح البحثي"),
  "/literature-review": tr("مراجعة الأدبيات"),
  "/methodology": tr("المنهجية"),
  "/ethical-approval": tr("الموافقة الأخلاقية"),
  "/research-search": tr("البحث عن دراسات"),
  "/stats": tr("استوديو الإحصاء"),
  "/feedback": tr("ملاحظات المشرف"),
  "/study-kit": tr("الاستبيانات والموافقات"),
  "/tools-library": tr("مكتبة أدوات القياس"),
  "/planner": tr("مخطط الموعد"),
  "/viva": tr("تدريب المناقشة"),
  "/glossary": tr("قاموس المصطلحات"),
  "/meeting-minutes": tr("الاجتماعات والمشرف/ة"),
  "/meeting-minutes/new": tr("محضر جديد"),
  "/proposal/export": tr("تصدير المقترح"),
  "/tasks": tr("مهامي"),
  "/evidence": tr("مكتبة الأدلة"),
  "/team": tr("الفريق"),
  "/timeline": tr("الجدول الزمني"),
  "/fieldwork": tr("الميدان"),
  "/collect": tr("أجمع وأحلّل"),
  "/files": tr("الملفات"),
  "/calendar": tr("التقويم"),
  "/story": tr("قصة بحثك"),
  "/guide": tr("دليل الطالب"),
  "/learn": tr("تعلّموا Wesync"),
  "/drop": tr("ارموا أي شي"),
  "/pricing": tr("الاشتراك"),
  "/admin/subscriptions": tr("إدارة الاشتراكات"),
};

/** الصفحات اللي لبست ترويسة التصميم الموحّد (PageHeader) — العنوان فيها يظهر بالصفحة نفسها */
const pageHeaderRoutes = new Set([
  "/tasks",
  "/team",
  "/timeline",
  "/calendar",
  "/files",
  "/study-kit",
  "/surveys",
  "/tools-library",
  "/fieldwork",
  "/collect",
  "/stats",
]);

/** صفحات عنوانها داخل الصفحة نفسها — الشريط العلوي ما يكرره (بدون تفعيل ستايل الترويسة الموحّدة) */
const titleInPageRoutes = new Set(["/", "/learn", "/drop", "/research-search", "/evidence", "/literature-review", "/meeting-minutes", "/meeting-minutes/new"]);

export default function Layout() {
  const { currentUser, canWrite, loading, mode, subscriptionState, isLeader, team } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  // الكمبيوتر: القائمة تنسحب وتختفي والداش ياخذ الشاشة كاملة
  const [sideHidden, setSideHidden] = useSideHidden();
  // «قلّل الحركة» و«وضع الورقة»: الجهاز فورًا، وبعدها الحساب يغلب لو المستخدم اختار من جهاز ثاني
  const userId = currentUser?.id;
  // بعد التسجيل: نربط الفريق بكود الدكتورة (/j/:code) أو كود السفير (?ref=MSHARY-KAU) — مرة وحدة
  useEffect(() => {
    if (mode !== "supabase" || !team?.id || !supabase) return;
    const doc = storedDocCode();
    if (doc) void supabase.rpc("join_doc_code", { p_code: doc }).then(() => clearDocCode(), () => undefined);
    const ref = storedSignupRef();
    const code = parseRef(ref).code;
    if (code && code.includes("-")) void supabase.rpc("claim_referral", { p_code: code }).then(() => clearSignupRef(), () => undefined);
  }, [mode, team?.id]);

  // صفحة جديدة تبدأ من فوق (قبل: تنفتح من نص الصفحة لو كنتوا نازلين بالصفحة اللي قبلها)
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  useEffect(() => {
    if (!userId) return;
    applyReduceMotion(getReduceMotion(userId));
    let alive = true;
    loadProfilePrefs(userId).then((prefs) => {
      if (!alive || !prefs) return;
      if (prefs.reduceMotion !== null && prefs.reduceMotion !== getReduceMotion(userId)) setReduceMotion(userId, prefs.reduceMotion, true);
      if (prefs.paperMode !== null) storePaperMode(userId, prefs.paperMode);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  if (loading) return <AppSplash />;

  if (!currentUser) {
    if (location.pathname === "/") return <Suspense fallback={<AppSplash />}><LandingV3 /></Suspense>;
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // FixList 12: الشعار بالقائمة بس — الصفحات بدون عنوان ما تكرر «Wesync» بالشريط العلوي
  const title = titles[location.pathname] ?? "";
  const showReadOnlyBanner = mode === "supabase" && !canWrite;
  const showTrialBanner =
    mode === "supabase" && canWrite && team?.isOnTrial && subscriptionState === "expiring-soon";
  const trialDaysLeft = team?.subscriptionEndDate ? daysUntil(team.subscriptionEndDate) : 0;

  return (
    <ResearchAgentProvider>
    <div className="relative flex min-h-screen overflow-x-clip bg-surface">
      {/* فقاعات ضوء موزّعة على طول الصفحة كاملة (absolute على الحاوية
          الخارجية اللي طولها = طول المحتوى الفعلي، مو fixed على الشاشة
          فقط) — عشان تأثير الزجاج (backdrop-blur) بالبطاقات يبين بأي
          سكرول موضع، مو بس أعلى الصفحة. النسب المئوية تتكيف تلقائيًا
          مع طول أي صفحة كانت */}
      <div className="pointer-events-none absolute -right-24 top-0 h-[30rem] w-[30rem] rounded-full bg-[#D9380A] opacity-[.22] blur-3xl" />
      <div className="pointer-events-none absolute -left-20 top-[40%] h-96 w-96 rounded-full bg-[#FF8A24] opacity-[.1] blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-[80%] h-96 w-96 rounded-full bg-[#D9380A] opacity-[.12] blur-3xl" />
      <DriveNotice />
      <StageCelebration />
      <CommandPalette />
      <AgentPanel />
      <TourGuide />
      <AcademyCoach />
      <WesyNudges />
      <PendingTaskRedirect />
      <GlobalDrop />
      <BottomNav />
      <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <SideHandle hidden={sideHidden} setHidden={setSideHidden} />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* «؟» وش هذي الصفحة — بالديسكتوب فوق زاوية المحتوى (بالجوال بالشريط العلوي) */}
        <PageHelpButton className="absolute end-6 top-6 z-20 !hidden md:!inline-flex print:!hidden" />
        <Header
          title={title}
          onMenuClick={() => setMobileNavOpen(true)}
          hideTitleOnDesktop={pageHeaderRoutes.has(location.pathname)}
          hideTitle={titleInPageRoutes.has(location.pathname)}
          homeMode={location.pathname === "/"}
        />
        <main className="flex-1 px-4 py-6 pb-32 sm:px-8 md:px-6 md:pb-6">
          <div className="space-y-6">
            {showTrialBanner && (
              <AlertCard
                tone="info"
                icon={GiftMotion}
                action={
                  <button
                    onClick={() => setCheckoutOpen(true)}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-l from-sky-accent-500 to-sky-accent-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-sky-accent-500/30 hover:from-sky-accent-600 hover:to-sky-accent-700"
                  >
                    <CreditCard size={13} />
                    {isLeader ? tr("فعّلوا الاشتراك الآن") : tr("ادفعوا حصتكم")}
                  </button>
                }
              >{trx("أنتم بفترة التجربة المجانية 🎉 — باقي {0}. أي عضو يقدر يدفع حصته وتزيد أيام الاشتراك مباشرة، أو ", trialDaysLeft <= 0 ? tr("أقل من يوم") : `${trialDaysLeft} ${trialDaysLeft === 1 ? tr("يوم") : tr("أيام")}`)}<Link to="/pricing" className="underline underline-offset-2">{tr("شوفوا الاشتراك")}</Link>
                .
              </AlertCard>
            )}
            {showReadOnlyBanner && (
              <AlertCard tone="warning" icon={AlertTriangle}>
                <div>
                  {subscriptionState === "none" ? (
                    <>{tr("اشتراك فريقكم لسا ما تفعّل — تقدرون تشوفون كل بياناتكم المحفوظة، بس ما تقدرون تضيفون مهام جديدة أو تعدّلون عليها. ادفعوا الآن بالبطاقة لتفعيل فوري — أي عضو يقدر يدفع حصته بس، مو لازم قائد الفريق.")}</>
                  ) : (
                    <>{tr("اشتراك فريقكم انتهى — تقدرون تشوفون كل بياناتكم المحفوظة، بس ما تقدرون تضيفون مهام جديدة أو تعدّلون عليها. جدّدوا للاستمرار في استخدام كل المزايا.")}</>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setCheckoutOpen(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-amber-accent-500 to-amber-accent-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-amber-accent-500/30 hover:from-amber-accent-600 hover:to-amber-accent-700"
                    >
                      <CreditCard size={13} />
                      {isLeader ? tr("ادفعوا الآن بالبطاقة") : tr("ادفعوا حصتكم بالبطاقة")}
                    </button>
                    {isLeader && (
                      <span className="text-xs font-semibold text-brand-950/45">{tr("أو الطريقة اليدوية بالأسفل")}</span>
                    )}
                  </div>
                  {isLeader && isSupabaseConfigured && (
                    <div className="mt-3">
                      <PaymentProofUpload />
                    </div>
                  )}
                </div>
              </AlertCard>
            )}
            <div
              key={location.pathname}
              data-redesign={pageHeaderRoutes.has(location.pathname) ? "" : undefined}
              className="animate-[page-in_0.35s_ease-out]"
            >
              <SectionTabs />
              <GiftNotice />
              <InviteSeats />
              <Suspense fallback={<RouteFallback />}>
                <Outlet />
              </Suspense>
            </div>
          </div>
        </main>
      </div>
      <StudToast />
      {checkoutOpen && <CheckoutModal onClose={() => setCheckoutOpen(false)} />}
    </div>
    </ResearchAgentProvider>
  );
}
