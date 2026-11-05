import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronRight, Printer } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { daysUntil, formatDateFull, formatDateShort } from "../lib/date";
import { tr } from "../lib/i18n";

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
  proposalSections: { key: string; labelAr: string; status: string }[];
  methodology: Record<string, unknown> | null;
  project?: { title: string; targetSubmissionDate: string | null } | null;
  ethics?: { outcome: string | null } | null;
}

const OUTCOME: Record<string, string> = { pending: "بانتظار اللجنة", approved: "معتمدة", rejected: "مرفوضة", modifications: "مطلوب تعديلات" };

/** تقرير تقدّم الفريق بصفحة وحدة (A4) — المشرف/ة أو الفريق يحفظونه PDF من زر الطباعة ويرسلونه للقسم أو اللجنة */
export default function SupervisorReport() {
  const { token } = useParams<{ token: string }>();
  const [snap, setSnap] = useState<RSnapshot | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!supabase || !token) {
      setError(true);
      return;
    }
    supabase.rpc("get_team_snapshot", { p_token: token }).then(({ data, error: e }) => {
      if (e || !data) setError(true);
      else setSnap(data as RSnapshot);
    });
  }, [token]);

  if (error) return <p className="p-8 text-center text-[#ABA095]">{tr("الرابط غير صالح أو منتهي.")}</p>;
  if (!snap) return <p className="p-8 text-center text-[#ABA095]" role="status">{tr("نجهّز التقرير…")}</p>;

  const tasks = snap.tasks ?? [];
  const done = tasks.filter((t) => t.status === "done").length;
  const late = tasks.filter((t) => t.status === "overdue" || (t.status !== "done" && !!t.dueDate && daysUntil(t.dueDate) < 0));
  const upcoming = tasks.filter((t) => t.status !== "done" && t.dueDate && daysUntil(t.dueDate) >= 0).sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? "")).slice(0, 6);
  const sections = snap.proposalSections ?? [];
  const secDone = sections.filter((s) => s.status === "done").length;
  const m = snap.methodology ?? {};
  const methodParts = ["studyDesign", "studySetting", "population", "sampleSize", "dataCollectionMethods", "dataAnalysis", "ethicalConsiderations"].filter((k) => {
    const v = m[k];
    return Array.isArray(v) ? v.length > 0 : !!v && !!String(v).trim();
  }).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const perMember = (snap.members ?? []).map((mem) => {
    const mine = tasks.filter((t) => t.assigneeName === mem.name);
    return { name: mem.name, total: mine.length, done: mine.filter((t) => t.status === "done").length };
  });
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rp-wrap">
      <div className="rp-bar print:hidden">
        <Link to={`/supervisor/${token}`} className="rp-back">
          <ChevronRight size={16} className="ltr:rotate-180" aria-hidden />
          {tr("رجوع")}
        </Link>
        <button type="button" className="rp-print" onClick={() => window.print()}>
          <Printer size={17} aria-hidden />
          {tr("احفظوه PDF")}
        </button>
      </div>

      <article className="rp-page" dir="rtl" lang="ar">
        <header className="rp-head">
          <div>
            <p className="rp-kicker">{tr("تقرير تقدّم فريق البحث")}</p>
            <h1 className="rp-title">{snap.project?.title?.trim() || snap.teamName}</h1>
            <p className="rp-sub">
              {tr("فريق «{0}» · {1} أعضاء · {2}", snap.teamName, snap.members?.length ?? 0, formatDateFull(today))}
            </p>
          </div>
          <span className="rp-logo" aria-hidden>
            ∞
          </span>
        </header>

        <section className="rp-stats">
          <div>
            <b dir="ltr">{pct}%</b>
            <span>{tr("المهام المنجزة ({0} من {1})", done, tasks.length)}</span>
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
            <b>{snap.ethics?.outcome ? tr(OUTCOME[snap.ethics.outcome] ?? snap.ethics.outcome) : "—"}</b>
            <span>{tr("الموافقة الأخلاقية")}</span>
          </div>
        </section>

        <div className="rp-cols">
          <section>
            <h2>{tr("أقسام المقترح")}</h2>
            <ul>
              {sections.map((s) => (
                <li key={s.key}>
                  <span>{s.labelAr}</span>
                  <em className={s.status === "done" ? "ok" : s.status === "in-progress" ? "mid" : ""}>{s.status === "done" ? tr("مكتمل") : s.status === "in-progress" ? tr("قيد الكتابة") : tr("ما بدأ")}</em>
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
