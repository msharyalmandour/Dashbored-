import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  AlertTriangle,
  BookOpenText,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  FlaskConical,
  MessageSquareText,
  ShieldCheck,
  Users,
} from "lucide-react";
import Logo from "../components/Logo";
import Avatar from "../components/ui/Avatar";
import { supabase } from "../lib/supabaseClient";
import { formatDateLong, formatDateShort } from "../lib/date";
import type { AccentColor } from "../lib/colors";

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

interface SnapshotProposalSection {
  key: string;
  labelAr: string;
  labelEn: string;
  status: "not-started" | "in-progress" | "done";
  content: string;
}

type SnapshotMethodology = {
  studyDesign: string;
  studySetting: string;
  population: string;
  samplingInclusion: string[];
  samplingExclusion: string[];
  sampleSize: string;
  samplingTechnique: string;
  dataCollectionMethods: string[];
  dataCollectionProcedure: string;
  dataAnalysis: string;
  ethicalConsiderations: string;
  studyToolType: string;
  studyToolName: string;
} | null;

interface Snapshot {
  teamName: string;
  supervisorNote: string | null;
  supervisorNoteAt: string | null;
  members: SnapshotMember[];
  tasks: SnapshotTask[];
  proposalSections: SnapshotProposalSection[];
  methodology: SnapshotMethodology;
}

const statusStyle: Record<SnapshotTask["status"], string> = {
  todo: "text-sky-accent-600 bg-sky-accent-50",
  "in-progress": "text-amber-accent-600 bg-amber-accent-50",
  done: "text-brand-600 bg-brand-50",
  overdue: "text-rose-600 bg-rose-50",
};

const memberColors: AccentColor[] = ["brand", "amber-accent", "sky-accent"];

const statusLabel: Record<SnapshotTask["status"], string> = {
  todo: "لم يبدأ",
  "in-progress": "قيد التنفيذ",
  done: "مكتملة",
  overdue: "متأخرة",
};

const sectionStatusStyle: Record<SnapshotProposalSection["status"], string> = {
  "not-started": "text-brand-950/35 bg-surface-muted",
  "in-progress": "text-amber-accent-600 bg-amber-accent-50",
  done: "text-brand-600 bg-brand-50",
};

const sectionStatusLabel: Record<SnapshotProposalSection["status"], string> = {
  "not-started": "لم يبدأ",
  "in-progress": "قيد التنفيذ",
  done: "مكتملة",
};

