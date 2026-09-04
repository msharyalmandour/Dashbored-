import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  MessageSquareText,
  ShieldCheck,
  Users,
} from "lucide-react";
import Logo from "../components/Logo";
import { supabase } from "../lib/supabaseClient";
import { formatDateLong, formatDateShort } from "../lib/date";

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
  supervisorNote: string | null;
  supervisorNoteAt: string | null;
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
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteSent, setNoteSent] = useState(false);

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
          setNoteDraft((data as Snapshot).supervisorNote ?? "");
        }
        setLoading(false);
      });
  }, [token]);

  const submitNote = async () => {
    if (!supabase || !token) return;
    setNoteSubmitting(true);
    const { error: rpcError } = await supabase.rpc("submit_supervisor_note", {
      p_token: token,
      p_note: noteDraft,
    });
    setNoteSubmitting(false);
    if (!rpcError) {
      setSnapshot((prev) =>
        prev ? { ...prev, supervisorNote: noteDraft.trim() || null, supervisorNoteAt: new Date().toISOString() } : prev,
      );
      setNoteSent(true);
      setTimeout(() => setNoteSent(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 px-4 py-10">
        <div className="mx-auto max-w-3xl animate-pulse">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-neutral-200" />
              <div className="h-4 w-20 rounded bg-neutral-200" />
            </div>
            <div className="h-7 w-24 rounded-full bg-neutral-200" />
          </div>
          <div className="h-28 rounded-3xl bg-neutral-200" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-neutral-200" />
            ))}
          </div>
          <div className="mt-4 h-40 rounded-3xl bg-neutral-200" />
          <div className="mt-4 h-52 rounded-3xl bg-neutral-200" />
        </div>
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
            <span className="font-display text-base font-extrabold text-neutral-900">StudySync</span>
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

        <div className="mt-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="flex items-center gap-1.5 text-sm font-bold text-neutral-700">
            <MessageSquareText size={15} />
            ملاحظة لفريقكم
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            تظهر لكل الفريق بلوحتهم الرئيسية — أرسلوا واحدة جديدة تستبدل القديمة.
            {snapshot.supervisorNoteAt && (
              <> آخر تحديث: {formatDateLong(snapshot.supervisorNoteAt.slice(0, 10))}</>
            )}
          </p>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            rows={3}
            placeholder="مثال: راجعوا صياغة الفجوة البحثية قبل الاجتماع الجاي، وركّزوا على ربطها بالهدف."
            className="mt-3 w-full rounded-2xl border border-neutral-200 px-3.5 py-3 text-sm text-neutral-800 outline-none placeholder:text-neutral-300 focus:border-neutral-400"
          />
          <button
            onClick={submitNote}
            disabled={noteSubmitting}
            className="mt-3 flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {noteSent ? <Check size={15} /> : null}
            {noteSubmitting ? "..." : noteSent ? "تم الإرسال" : "إرسال الملاحظة"}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-400">
          مشاركة من فريق البحث عبر StudySync — رابط قراءة فقط
        </p>
      </div>
    </div>
  );
}
