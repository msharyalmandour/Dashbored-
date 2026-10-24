import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, Loader2, TriangleAlert } from "lucide-react";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useResearchProject } from "../hooks/useResearchProject";
import { useResearchStages } from "../hooks/useResearchStages";
import { backwardPlan, daysBetweenIso } from "../lib/planner";
import { formatDateShort, toISODate } from "../lib/date";
import { locale, tr, trx } from "../lib/i18n";

export default function Planner() {
  const { canWrite, isLeader } = useAuth();
  const { showToast } = useToast();
  const { project, updateProject } = useResearchProject();
  const { stages, updateStage } = useResearchStages();

  const todayIso = toISODate(new Date());
  const [endISO, setEndISO] = useState("");
  const [startISO, setStartISO] = useState(todayIso);
  const [bufferPct, setBufferPct] = useState(12);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!endISO && project?.targetSubmissionDate) setEndISO(project.targetSubmissionDate);
  }, [project?.targetSubmissionDate, endISO]);

  const plan = useMemo(
    () =>
      endISO
        ? backwardPlan({
            stages: stages.map((s) => ({ id: s.id, stageKey: s.stageKey, titleAr: s.titleAr, order: s.order, status: s.status })),
            startISO,
            endISO,
            bufferPct,
          })
        : null,
    [stages, startISO, endISO, bufferPct],
  );

  const active = stages.find((s) => s.status === "active");
  const daysLeft = endISO ? daysBetweenIso(todayIso, endISO) : null;
  const weeksLeft = daysLeft !== null ? Math.max(0, Math.round(daysLeft / 7)) : null;

  const apply = async () => {
    if (!plan || plan.rows.length === 0) return;
    setApplying(true);
    let failed = 0;
    for (const r of plan.rows.filter((x) => !x.isBuffer)) {
      const { error } = await updateStage(r.id, { startDate: r.start, targetDate: r.target });
      if (error) failed++;
    }
    // موعد التسليم نفسه كان ما ينحفظ بأي مكان — بدونه يظل تنبيه «حدّدوا الموعد» وعدّاد الأيام فاضيين
    if (isLeader && endISO && endISO !== project?.targetSubmissionDate) {
      const { error } = await updateProject({ targetSubmissionDate: endISO });
      if (error) failed++;
    }
    setApplying(false);
    showToast(
      failed
        ? { title: tr("تطبّق جزء من الجدول"), desc: tr("{0} مراحل ما تحدّثت", failed), icon: TriangleAlert, tone: "amber" }
        : { title: tr("تم تطبيق الجدول ✅"), desc: tr("تلقونه بصفحة الجدول الزمني"), icon: Check, tone: "brand" },
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-brand-950">{tr("مخطط الموعد النهائي")}</h1>
        <p className="mt-1 text-sm leading-relaxed text-brand-950/55">{tr("حطوا موعد التسليم، ونرجع للخلف ونوزّع الوقت على المراحل الباقية بأوزان واقعية (جمع البيانات والمراجعة ياخذون أكبر وقت)، مع هامش أمان قبل التسليم. الدراسات على طلاب التمريض تقول إن ضيق الوقت أكبر عائق، فالتخطيط من الأول يفرق.")}</p>
      </div>

      <Card tone="cream" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-brand-950/70">{tr("موعد التسليم النهائي")}</span>
          <input type="date" value={endISO} onChange={(e) => setEndISO(e.target.value)} className="w-full rounded-lg border border-brand-100 bg-paper px-3 py-2 text-sm outline-none focus:border-brand-300" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-brand-950/70">{tr("نبدأ الحساب من")}</span>
          <input type="date" value={startISO} onChange={(e) => setStartISO(e.target.value)} className="w-full rounded-lg border border-brand-100 bg-paper px-3 py-2 text-sm outline-none focus:border-brand-300" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-brand-950/70">{tr("هامش الأمان")}</span>
          <select value={bufferPct} onChange={(e) => setBufferPct(Number(e.target.value))} className="w-full rounded-lg border border-brand-100 bg-paper px-3 py-2 text-sm outline-none focus:border-brand-300">
            <option value={8}>{tr("٨٪ (مشدود)")}</option>
            <option value={12}>{tr("١٢٪ (موصى به)")}</option>
            <option value={20}>{tr("٢٠٪ (مريح)")}</option>
          </select>
        </label>
      </Card>

      {daysLeft !== null && (
        <Card tone="teal" className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs font-bold text-brand-950/50">{tr("باقي على التسليم")}</p>
            <p className="text-2xl font-extrabold text-brand-950">
              {daysLeft >= 0 ? tr("{0} يوم", daysLeft.toLocaleString(locale)) : tr("الموعد فات!")}
              {weeksLeft !== null && daysLeft >= 0 && <span className="ms-2 text-sm font-bold text-brand-950/45">{trx("(حوالي {0} أسبوع)", weeksLeft.toLocaleString(locale))}</span>}
            </p>
          </div>
          {active && (
            <div>
              <p className="text-xs font-bold text-brand-950/50">{tr("مرحلتكم الحالية")}</p>
              <p className="text-sm font-extrabold text-brand-950">{active.titleAr}</p>
            </div>
          )}
        </Card>
      )}

      {plan && plan.warnings.length > 0 && (
        <div className="space-y-2">
          {plan.warnings.map((w) => (
            <p key={w} className="flex items-start gap-2 rounded-2xl bg-amber-accent-50 px-4 py-3 text-sm font-semibold text-amber-accent-700">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" />
              {w}
            </p>
          ))}
        </div>
      )}

      {plan && plan.rows.length > 0 && (
        <Card className="space-y-4">
          <h3 className="flex items-center gap-2 text-base font-bold text-brand-950">
            <CalendarClock size={18} className="text-brand-500" />{tr("الجدول المقترح للمراحل الباقية")}</h3>
          <div className="overflow-x-auto rounded-2xl border border-brand-100">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted text-xs text-brand-950/55">
                <tr>
                  <th className="px-3 py-2 text-start font-bold">{tr("المرحلة")}</th>
                  <th className="px-3 py-2 text-start font-bold">{tr("من")}</th>
                  <th className="px-3 py-2 text-start font-bold">{tr("إلى")}</th>
                  <th className="px-3 py-2 text-start font-bold">{tr("المدة")}</th>
                  <th className="px-3 py-2 text-start font-bold">{tr("جدولكم الحالي")}</th>
                </tr>
              </thead>
              <tbody>
                {plan.rows.map((r) => {
                  const cur = stages.find((s) => s.id === r.id);
                  const shift = cur?.targetDate ? daysBetweenIso(cur.targetDate, r.target) : null;
                  return (
                    <tr key={r.id} className={`border-t border-brand-100/70 ${r.isBuffer ? "bg-amber-accent-50/50 text-amber-accent-700" : ""}`}>
                      <td className="px-3 py-2 font-semibold text-brand-950/85">{r.titleAr}</td>
                      <td className="px-3 py-2 text-brand-950/70">{formatDateShort(r.start)}</td>
                      <td className="px-3 py-2 text-brand-950/70">{formatDateShort(r.target)}</td>
                      <td className="px-3 py-2 text-brand-950/70">{trx("{0} يوم", r.days)}</td>
                      <td className="px-3 py-2 text-xs text-brand-950/50">
                        {r.isBuffer
                          ? "—"
                          : cur?.targetDate
                            ? `${formatDateShort(cur.targetDate)}${shift ? (shift > 0 ? tr(" (يتأخر {0} يوم)", shift) : tr(" (يتقدّم {0} يوم)", -shift)) : tr(" (نفسه)")}`
                            : tr("بدون موعد")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={apply}
              disabled={applying || !canWrite}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50"
            >{trx("{0}طبّقوا هذا الجدول على مراحل البحث", applying && <Loader2 size={15} className="animate-spin" />)}</button>
            <p className="text-[11px] text-brand-950/45">{tr("يحدّث مواعيد المراحل غير المنتهية بصفحة «الجدول الزمني» (المراحل المنتهية ما تتغير). اتفقوا مع المشرفة قبل التطبيق.")}</p>
          </div>
        </Card>
      )}

      {!endISO && <p className="text-sm text-brand-950/50">{tr("اختاروا موعد التسليم النهائي لتظهر الخطة.")}</p>}
    </div>
  );
}
