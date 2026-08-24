import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Lock, LogOut, Mail } from "lucide-react";
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
};

export default function Layout() {
  const { currentUser, hasActiveSubscription, loading, logout, mode } = useAuth();
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

  if (mode === "supabase" && !hasActiveSubscription) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="w-full max-w-md rounded-3xl border border-brand-100 bg-paper p-8 text-center shadow-sm shadow-brand-950/5">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-accent-100 text-amber-accent-600">
            <Lock size={26} />
          </div>
          <h1 className="font-display text-xl font-extrabold text-brand-950">
            انتهت فترتكم التجريبية
          </h1>
          <p className="mt-2 text-sm text-brand-950/55">
            محتوى بحثكم محفوظ وآمن — بس محتاجين تفعّلون الاشتراك عشان ترجعون تشوفونه.
            تواصلوا معنا وبنفعّله لكم بسرعة.
          </p>
          <a
            href="mailto:hello@nursync.app?subject=تفعيل اشتراك NURSYNC"
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
          >
            <Mail size={16} />
            تواصل لتفعيل الاشتراك
          </a>
          <button
            onClick={logout}
            className="mt-3 flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-brand-950/40 hover:text-brand-700"
          >
            <LogOut size={14} />
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  const title = titles[location.pathname] ?? "نيرسينك";

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={title} />
        <main className="flex-1 px-8 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
