import { BookMarked, CheckCircle2, Circle, ExternalLink } from "lucide-react";
import Card, { CardHeader } from "../components/ui/Card";
import ProgressBar from "../components/ui/ProgressBar";
import { evidenceLibrary } from "../data/mockData";
import type { LiteratureTheme } from "../data/types";

const themeOrder: LiteratureTheme[] = [
  "Delirium",
  "Nursing Knowledge",
  "Detection Tools",
  "Tool Utilization",
  "Patient Outcomes",
];

const themeLabelAr: Record<LiteratureTheme, string> = {
  Delirium: "الهذيان",
  "Nursing Knowledge": "معرفة الممرضات",
  "Detection Tools": "أدوات الكشف",
  "Tool Utilization": "استخدام الأدوات",
  "Patient Outcomes": "نتائج المرضى",
};

export default function LiteratureReview() {
  const reviewed = evidenceLibrary.filter((p) => p.reviewStatus === "reviewed").length;
  const collected = evidenceLibrary.length;
  const remaining = collected - reviewed;
  const pct = Math.round((reviewed / collected) * 100);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card tone="teal">
          <p className="text-sm font-semibold text-brand-950/60">الدراسات التي تم جمعها</p>
          <p className="font-display mt-2 text-3xl font-extrabold text-brand-950">{collected}</p>
        </Card>
        <Card tone="cream">
          <p className="text-sm font-semibold text-brand-950/60">الدراسات التي تمت مراجعتها</p>
          <p className="font-display mt-2 text-3xl font-extrabold text-brand-950">{reviewed}</p>
        </Card>
        <Card tone="sky">
          <p className="text-sm font-semibold text-brand-950/60">الدراسات المتبقية</p>
          <p className="font-display mt-2 text-3xl font-extrabold text-brand-950">{remaining}</p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between text-sm font-semibold text-brand-950/60">
          <span>نسبة الإنجاز في مراجعة الأدبيات</span>
          <span className="text-brand-600">{pct}%</span>
        </div>
        <ProgressBar value={pct} className="mt-2" />
      </Card>

      {themeOrder.map((theme) => {
        const studies = evidenceLibrary.filter((p) => p.theme === theme);
        if (studies.length === 0) return null;

        return (
          <Card key={theme}>
            <CardHeader
              title={`${themeLabelAr[theme]}`}
              subtitle={`${theme} · ${studies.length} ${studies.length === 1 ? "دراسة" : "دراسات"}`}
            />
            <div className="space-y-3">
              {studies.map((study) => (
                <div
                  key={study.id}
                  className="rounded-2xl border border-brand-100/70 bg-surface-muted p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-brand-950">{study.title}</p>
                      <p className="mt-0.5 text-xs text-brand-950/50">
                        {study.authors} · {study.year} · {study.studyDesign}
                      </p>
                    </div>
                    <span
                      className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${
                        study.reviewStatus === "reviewed"
                          ? "bg-brand-50 text-brand-600"
                          : "bg-amber-accent-50 text-amber-accent-600"
                      }`}
                    >
                      {study.reviewStatus === "reviewed" ? (
                        <CheckCircle2 size={13} />
                      ) : (
                        <Circle size={13} />
                      )}
                      {study.reviewStatus === "reviewed" ? "تمت مراجعتها" : "تم جمعها"}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-xl bg-paper p-3">
                      <p className="text-[11px] font-bold text-brand-950/45">أهم النتائج</p>
                      <p className="mt-1 text-sm text-brand-950/75">{study.keyFinding}</p>
                    </div>
                    <div className="rounded-xl bg-paper p-3">
                      <p className="text-[11px] font-bold text-brand-950/45">الصلة بالبحث</p>
                      <p className="mt-1 text-sm text-brand-950/75">{study.relevance}</p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-brand-600">
                    <BookMarked size={13} />
                    {study.link ? (
                      <a href={study.link} className="flex items-center gap-1 hover:underline">
                        عرض المصدر <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="text-brand-950/35">لا يوجد رابط مرفق</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
