import { useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import GiftMotion from "./GiftMotion";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Landing from "../pages/Landing";
import PaymentProofUpload from "./PaymentProofUpload";
import CommandPalette from "./CommandPalette";
import AiAssistant from "./AiAssistant";
import TourGuide from "./TourGuide";
import Skeleton from "./ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import { daysUntil } from "../lib/date";

const titles: Record<string, string> = {
  "/": "نظرة عامة",
  "/proposal": "المقترح البحثي",
  "/literature-review": "مراجعة الأدبيات",
  "/methodology": "المنهجية",
  "/tasks": "مهامي",
  "/evidence": "مكتبة الأدلة",
  "/team": "الفريق",
  "/timeline": "الجدول الزمني",
  "/fieldwork": "الميدان",
  "/files": "الملفات",
  "/calendar": "التقويم",
  "/story": "قصة بحثك",
  "/guide": "دليل الطالب",
  "/admin/subscriptions": "إدارة الاشتراكات",
};

export default function Layout() {
  const { currentUser, canWrite, loading, mode, subscriptionState, isLeader, team } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  const title = titles[location.pathname] ?? "نيرسينك";
  const showReadOnlyBanner = mode === "supabase" && !canWrite;
  const showTrialBanner =
    mode === "supabase" && canWrite && team?.isOnTrial && subscriptionState === "expiring-soon";
  const trialDaysLeft = team?.subscriptionEndDate ? daysUntil(team.subscriptionEndDate) : 0;

  return (
    <div className="flex min-h-screen bg-surface">
      <CommandPalette />
      <AiAssistant />
      <TourGuide />
      <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={title} onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-8">
          <div className="space-y-6">
            {showTrialBanner && (
              <div className="flex items-center gap-4 rounded-3xl border border-sky-accent-200 bg-sky-accent-50 px-5 py-4 print:hidden">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-accent-500">
                  <GiftMotion size={20} />
                </span>
                <p className="min-w-0 flex-1 text-sm font-semibold text-sky-accent-700">
                  أنتم بفترة التجربة المجانية 🎉 — باقي{" "}
                  {trialDaysLeft <= 0 ? "أقل من يوم" : `${trialDaysLeft} ${trialDaysLeft === 1 ? "يوم" : "أيام"}`}
                  . {isLeader ? "فعّلوا الاشتراك بأي وقت قبل ما تنتهي عشان ما تنقطع الخدمة." : "خلّوا قائد فريقكم يفعّل الاشتراك قبل ما تنتهي التجربة."}
                </p>
              </div>
            )}
            {showReadOnlyBanner && (
              <div className="flex items-center gap-4 rounded-3xl border border-amber-accent-200 bg-amber-accent-100 px-5 py-4 print:hidden">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-accent-500 text-white">
                  <AlertTriangle size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-amber-accent-700">
                    {subscriptionState === "none" ? (
                      <>
                        اشتراك فريقكم لسا ما تفعّل — تقدرون تشوفون كل بياناتكم
                        المحفوظة، بس ما تقدرون تضيفون مهام جديدة أو تعدّلون عليها.{" "}
                        {isLeader
                          ? "حوّلوا مبلغ الاشتراك عبر STC Pay وأرسلوا لنا إثبات التحويل لتفعيله."
                          : "خلّوا قائد فريقكم يحوّل مبلغ الاشتراك عبر STC Pay لتفعيله."}
                      </>
                    ) : (
                      <>
                        اشتراك فريقكم انتهى — تقدرون تشوفون كل بياناتكم المحفوظة، بس
                        ما تقدرون تضيفون مهام جديدة أو تعدّلون عليها. جدّدوا
                        للاستمرار في استخدام كل المزايا.
                      </>
                    )}
                  </p>
                  {isLeader && <PaymentProofUpload />}
                </div>
              </div>
            )}
            <div key={location.pathname} className="animate-[page-in_0.35s_ease-out]">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
