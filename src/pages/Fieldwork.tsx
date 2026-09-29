import { Info, MapPin } from "lucide-react";
import clsx from "clsx";
import Card, { CardHeader } from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import ProgressBar from "../components/ui/ProgressBar";
import { fieldworkSites, teamMembers } from "../data/mockData";

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

export default function Fieldwork() {
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
