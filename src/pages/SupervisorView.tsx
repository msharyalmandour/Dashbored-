import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Circle, Clock, ShieldCheck, Users } from "lucide-react";
import Logo from "../components/Logo";
import { supabase } from "../lib/supabaseClient";
import { formatDateShort } from "../lib/date";

interface SnapshotTask {
  title: string;
  status: "todo" | "in-progress" | "done" | "overdue";
  dueDate: string | null;
  assigneeName: string | null;
}

interface SnapshotMember {
  name: string;
  initials: string;
  role: string;
}

interface Snapshot {
  teamName: string;
  members: SnapshotMember[];
  tasks: SnapshotTask[];
}

const statusStyle: Record<SnapshotTask["status"], string> = {
  todo: "text-sky-600 bg-sky-50",
  "in-progress": "text-amber-600 bg-amber-50",
  done: "text-emerald-600 bg-emerald-50",
  overdue: "text-rose-600 bg-rose-50",
};

const statusLabel: Record<SnapshotTask["status"], string> = {
  todo: "لم يبدأ",
  "in-progress": "قيد التنفيذ",
  done: "مكتملة",
  overdue: "متأخرة",
};

export default function SupervisorView() {
  const { token } = useParams<{ token: string }>();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !token) {
      setLoading(false);
      setError(
        !supabase
          ? "هذي الميزة تحتاج مشروع Supabase حقيقي متصل — غير متاحة بالعرض التجريبي."
          : "رابط غير صالح.",
      );
      return;
    }
    supabase
      .rpc("get_team_snapshot", { p_token: token })
      .then(({ data, error: rpcError }) => {
        if (rpcError || !data) {
          setError("الرابط غير صالح أو منتهي.");
        } else {
          setSnapshot(data as Snapshot);
        }
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-sm font-semibold text-neutral-400">جاري التحميل...</p>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-50 px-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-500">
          <AlertTriangle size={22} />
        </span>
        <p className="max-w-sm text-sm font-semibold text-neutral-500">{error}</p>
      </div>
    );
  }

  const done = snapshot.tasks.filter((t) => t.status === "done").length;
  const total = snapshot.tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const overdue = snapshot.tasks.filter((t) => t.status === "overdue").length;

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={36} />
            <span className="font-display text-base font-extrabold text-neutral-900">NURSYNC</span>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-bold text-neutral-500">
            <ShieldCheck size={13} />
            تقرير قراءة فقط
          </span>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold text-neutral-400">تقرير متابعة فريق البحث</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold text-neutral-900">
            {snapshot.teamName}
          </h1>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 text-center">
              <p className="font-display text-3xl font-extrabold text-neutral-900">{pct}%</p>
              <p className="mt-1 text-xs font-semibold text-neutral-400">نسبة إنجاز المهام</p>
            </div>
            <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 text-center">
              <p className="font-display text-3xl font-extrabold text-neutral-900">
                {done}
                <span className="text-base font-medium text-neutral-400"> / {total}</span>
              </p>
              <p className="mt-1 text-xs font-semibold text-neutral-400">مهام مكتملة</p>
            </div>
            <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 text-center">
              <p className="font-display text-3xl font-extrabold text-neutral-900">{overdue}</p>
              <p className="mt-1 text-xs font-semibold text-neutral-400">مهام متأخرة</p>
            </div>
          </div>

          <div className="mt-8">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-neutral-700">
              <Users size={14} />
              أعضاء الفريق ({snapshot.members.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {snapshot.members.map((m) => (
                <span
                  key={m.name}
                  className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-600"
                >
                  {m.name}
                  {m.role === "leader" && <span className="text-amber-600"> · قائد الفريق</span>}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <p className="mb-3 text-sm font-bold text-neutral-700">المهام</p>
            <ul className="divide-y divide-neutral-100">
              {snapshot.tasks.map((t, i) => (
                <li key={i} className="flex items-center gap-3 py-3">
                  {t.status === "done" ? (
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                  ) : t.status === "overdue" ? (
                    <AlertTriangle size={16} className="shrink-0 text-rose-500" />
                  ) : t.status === "in-progress" ? (
                    <Clock size={16} className="shrink-0 text-amber-500" />
                  ) : (
                    <Circle size={16} className="shrink-0 text-neutral-300" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800">
                    {t.title}
                  </span>
                  <span className="whitespace-nowrap text-xs text-neutral-400">
                    {t.assigneeName ?? ""}
                    {t.dueDate ? ` — ${formatDateShort(t.dueDate)}` : ""}
                  </span>
                  <span
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${statusStyle[t.status]}`}
                  >
                    {statusLabel[t.status]}
                  </span>
                </li>
              ))}
              {snapshot.tasks.length === 0 && (
                <p className="py-6 text-center text-sm text-neutral-400">ما فيه مهام مسجّلة بعد</p>
              )}
            </ul>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-400">
          مشاركة من فريق البحث عبر NURSYNC — رابط قراءة فقط
        </p>
      </div>
    </div>
  );
}
