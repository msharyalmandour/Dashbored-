import { useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { BookMarked, ExternalLink } from "lucide-react";
import EmptyState from "../components/ui/EmptyState";
import { ResearchHeader, SourceTag, glassCard, gradientPill, sourceFromLink, themeLabelAr } from "../components/ui/researchUi";
import { useEvidencePapers } from "../hooks/useEvidencePapers";
import type { LiteratureTheme } from "../data/types";
import { tr, trx } from "../lib/i18n";

const themeOrder: LiteratureTheme[] = [
  "Delirium",
  "Nursing Knowledge",
  "Detection Tools",
  "Tool Utilization",
  "Patient Outcomes",
];

const arDigit = (n: number) => String(n).replace(/\d/g, (d) => tr("٠١٢٣٤٥٦٧٨٩")[Number(d)]);

export default function LiteratureReview() {
  const { papers } = useEvidencePapers();
  const reviewed = papers.filter((p) => p.reviewStatus === "reviewed").length;
  const collected = papers.length;
  const pct = collected > 0 ? Math.round((reviewed / collected) * 100) : 0;

  // المحاور اللي فيها دراسات فقط، بنفس الترتيب القديم
  const themes = themeOrder
    .map((theme) => ({ theme, studies: papers.filter((p) => p.theme === theme) }))
    .filter((t) => t.studies.length > 0);
  const [picked, setPicked] = useState<LiteratureTheme | null>(null);
  const current = themes.find((t) => t.theme === picked) ?? themes[0];

  if (collected === 0) {
    return (
      <div className="space-y-6">
        <ResearchHeader title={tr("مراجعة الأدبيات")} subtitle={tr("المحاور وكل دراسة فيها، مجموعة من مكتبة أدلتكم.")} />
        <div className={clsx(glassCard, "p-2")}>
          <EmptyState
            icon={BookMarked}
            title={tr("ما فيه دراسات لسا")}
            desc={tr("أضيفوا أول دراسة من مكتبة الأدلة عشان تبدأ مراجعة الأدبيات تتجمّع هنا.")}
          />
        </div>
      </div>
    );
  }

  const statusOf = (studies: typeof papers) => {
    const done = studies.filter((s) => s.reviewStatus === "reviewed").length;
    return done === studies.length ? tr("تمت مراجعتها") : done > 0 ? tr("قيد المراجعة") : tr("لم تبدأ");
  };

  return (
    <div className="space-y-6">
      <ResearchHeader
        title={tr("مراجعة الأدبيات")}
        subtitle={tr("المحاور وكل دراسة فيها. {0} من {1} دراسة تمت مراجعتها ({2}%).", reviewed, collected, pct)}
        action={
          <Link to="/evidence" className={gradientPill}>{tr("مكتبة الأدلة")}</Link>
        }
      />
      <div className="h-1.5 max-w-md overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-gradient-to-l from-[#FFB444] to-[#FF6B00] transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div>
          <p className="mb-3 text-sm text-[#B8ADA2]">{tr("المحاور")}</p>
          <div className="space-y-3">
            {themes.map(({ theme, studies }, i) => {
              const on = theme === current.theme;
              return (
                <button
                  key={theme}
                  type="button"
                  onClick={() => setPicked(theme)}
                  aria-pressed={on}
                  className={clsx(
                    "flex w-full items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-start transition-colors",
                    on
                      ? "border-[#FF8A24]/70 bg-[#FF6B00]/[0.12]"
                      : "border-[rgba(255,107,0,.2)] bg-[rgba(24,16,8,.88)] hover:border-[#FF8A24]/50",
                  )}
                >
                  <span
                    className={clsx(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
                      on ? "border-[#FFB444] text-[#FFB444]" : "border-white/25 text-[#B8ADA2]",
                    )}
                  >
                    {arDigit(i + 1)}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-bold text-[#F4F0EC]">{themeLabelAr[theme]}</span>
                    <span className="block text-xs text-[#B8ADA2]">
                      {arDigit(studies.length)} {studies.length === 1 ? tr("دراسة") : tr("دراسات")} · {statusOf(studies)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <section className={clsx(glassCard, "space-y-5 p-6 md:p-7")}>
          <div>
            <p className="text-sm text-[#FFB444]">{trx("المحور {0}", arDigit(themes.indexOf(current) + 1))}</p>
            <h2 className="mt-1 font-kufi text-3xl font-extrabold leading-tight">{themeLabelAr[current.theme]}</h2>
            <p className="mt-1.5 text-sm text-[#B8ADA2]">
              {arDigit(current.studies.length)} {current.studies.length === 1 ? tr("دراسة") : tr("دراسات")} · {statusOf(current.studies)}
            </p>
          </div>

          <div className="space-y-3 border-t border-white/10 pt-5">
            {current.studies.map((study) => {
              const done = study.reviewStatus === "reviewed";
              return (
                <article key={study.id} className="rounded-2xl bg-white/[0.04] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <SourceTag label={sourceFromLink(study.link)} />
                      <span className={clsx("text-xs font-semibold", done ? "text-[#7fd6a0]" : "text-[#FFB444]")}>
                        {done ? tr("✓ تمت مراجعتها") : tr("تم جمعها")}
                      </span>
                    </div>
                    <span className="text-sm text-[#B8ADA2]">{study.year}</span>
                  </div>
                  <h3 className="mt-3 text-[17px] font-bold leading-snug" dir="auto">
                    {study.title}
                  </h3>
                  <p className="mt-1 text-xs text-[#B8ADA2]" dir="auto">
                    {[study.authors, study.studyDesign].filter(Boolean).join(" · ")}
                  </p>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white/[0.05] p-3.5">
                      <p className="text-[11px] font-bold text-[#B8ADA2]">{tr("أهم النتائج")}</p>
                      <p className="mt-1 text-sm leading-relaxed">{study.keyFinding || "—"}</p>
                    </div>
                    <div className="rounded-2xl bg-white/[0.05] p-3.5">
                      <p className="text-[11px] font-bold text-[#B8ADA2]">{tr("الصلة بالبحث")}</p>
                      <p className="mt-1 text-sm leading-relaxed">{study.relevance || "—"}</p>
                    </div>
                  </div>

                  <div className="mt-3 text-sm">
                    {study.link ? (
                      <a href={study.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#B8ADA2] hover:text-[#F4F0EC]">
                        <ExternalLink size={13} />{tr("الأصل")}</a>
                    ) : (
                      <span className="text-[#B8ADA2]/60">{tr("لا يوجد رابط مرفق")}</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
