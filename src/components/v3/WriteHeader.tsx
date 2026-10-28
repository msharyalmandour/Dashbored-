import type { CSSProperties } from "react";
import { useResearchProject } from "../../hooks/useResearchProject";
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

/** ترويسة صفحات «أكتب»: عنوان البحث + نوعه + المشرف/ة + الأيام للتسليم */
export default function WriteHeader({ fallbackTitle, style }: { fallbackTitle: string; style?: CSSProperties }) {
  const { project } = useResearchProject();
  const supervisor = project?.supervisorName?.trim();
  const typeLabel = project?.researchType ? (isEn ? TYPE_LABEL[project.researchType][1] : TYPE_LABEL[project.researchType][0]) : "";
  const daysLeft = project?.targetSubmissionDate ? daysUntil(project.targetSubmissionDate) : null;
  const meta = [
    typeLabel,
    supervisor ? tr("المشرف/ة {0}", supervisor) : "",
    daysLeft !== null && daysLeft >= 0 ? tr("التسليم بعد {0} يوم", num(daysLeft)) : "",
  ].filter(Boolean);
  return (
    <header className="v3-rise relative mb-5 min-w-0" style={style}>
      <div className="v3-eye">{tr("رحلة البحث · أكتب")}</div>
      <h1 className="v3-k m-0 text-[24px] leading-snug sm:text-[30px]" dir="auto">
        {project?.title?.trim() || fallbackTitle}
      </h1>
      {meta.length > 0 && <p className="v3-mut m-0 text-sm">{meta.join(" · ")}</p>}
    </header>
  );
}

/** توهّج الخلفية البرتقالي اللي يتحرك ببطء */
export function V3Glow() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
      <div className="v3-blob" style={{ width: 700, height: 520, insetInlineEnd: -260, top: -320, background: "#D9380A", opacity: 0.32 }} />
      <div className="v3-blob alt" style={{ width: 420, height: 300, insetInlineEnd: 60, top: -160, background: "#FFD25A", opacity: 0.18, filter: "blur(110px)" }} />
    </div>
  );
}
