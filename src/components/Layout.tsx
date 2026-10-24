import { useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { AlertTriangle, CreditCard } from "lucide-react";
import GiftMotion from "./GiftMotion";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Landing from "../pages/Landing";
import SectionTabs from "./SectionTabs";
import PaymentProofUpload from "./PaymentProofUpload";
import CheckoutModal from "./CheckoutModal";
import { AlertCard } from "./ui/cards";
import CommandPalette from "./CommandPalette";
import AiAssistant from "./AiAssistant";
import { ResearchAgentProvider } from "../context/ResearchAgentContext";
import TourGuide from "./TourGuide";
import BottomNav from "./BottomNav";
import AppSplash from "./ui/AppSplash";
import DriveNotice from "./ui/DriveNotice";
import StageCelebration from "./ui/StageCelebration";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { daysUntil } from "../lib/date";
import { tr, trx } from "../lib/i18n";

const titles: Record<string, string> = {
  "/": tr("نظرة عامة"),
  "/proposal": tr("المقترح البحثي"),
  "/literature-review": tr("مراجعة الأدبيات"),
  "/methodology": tr("المنهجية"),
  "/ethical-approval": tr("الموافقة الأخلاقية"),
  "/research-search": tr("وكيل البحث العلمي"),
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
  "/files": tr("الملفات"),
  "/calendar": tr("التقويم"),
  "/story": tr("قصة بحثك"),
  "/guide": tr("دليل الطالب"),
  "/pricing": tr("الباقات والاشتراك"),
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
  "/stats",
]);

/** صفحات عنوانها داخل الصفحة نفسها — الشريط العلوي ما يكرره (بدون تفعيل ستايل الترويسة الموحّدة) */
const titleInPageRoutes = new Set(["/research-search", "/evidence", "/literature-review", "/meeting-minutes", "/meeting-minutes/new"]);

export default function Layout() {
  const { currentUser, canWrite, loading, mode, subscriptionState, isLeader, team } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  if (loading) return <AppSplash />;

  if (!currentUser) {
    if (location.pathname === "/") return <Landing />;
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const title = titles[location.pathname] ?? "Wesync";
  const showReadOnlyBanner = mode === "supabase" && !canWrite;
  const showTrialBanner =
    mode === "supabase" && canWrite && team?.isOnTrial && subscriptionState === "expiring-soon";
  const trialDaysLeft = team?.subscriptionEndDate ? daysUntil(team.subscriptionEndDate) : 0;

  return (
    <ResearchAgentProvider>
    <div className="relative flex min-h-screen overflow-hidden bg-surface">
      {/* فقاعات ضوء موزّعة على طول الصفحة كاملة (absolute على الحاوية
          الخارجية اللي طولها = طول المحتوى الفعلي، مو fixed على الشاشة
          فقط) — عشان تأثير الزجاج (backdrop-blur) بالبطاقات يبين بأي
          سكرول موضع، مو بس أعلى الصفحة. النسب المئوية تتكيف تلقائيًا
          مع طول أي صفحة كانت */}
      <div className="pointer-events-none absolute -right-24 top-0 h-[30rem] w-[30rem] rounded-full bg-brand-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 top-[22%] h-96 w-96 rounded-full bg-amber-accent-400/28 blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 top-[45%] h-[26rem] w-[26rem] rounded-full bg-sky-accent-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 top-[65%] h-80 w-80 rounded-full bg-amber-accent-500/26 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 top-[85%] h-96 w-96 rounded-full bg-brand-500/24 blur-3xl" />
      <DriveNotice />
      <StageCelebration />
      <CommandPalette />
      <AiAssistant />
      <TourGuide />
      <BottomNav onMenu={() => setMobileNavOpen(true)} />
      <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Header
          title={title}
          onMenuClick={() => setMobileNavOpen(true)}
          hideTitleOnDesktop={pageHeaderRoutes.has(location.pathname)}
          hideTitle={titleInPageRoutes.has(location.pathname)}
        />
        <main className="flex-1 px-4 py-6 pb-24 sm:px-8 md:pb-6">
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
              >{trx("أنتم بفترة التجربة المجانية 🎉 — باقي {0}. أي عضو يقدر يدفع حصته وتزيد أيام الاشتراك مباشرة، أو ", trialDaysLeft <= 0 ? tr("أقل من يوم") : `${trialDaysLeft} ${trialDaysLeft === 1 ? tr("يوم") : tr("أيام")}`)}<Link to="/pricing" className="underline underline-offset-2">{tr("شوفوا الباقات")}</Link>
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
              <Outlet />
            </div>
          </div>
        </main>
      </div>
      {checkoutOpen && <CheckoutModal onClose={() => setCheckoutOpen(false)} />}
    </div>
    </ResearchAgentProvider>
  );
}
