import { useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { AlertTriangle, CreditCard } from "lucide-react";
import GiftMotion from "./GiftMotion";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Landing from "../pages/Landing";
import PaymentProofUpload from "./PaymentProofUpload";
import CheckoutModal from "./CheckoutModal";
import { AlertCard } from "./ui/cards";
import CommandPalette from "./CommandPalette";
import AiAssistant from "./AiAssistant";
import { ResearchAgentProvider } from "../context/ResearchAgentContext";
import TourGuide from "./TourGuide";
import Skeleton from "./ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { daysUntil } from "../lib/date";

const titles: Record<string, string> = {
  "/": "نظرة عامة",
  "/proposal": "المقترح البحثي",
  "/literature-review": "مراجعة الأدبيات",
  "/methodology": "المنهجية",
  "/ethical-approval": "الموافقة الأخلاقية",
  "/research-search": "وكيل البحث العلمي",
  "/meeting-minutes": "محاضر الاجتماعات",
  "/proposal/export": "تصدير المقترح",
  "/tasks": "مهامي",
  "/evidence": "مكتبة الأدلة",
  "/team": "الفريق",
  "/timeline": "الجدول الزمني",
  "/fieldwork": "الميدان",
  "/files": "الملفات",
  "/calendar": "التقويم",
  "/story": "قصة بحثك",
  "/guide": "دليل الطالب",
  "/pricing": "الباقات والاشتراك",
  "/admin/subscriptions": "إدارة الاشتراكات",
};

export default function Layout() {
  const { currentUser, canWrite, loading, mode, subscriptionState, isLeader, team } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-surface">
        <div className="hidden w-64 shrink-0 border-l border-brand-100/60 p-4 md:block">
          <Skeleton className="h-10 w-32" />
          <div className="mt-8 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9" />
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-brand-100/60 px-8 py-5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
          <main className="flex-1 space-y-4 px-8 py-6">
            <Skeleton className="h-32" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
            <Skeleton className="h-48" />
          </main>
        </div>
      </div>
    );
  }

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
      <div className="pointer-events-none absolute -right-24 top-0 h-[30rem] w-[30rem] animate-[blob-drift_13s_ease-in-out_infinite] rounded-full bg-brand-500/30 blur-3xl motion-reduce:animate-none" />
      <div className="pointer-events-none absolute -left-20 top-[22%] h-96 w-96 animate-[blob-drift_10s_ease-in-out_infinite] rounded-full bg-amber-accent-400/28 blur-3xl motion-reduce:animate-none" />
      <div className="pointer-events-none absolute right-1/4 top-[45%] h-[26rem] w-[26rem] animate-[blob-drift_15s_ease-in-out_infinite] rounded-full bg-sky-accent-500/20 blur-3xl motion-reduce:animate-none" />
      <div className="pointer-events-none absolute -left-16 top-[65%] h-80 w-80 animate-[blob-drift_11s_ease-in-out_infinite] rounded-full bg-amber-accent-500/26 blur-3xl motion-reduce:animate-none" />
      <div className="pointer-events-none absolute -right-20 top-[85%] h-96 w-96 animate-[blob-drift_12s_ease-in-out_infinite] rounded-full bg-brand-500/24 blur-3xl motion-reduce:animate-none" />
      <CommandPalette />
      <AiAssistant />
      <TourGuide />
      <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <Header title={title} onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-8">
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
                    {isLeader ? "فعّلوا الاشتراك الآن" : "ادفعوا حصتكم"}
                  </button>
                }
              >
                أنتم بفترة التجربة المجانية 🎉 — باقي{" "}
                {trialDaysLeft <= 0 ? "أقل من يوم" : `${trialDaysLeft} ${trialDaysLeft === 1 ? "يوم" : "أيام"}`}
                . أي عضو يقدر يدفع حصته وتزيد أيام الاشتراك مباشرة، أو{" "}
                <Link to="/pricing" className="underline underline-offset-2">
                  شوفوا الباقات
                </Link>
                .
              </AlertCard>
            )}
            {showReadOnlyBanner && (
              <AlertCard tone="warning" icon={AlertTriangle}>
                <div>
                  {subscriptionState === "none" ? (
                    <>
                      اشتراك فريقكم لسا ما تفعّل — تقدرون تشوفون كل بياناتكم
                      المحفوظة، بس ما تقدرون تضيفون مهام جديدة أو تعدّلون عليها.{" "}
                      ادفعوا الآن بالبطاقة لتفعيل فوري — أي عضو يقدر يدفع حصته بس، مو لازم قائد
                      الفريق.
                    </>
                  ) : (
                    <>
                      اشتراك فريقكم انتهى — تقدرون تشوفون كل بياناتكم المحفوظة، بس
                      ما تقدرون تضيفون مهام جديدة أو تعدّلون عليها. جدّدوا
                      للاستمرار في استخدام كل المزايا.
                    </>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setCheckoutOpen(true)}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-l from-amber-accent-500 to-amber-accent-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm shadow-amber-accent-500/30 hover:from-amber-accent-600 hover:to-amber-accent-700"
                    >
                      <CreditCard size={13} />
                      {isLeader ? "ادفعوا الآن بالبطاقة" : "ادفعوا حصتكم بالبطاقة"}
                    </button>
                    {isLeader && (
                      <span className="text-xs font-semibold text-brand-950/45">
                        أو الطريقة اليدوية بالأسفل
                      </span>
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
            <div key={location.pathname} className="animate-[page-in_0.35s_ease-out]">
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
