import { Link } from "react-router-dom";
import { ArrowLeft, ClipboardList, Info, MapPin } from "lucide-react";
import clsx from "clsx";
import Card, { CardHeader } from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import ProgressBar from "../components/ui/ProgressBar";
import { fieldworkSites, teamMembers } from "../data/mockData";
import { useAuth } from "../context/AuthContext";
import { useSurveys, useSurveyResponseCounts } from "../hooks/useSurveys";
import { useMethodology } from "../hooks/useMethodology";
import { summarizeCollection } from "../lib/dataCollection";

const pinColor = {
  completed: "text-brand-500",
  active: "text-amber-accent-500",
  "not-started": "text-brand-950/25",
};

const statusLabel = {
  completed: "اكتمل",
  active: "جارٍ",
  "not-started": "لم يبدأ",
};

const statusChip = {
  completed: "text-brand-600 bg-brand-50",
  active: "text-amber-accent-600 bg-amber-accent-50",
  "not-started": "text-brand-950/40 bg-surface-muted",
};

function FieldworkDemo() {
  const memberById = (id: string) => teamMembers.find((m) => m.id === id)!;
  const totalCollected = fieldworkSites.reduce((sum, s) => sum + s.collected, 0);
  const totalTarget = fieldworkSites.reduce((sum, s) => sum + s.target, 0);
  const collectedPct = totalTarget > 0 ? Math.round((totalCollected / totalTarget) * 100) : 0;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="flex items-start gap-3 rounded-3xl border border-sky-accent-200 bg-sky-accent-50 px-5 py-4 lg:col-span-3">
        <Info size={18} className="mt-0.5 shrink-0 text-sky-accent-600" />
        <p className="text-sm font-semibold text-sky-accent-700">
          مرحلة جمع البيانات (Data Collection) ما بدأت بعد — هذي الصفحة تنشط تلقائيًا
          بعد اكتمال المنهجية والحصول على الموافقة الأخلاقية.
        </p>
      </div>

      <Card tone="teal" className="lg:col-span-2">
        <CardHeader title="مواقع الجمع الميداني" subtitle="المملكة العربية السعودية" />
        <div className="relative h-96 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 via-surface-muted to-sky-accent-50">
          {fieldworkSites.map((site) => (
            <div
              key={site.id}
              className="group absolute -translate-x-1/2 -translate-y-full"
              style={{ right: `${site.x}%`, top: `${site.y}%` }}
            >
              <div className="flex flex-col items-center">
                <span className="mb-1 whitespace-nowrap rounded-lg bg-paper px-2 py-1 text-[11px] font-bold text-brand-950 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
                  {site.city} — {site.collected}/{site.target}
                </span>
                <MapPin
                  size={30}
                  className={clsx("drop-shadow", pinColor[site.status])}
                  fill="currentColor"
                  fillOpacity={0.15}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-brand-950/50">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> اكتمل
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-accent-500" /> جارٍ
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-950/25" /> لم يبدأ
          </span>
        </div>
      </Card>

      <Card tone="amber">
        <CardHeader title="إجمالي المشاركين المستهدف" />
        <p className="text-3xl font-extrabold text-brand-950">
          {totalCollected}
          <span className="text-base font-medium text-brand-950/40"> / {totalTarget}</span>
        </p>
        <p className="mb-3 text-xs text-brand-950/45">{collectedPct}% من الهدف</p>
        <ProgressBar value={collectedPct} />
      </Card>

      <div className="space-y-3 lg:col-span-3">
        {fieldworkSites.map((site) => {
          const lead = memberById(site.leadId);
          const pct = Math.round((site.collected / site.target) * 100);
          return (
            <Card key={site.id} className="flex flex-wrap items-center gap-4">
              <MapPin size={20} className={pinColor[site.status]} />
              <div className="w-32 font-semibold text-brand-950">{site.city}</div>
              <div className="flex min-w-[160px] flex-1 items-center gap-3">
                <ProgressBar value={pct} className="flex-1" />
                <span className="w-16 shrink-0 text-sm font-semibold text-brand-950/60">
                  {site.collected}/{site.target}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Avatar initials={lead.initials} color={lead.color} size="sm" />
                <span className="hidden text-sm text-brand-950/60 sm:block">
                  {lead.name.split(" ")[0]}
                </span>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusChip[site.status]}`}>
                {statusLabel[site.status]}
              </span>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

const surveyStatus = { draft: "مسودة", open: "مفتوح", closed: "مغلق" } as const;

/** جمع البيانات الحقيقي — من ردود استبيانات الفريق مقابل الهدف (بدل المواقع التجريبية) */
function FieldworkReal() {
  const { surveys, loading } = useSurveys();
  const counts = useSurveyResponseCounts(surveys);
  const { methodology } = useMethodology();
  const summary = summarizeCollection(surveys, counts, methodology.sampling.sampleSize);
  const pct = summary.target ? Math.min(100, Math.round((summary.collected / summary.target) * 100)) : 0;

  if (!loading && surveys.length === 0) {
    return (
      <Card tone="sky" className="flex flex-wrap items-center gap-4">
        <ClipboardList size={26} className="text-sky-accent-600" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-extrabold text-brand-950">ما بدأتوا جمع البيانات بعد</p>
          <p className="mt-0.5 text-sm text-brand-950/60">سوّوا استبيانكم وشاركوا رابطه، والردود تنعد هنا تلقائيًا وتحرّك تقدّم مرحلة جمع البيانات.</p>
        </div>
        <Link to="/surveys" className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-600">
          افتحوا الاستبيانات <ArrowLeft size={15} />
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card tone="amber">
        <CardHeader title="الردود المجمّعة" subtitle="من استبيانات الفريق (النسخ التجريبية Pilot ما تنحسب)" />
        <p className="text-3xl font-extrabold text-brand-950">
          {summary.collected}
          {summary.target !== null && <span className="text-base font-medium text-brand-950/40"> / {summary.target}</span>}
        </p>
        {summary.target !== null ? (
          <>
            <p className="mb-3 text-xs text-brand-950/45">
              {pct}% من الهدف — {summary.targetSource === "surveys" ? "حسب أهداف الاستبيانات" : "حسب حجم العينة بالمنهجية"}
            </p>
            <ProgressBar value={pct} />
          </>
        ) : (
          <p className="text-xs text-brand-950/55">
            ما انحدد هدف — اكتبوا حجم العينة بالمنهجية أو هدف الردود بالاستبيان عشان نحسب النسبة.
          </p>
        )}
      </Card>
      <div className="space-y-3">
        {summary.perSurvey.map((s) => (
          <Card key={s.id} className="flex flex-wrap items-center gap-4">
            <ClipboardList size={20} className="text-brand-500" />
            <div className="min-w-0 flex-1 font-semibold text-brand-950">
              {s.title || "استبيان بدون عنوان"}
              {s.isPilot && <span className="ms-2 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-brand-950/50">تجريبي</span>}
            </div>
            <span className="text-sm font-semibold text-brand-950/60">
              {s.count}
              {s.targetN ? `/${s.targetN}` : ""} رد
            </span>
            <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-600">{surveyStatus[s.status]}</span>
            <Link to={`/surveys/${s.id}`} className="text-xs font-bold text-brand-700 hover:text-brand-900">
              افتحوه
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function Fieldwork() {
  const { mode } = useAuth();
  return mode === "supabase" ? <FieldworkReal /> : <FieldworkDemo />;
}
