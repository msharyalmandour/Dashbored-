import { useEffect, useState } from "react";
import WLogo from "../components/brand/WLogo";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, Printer } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { daysUntil, formatDateFull, formatDateShort } from "../lib/date";
import { isEn, tr, trx } from "../lib/i18n";
import { proofProgress, unprovenDone, type Dash } from "../lib/supervisorDash";
import { useAuth } from "../context/AuthContext";
import { markLearn } from "../hooks/useAcademy";

interface RTask {
  title: string;
  status: "todo" | "in-progress" | "done" | "overdue";
  dueDate: string | null;
  assigneeName: string | null;
}
interface RSnapshot {
  teamName: string;
  members: { name: string; role: string }[];
  tasks: RTask[];
  proposalSections: { key: string; labelAr: string; labelEn?: string; status: string; content?: string }[];
  methodology: Record<string, unknown> | null;
  project?: { title: string; targetSubmissionDate: string | null } | null;
  ethics?: { outcome: string | null; stepsDone?: number } | null;
}

const OUTCOME: Record<string, string> = { pending: "بانتظار اللجنة", approved: "معتمدة", rejected: "مرفوضة", modifications: "مطلوب تعديلات" };

/** تقرير تقدّم الفريق بصفحة وحدة (A4) — المشرف/ة أو الفريق يحفظونه PDF من زر الطباعة ويرسلونه للقسم أو اللجنة */
export default function SupervisorReport() {
  const { token } = useParams<{ token: string }>();
  const [snap, setSnap] = useState<RSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [dash, setDash] = useState<Dash | null>(null);
  const { currentUser } = useAuth();
  // درس «افتحوا تقرير التقدّم» بأكاديمية Wesync: يكتمل لما عضو بالفريق يفتح التقرير
  useEffect(() => {
    if (snap) markLearn(currentUser?.id, "report");
  }, [snap, currentUser?.id]);

  useEffect(() => {
    if (!supabase || !token) {
      setError(true);
      return;
    }
    supabase.rpc("get_team_snapshot", { p_token: token }).then(({ data, error: e }) => {
      if (e || !data) setError(true);
      else setSnap(data as RSnapshot);
    });
    // التقدّم بالدليل (نفس لوحة المشرفة): لو ما وصل، التقرير يطلع بالعدّ العادي
    supabase.rpc("supervisor_dash", { p_token: token }).then(({ data, error: e }) => {
      if (!e && data) setDash(data as Dash);
    });
  }, [token]);

  if (error) return <p className="p-8 text-center text-ws-muted">{tr("الرابط غير صالح أو منتهي.")}</p>;
  if (!snap) return <p className="p-8 text-center text-ws-muted" role="status">{tr("نجهّز التقرير…")}</p>;

  const tasks = snap.tasks ?? [];
  const done = tasks.filter((t) => t.status === "done").length;
  const late = tasks.filter((t) => t.status === "overdue" || (t.status !== "done" && !!t.dueDate && daysUntil(t.dueDate) < 0));
  const upcoming = tasks.filter((t) => t.status !== "done" && t.dueDate && daysUntil(t.dueDate) >= 0).sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "")).slice(0, 6);
  const sections = snap.proposalSections ?? [];
  // «مكتمل» بدون نص ما ينحسب
  const written = (s: RSnapshot["proposalSections"][number]) => s.status === "done" && !!s.content?.trim();
  const secDone = sections.filter(written).length;
  const m = snap.methodology ?? {};
  const methodParts = ["studyDesign", "studySetting", "population", "sampleSize", "dataCollectionMethods", "dataAnalysis", "ethicalConsiderations"].filter((k) => {
    const v = m[k];
    return Array.isArray(v) ? v.length > 0 : !!v && !!String(v).trim();
  }).length;
  const unproven = dash && dash.tasks.length === tasks.length ? unprovenDone(dash).length : 0;
  const pct = unproven && dash ? proofProgress(dash).pct : tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  // «بانتظار اللجنة» بس لو انرفع فعلًا (خلصوا خطوات النموذج الأربع)
  const outcome = snap.ethics?.outcome === "pending" && (snap.ethics.stepsDone ?? 0) < 4 ? null : (snap.ethics?.outcome ?? null);
  const perMember = (snap.members ?? []).map((mem) => {
    const mine = tasks.filter((t) => t.assigneeName === mem.name);
    return { name: mem.name, total: mine.length, done: mine.filter((t) => t.status === "done").length };
  });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rp-wrap">
      <div className="rp-bar print:hidden">
        <Link to={`/supervisor?t=${token}`} className="rp-back">
          <ChevronRight size={16} aria-hidden />
          {tr("رجوع")}
        </Link>
        <button type="button" className="rp-print" onClick={() => window.print()}>
          <Printer size={17} aria-hidden />
          {tr("احفظوه PDF")}
        </button>
      </div>

      <article className="rp-page" dir={isEn ? "ltr" : "rtl"} lang={isEn ? "en" : "ar"}>
        <header className="rp-head">
          <div>
            <p className="rp-kicker">{tr("تقرير تقدّم فريق البحث")}</p>
            <h1 className="rp-title">
              {/* bdi: عنوان إنجليزي بصفحة عربية يبقى بمحاذاة الصفحة وعلامة الاستفهام بمكانها */}
              <bdi>{snap.project?.title?.trim() || snap.teamName}</bdi>
            </h1>
            <p className="rp-sub">
              {trx("فريق «{0}» · {1} أعضاء · {2}", <bdi key="n">{snap.teamName}</bdi>, snap.members?.length ?? 0, formatDateFull(today))}
            </p>
          </div>
          <WLogo size={44} tone="ink" />
        </header>

        <section className="rp-stats">
          <div>
            <b dir="ltr">{pct}%</b>
            <span>{unproven ? tr("المهام المنجزة بدليل ({0} من {1})", done - unproven, tasks.length) : tr("المهام المنجزة ({0} من {1})", done, tasks.length)}</span>
          </div>
          <div>
            <b dir="ltr">
              {secDone}/{sections.length || 7}
            </b>
            <span>{tr("أقسام المقترح المكتملة")}</span>
          </div>
          <div>
            <b dir="ltr">{methodParts}/7</b>
            <span>{tr("أجزاء المنهجية")}</span>
          </div>
          <div>
            <b>{outcome ? tr(OUTCOME[outcome] ?? outcome) : tr("ما انرفعت للجنة")}</b>
            <span>{tr("الموافقة الأخلاقية")}</span>
          </div>
        </section>

        <div className="rp-cols">
          <section>
            <h2>{tr("أقسام المقترح")}</h2>
            <ul>
              {sections.map((s) => (
                <li key={s.key}>
                  <span>{isEn ? s.labelEn || s.labelAr : s.labelAr}</span>
                  <em className={written(s) ? "ok" : s.status === "in-progress" || s.status === "done" ? "mid" : ""}>
                    {written(s) ? tr("مكتمل") : s.status === "done" ? tr("معلّم مكتمل · بدون نص") : s.status === "in-progress" ? tr("قيد الكتابة") : tr("ما بدأ")}
                  </em>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2>{tr("مساهمة الأعضاء")}</h2>
            <ul>
              {perMember.map((p) => (
                <li key={p.name}>
                  <span>{p.name}</span>
                  <em dir="ltr">
                    {p.done}/{p.total}
                  </em>
                </li>
              ))}
            </ul>
            {snap.project?.targetSubmissionDate && (
              <p className="rp-note">
                {tr("موعد التسليم: {0} ({1} يوم)", formatDateShort(snap.project.targetSubmissionDate), Math.max(0, daysUntil(snap.project.targetSubmissionDate)))}
              </p>
            )}
          </section>
        </div>

        <div className="rp-cols">
          <section>
            <h2>{tr("المتأخر ({0})", late.length)}</h2>
            {late.length === 0 ? (
              <p className="rp-note">{tr("ما فيه مهام متأخرة ✓")}</p>
            ) : (
              <ul>
                {late.slice(0, 8).map((t, i) => (
                  <li key={i}>
                    <span>{t.title}</span>
                    <em>{[t.assigneeName, t.dueDate ? formatDateShort(t.dueDate) : ""].filter(Boolean).join(" · ")}</em>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2>{tr("الجاي")}</h2>
            {upcoming.length === 0 ? (
              <p className="rp-note">{tr("ما فيه مهام بمواعيد قريبة.")}</p>
            ) : (
              <ul>
                {upcoming.map((t, i) => (
                  <li key={i}>
                    <span>{t.title}</span>
                    <em>{[t.assigneeName, t.dueDate ? formatDateShort(t.dueDate) : ""].filter(Boolean).join(" · ")}</em>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <footer className="rp-foot">{tr("أُنشئ من Wesync بتاريخ {0} — البيانات من عمل الفريق الفعلي على المنصة.", formatDateShort(today))}</footer>
      </article>
    </div>
  );
}
