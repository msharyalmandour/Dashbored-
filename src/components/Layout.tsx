import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useAuth } from "../context/AuthContext";

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
  const { currentUser, canWrite, loading, mode } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface text-sm font-semibold text-brand-950/50">
        جارٍ التحميل...
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const title = titles[location.pathname] ?? "نيرسينك";
  const showReadOnlyBanner = mode === "supabase" && !canWrite;

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={title} />
        <main className="flex-1 px-8 py-6">
          <div className="space-y-6">
            {showReadOnlyBanner && (
              <div className="flex items-center gap-4 rounded-3xl border border-amber-accent-200 bg-amber-accent-100 px-5 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-accent-500 text-white">
                  <AlertTriangle size={18} />
                </span>
                <p className="min-w-0 flex-1 text-sm font-semibold text-amber-accent-700">
                  اشتراك فريقكم انتهى — تقدرون تشوفون كل بياناتكم المحفوظة، بس ما
                  تقدرون تضيفون مهام جديدة أو تعدّلون عليها. جدّدوا للاستمرار في
                  استخدام كل المزايا.
                </p>
              </div>
            )}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