function methodologyField(label: string, value: string | string[]) {
  const text = Array.isArray(value) ? value.join("، ") : value;
  return (
    <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-3.5">
      <p className="text-xs font-bold text-brand-950/45">{label}</p>
      {text ? (
        <p className="mt-1 text-sm font-semibold text-brand-950">{text}</p>
      ) : (
        <p className="mt-1 text-sm italic text-brand-950/30">لم يُحدد بعد</p>
      )}
    </div>
  );
}

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
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-brand-50 via-paper to-paper px-4 py-10">
        <div className="mx-auto max-w-3xl animate-pulse">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-2xl bg-brand-100" />
              <div className="h-4 w-20 rounded bg-brand-100" />
            </div>
            <div className="h-7 w-24 rounded-full bg-brand-100" />
          </div>
          <div className="h-28 rounded-3xl bg-brand-100" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-brand-100" />
            ))}
          </div>
          <div className="mt-4 h-40 rounded-3xl bg-brand-100" />
          <div className="mt-4 h-52 rounded-3xl bg-brand-100" />
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gradient-to-b from-brand-50 via-paper to-paper px-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-500">
          <AlertTriangle size={22} />
        </span>
        <p className="max-w-sm text-sm font-semibold text-brand-950/60">{error}</p>
      </div>
    );
  }

  const done = snapshot.tasks.filter((t) => t.status === "done").length;
  const total = snapshot.tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const overdue = snapshot.tasks.filter((t) => t.status === "overdue").length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-brand-50 via-paper to-paper px-4 py-10">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-accent-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-40 h-64 w-64 rounded-full bg-brand-200/25 blur-3xl" />

      <div className="relative mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-2xl bg-gradient-to-br from-amber-accent-300 to-brand-400 p-[1.5px]">
              <div className="rounded-[0.9rem] bg-paper p-1">
                <Logo size={28} />
              </div>
            </div>
            <span className="font-display text-base font-extrabold text-brand-950">Wesync</span>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-brand-100 bg-paper px-3 py-1.5 text-xs font-bold text-brand-950/55 shadow-sm shadow-brand-950/5">
            <ShieldCheck size={13} className="text-brand-500" />
            تقرير قراءة فقط
          </span>
        </div>

        <div className="rounded-[2rem] bg-gradient-to-br from-amber-accent-300 via-brand-300 to-amber-accent-400 p-[1.5px] shadow-lg shadow-brand-950/10">
          <div className="relative overflow-hidden rounded-[calc(2rem-1.5px)] bg-paper p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-accent-100/60 blur-2xl" />
            <div className="relative">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-accent-300/60 bg-amber-accent-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber-accent-700">
                <FlaskConical size={11} />
                تقرير متابعة فريق البحث
              </span>
              <h1 className="mt-3 font-display text-2xl font-extrabold text-brand-950 sm:text-3xl">
                {snapshot.teamName}
              </h1>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-center">
                  <p className="font-display text-3xl font-extrabold text-brand-950">{pct}%</p>
                  <p className="mt-1 text-xs font-semibold text-brand-950/50">نسبة إنجاز المهام</p>
                </div>
                <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-center">
                  <p className="font-display text-3xl font-extrabold text-brand-950">
                    {done}
                    <span className="text-base font-medium text-brand-950/40"> / {total}</span>
                  </p>
                  <p className="mt-1 text-xs font-semibold text-brand-950/50">مهام مكتملة</p>
                </div>
                <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-center">
                  <p className="font-display text-3xl font-extrabold text-brand-950">{overdue}</p>
                  <p className="mt-1 text-xs font-semibold text-brand-950/50">مهام متأخرة</p>
                </div>
              </div>

              <div className="mt-8">
                <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-brand-950/80">
                  <Users size={14} className="text-brand-500" />
                  أعضاء الفريق ({snapshot.members.length})
                </p>
                <div className="flex flex-wrap gap-2.5">
                  {snapshot.members.map((m, i) => (
                    <span
                      key={m.name}
                      className="flex items-center gap-2 rounded-full border border-brand-100 bg-paper py-1 pe-3 ps-1 text-xs font-semibold text-brand-950/75 shadow-sm shadow-brand-950/5"
                    >
                      <Avatar initials={m.initials} color={memberColors[i % memberColors.length]} size="sm" />
                      {m.name}
                      {m.role === "leader" && (
                        <span className="text-amber-accent-600"> · قائد الفريق</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <p className="mb-3 text-sm font-bold text-brand-950/80">المهام</p>
                <ul className="divide-y divide-brand-50">
                  {snapshot.tasks.map((t, i) => (
                    <li key={i} className="flex items-center gap-3 py-3">
                      {t.status === "done" ? (
                        <CheckCircle2 size={16} className="shrink-0 text-brand-500" />
                      ) : t.status === "overdue" ? (
                        <AlertTriangle size={16} className="shrink-0 text-rose-500" />
                      ) : t.status === "in-progress" ? (
                        <Clock size={16} className="shrink-0 text-amber-accent-500" />
                      ) : (
                        <Circle size={16} className="shrink-0 text-brand-950/25" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-brand-950">
                        {t.title}
                      </span>
                      <span className="whitespace-nowrap text-xs text-brand-950/40">
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
                    <p className="py-6 text-center text-sm text-brand-950/40">ما فيه مهام مسجّلة بعد</p>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-brand-100/70 bg-paper p-6 shadow-sm shadow-brand-950/5 sm:p-8">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-brand-950/80">
            <BookOpenText size={14} className="text-brand-500" />
            المقترح البحثي
          </p>
          <ul className="divide-y divide-brand-50">
            {snapshot.proposalSections.map((s) => (
              <li key={s.key} className="py-3">
                <div className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 text-sm font-semibold text-brand-950">
                    {s.labelAr}
                    <span className="ms-1.5 text-xs font-normal text-brand-950/40">{s.labelEn}</span>
                  </span>
                  <span
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${sectionStatusStyle[s.status]}`}
                  >
                    {sectionStatusLabel[s.status]}
                  </span>
                </div>
                {s.content ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-brand-950/65">{s.content}</p>
                ) : (
                  <p className="mt-2 text-sm italic text-brand-950/30">لم يُكتب بعد</p>
                )}
              </li>
            ))}
            {snapshot.proposalSections.length === 0 && (
              <p className="py-6 text-center text-sm text-brand-950/40">ما فيه مقترح بحثي مسجّل بعد</p>
            )}
          </ul>
        </div>

        {snapshot.methodology && (
          <div className="mt-4 rounded-3xl border border-brand-100/70 bg-paper p-6 shadow-sm shadow-brand-950/5 sm:p-8">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-bold text-brand-950/80">
              <FlaskConical size={14} className="text-brand-500" />
              المنهجية
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {methodologyField("تصميم الدراسة", snapshot.methodology.studyDesign)}
              {methodologyField("مكان الدراسة", snapshot.methodology.studySetting)}
              {methodologyField("مجتمع الدراسة", snapshot.methodology.population)}
              {methodologyField("حجم العينة", snapshot.methodology.sampleSize)}
              {methodologyField("أسلوب اختيار العينة", snapshot.methodology.samplingTechnique)}
              {methodologyField("معايير الاشتمال", snapshot.methodology.samplingInclusion)}
              {methodologyField("معايير الاستبعاد", snapshot.methodology.samplingExclusion)}
              {methodologyField("طريقة جمع البيانات", snapshot.methodology.dataCollectionMethods)}
              {methodologyField("إجراء جمع البيانات", snapshot.methodology.dataCollectionProcedure)}
              {methodologyField("تحليل البيانات", snapshot.methodology.dataAnalysis)}
              {methodologyField("الاعتبارات الأخلاقية", snapshot.methodology.ethicalConsiderations)}
              {methodologyField("أداة الدراسة", snapshot.methodology.studyToolName)}
            </div>
          </div>
        )}

        <div className="mt-4 rounded-3xl border border-brand-100/70 bg-paper p-6 shadow-sm shadow-brand-950/5 sm:p-8">
          <p className="flex items-center gap-1.5 text-sm font-bold text-brand-950/80">
            <MessageSquareText size={15} className="text-brand-500" />
            ملاحظة لفريقكم
          </p>
          <p className="mt-1 text-xs text-brand-950/40">
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
            className="mt-3 w-full rounded-2xl border border-brand-100 px-3.5 py-3 text-sm text-brand-950 outline-none placeholder:text-brand-950/30 focus:border-brand-300"
          />
          <button
            onClick={submitNote}
            disabled={noteSubmitting}
            className="mt-3 flex items-center gap-2 rounded-xl bg-gradient-to-l from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-brand-500/30 hover:from-brand-600 hover:to-brand-700 disabled:opacity-50"
          >
            {noteSent ? <Check size={15} /> : null}
            {noteSubmitting ? "..." : noteSent ? "تم الإرسال" : "إرسال الملاحظة"}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-brand-950/35">
          مشاركة من فريق البحث عبر Wesync — رابط قراءة فقط
        </p>
      </div>
    </div>
  );
}
