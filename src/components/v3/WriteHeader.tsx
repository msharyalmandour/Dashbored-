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
    <nav aria-label={tr("أكتب")} className="v3-g v3-scroll-x flex max-w-full gap-1 rounded-full p-[5px] print:hidden">
      {tabs.map((t) => {
        const on = pathname.startsWith(t.to);
        return (
          <Link
            key={t.to}
            to={t.to}
            ref={on ? activeRef : undefined}
            aria-current={on ? "page" : undefined}
            className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-full px-4 text-[15px] transition-all"
            style={on ? { background: "#F6F1EC", color: "#160904", fontWeight: 700, boxShadow: "0 0 22px rgba(255,200,140,.35)" } : { color: "var(--ws-c-text)" }}
          >
            {t.label}
            <span className="rounded-full px-[7px] text-xs font-bold" style={on ? { background: "#160904", color: "#FFB444" } : { background: "rgba(255,255,255,.1)" }}>
              {num(t.n)}/{num(t.of)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/** ترويسة صفحات «أكتب»: عنوان البحث + نوعه + المشرف/ة + الأيام للتسليم، والتبويبات بعدّاداتها */
/** live: عدّاد الصفحة المفتوحة من حالتها نفسها، عشان يتحدّث مع كل إجابة بدون تحديث الصفحة */
export default function WriteHeader({ fallbackTitle, style, live }: { fallbackTitle: string; style?: CSSProperties; live?: Live }) {
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
    <header className="v3-rise relative mb-5 flex min-w-0 flex-wrap items-center gap-3.5" style={style}>
      <div className="min-w-0 flex-[1_1_320px]">
        <div className="v3-eye">{tr("رحلة البحث · أكتب")}</div>
        <h1 className="v3-k m-0 text-[24px] leading-snug sm:text-[30px]" dir="auto">
          {project?.title?.trim() || fallbackTitle}
        </h1>
        {meta.length > 0 && <p className="v3-mut m-0 text-sm">{meta.join(" · ")}</p>}
      </div>
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
