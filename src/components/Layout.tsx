import { Navigate, Outlet, useLocation } from "react-router-dom";
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
  const { currentUser, loading } = useAuth();
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
