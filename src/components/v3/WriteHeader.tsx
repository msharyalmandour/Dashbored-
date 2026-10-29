import { useEffect, useRef, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { useResearchProject } from "../../hooks/useResearchProject";
import { useProposal } from "../../hooks/useProposal";
import { useMethodology } from "../../hooks/useMethodology";
import { useEthicalApproval } from "../../hooks/useEthicalApproval";
import { PRINCIPLE_KEYS, methodologyReadyCount, principlesAnswered } from "../../lib/writeProgress";
import type { ResearchType } from "../../data/types";
import { daysUntil } from "../../lib/date";
import { isEn, tr } from "../../lib/i18n";

export const TYPE_LABEL: Record<Exclude<ResearchType, "">, [string, string]> = {
  quantitative: ["كمّي", "Quantitative"],
  qualitative: ["نوعي", "Qualitative"],
  "mixed-methods": ["مختلط", "Mixed methods"],
};

/** أرقام عربية بالواجهة العربية */
export const num = (n: number) => n.toLocaleString(isEn ? "en" : "ar-EG");

/** تبويبات «أكتب» الثلاث مع عدّاد كل وحدة (بدل تبويبات القسم العامة بهالقسم بس) */
type Live = { proposal?: number; methodology?: number; ethics?: number };

function WriteTabs({ live }: { live?: Live }) {
  const { pathname } = useLocation();
  const { sections } = useProposal();
  const { methodology } = useMethodology();
  const { ethicalApproval } = useEthicalApproval();
  const activeRef = useRef<HTMLAnchorElement>(null);
  // بالجوال الشريط ينسحب: نخلي التبويب المفتوح ظاهر
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [pathname]);
  const tabs = [
    { to: "/proposal", label: tr("المقترح البحثي"), n: live?.proposal ?? sections.filter((s) => s.status === "done").length, of: sections.length || 7 },
    { to: "/methodology", label: tr("المنهجية"), n: live?.methodology ?? methodologyReadyCount(methodology), of: 7 },
    { to: "/ethical-approval", label: tr("الموافقة الأخلاقية"), n: live?.ethics ?? principlesAnswered(ethicalApproval.principles), of: PRINCIPLE_KEYS.length },
  ];
  return (
    <nav aria-label={tr("أكتب")} className="wf-tabs mt-5 print:hidden">
      {tabs.map((t) => {
        const on = pathname.startsWith(t.to);
        return (
          <Link key={t.to} to={t.to} ref={on ? activeRef : undefined} aria-current={on ? "page" : undefined}>
            {t.label}
            <i>
              {t.n}/{t.of}
            </i>
          </Link>
        );
      })}
    </nav>
  );
}

/** ترويسة صفحات «أكتب» (كرت زجاجي مثل الرئيسية): عنوان البحث، سؤاله بالإنجليزي، نوعه ومنهجه، المشرف/ة، الأيام للتسليم، والتبويبات بعدّاداتها.
    live: عدّاد الصفحة المفتوحة من حالتها نفسها، عشان يتحدّث مع كل إجابة بدون تحديث الصفحة */
export default function WriteHeader({ fallbackTitle, style, live }: { fallbackTitle: string; style?: CSSProperties; live?: Live }) {
  const { project } = useResearchProject();
  const { methodology } = useMethodology();
  const supervisor = project?.supervisorName?.trim();
  const typeLabel = project?.researchType ? (isEn ? TYPE_LABEL[project.researchType][1] : TYPE_LABEL[project.researchType][0]) : "";
  const method = methodology.dataCollectionMethods.find((m) => typeof m === "string" && m.trim())?.trim() ?? "";
  const daysLeft = project?.targetSubmissionDate ? daysUntil(project.targetSubmissionDate) : null;
  const englishTitle = project?.description && /[A-Za-z]/.test(project.description) ? project.description : "";
  return (
    <header className="hg-card relative mb-[18px] !p-5 lg:!px-[30px] lg:!py-[26px]" style={style}>
      <h1 className="wf-title" dir="auto">
        {project?.title?.trim() || fallbackTitle}
      </h1>
      {englishTitle && <div className="wf-en">{englishTitle}</div>}
      {(typeLabel || supervisor || daysLeft !== null) && (
        <div className="mt-3.5 flex flex-wrap gap-2">
          {typeLabel && <span className="wf-chip">{method ? `${typeLabel} · ${method}` : typeLabel}</span>}
          {supervisor && <span className="wf-chip">{tr("المشرف/ة {0}", supervisor)}</span>}
          {daysLeft !== null && (
            <span className="wf-chip" style={{ color: daysLeft < 0 ? "#FF8A7A" : "#FFC777" }}>
              {daysLeft < 0 ? tr("فات موعد التسليم") : (
                <>
                  {tr("التسليم بعد")} <span className="wf-num">{daysLeft}</span> {tr("يوم")}
                </>
              )}
            </span>
          )}
        </div>
      )}
      <WriteTabs live={live} />
    </header>
  );
}

/** توهّج الخلفية البرتقالي اللي يتحرك ببطء */
export function V3Glow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
      <div className="v3-blob" style={{ width: 700, height: 520, insetInlineEnd: -260, top: -320, background: "#D9380A", opacity: 0.22 }} />
      <div className="v3-blob alt" style={{ width: 420, height: 300, insetInlineEnd: 60, top: -160, background: "#FFD25A", opacity: 0.12, filter: "blur(110px)" }} />
    </div>
  );
}
