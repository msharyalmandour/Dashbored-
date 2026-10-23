import type { ReactNode } from "react";
import clsx from "clsx";
import type { LiteratureTheme } from "../../data/types";

/* لغة التصميم لصفحات قسم «أبحث» (المكتبة، الدراسات، المراجعة):
   ألوان ثابتة من التصميم — مو من ثيم الموقع — عشان تطلع نفس المرجع بأي ثيم. */

/** بطاقة زجاج داكنة بحدّ برتقالي هادئ */
export const glassCard =
  "rounded-3xl border border-[rgba(255,107,0,.3)] bg-[rgba(24,16,8,.88)] text-[#F4F0EC] shadow-[inset_0_1px_0_rgba(255,200,120,.12),0_24px_60px_rgba(255,100,0,.08)] backdrop-blur-[18px]";

/** زر رئيسي كبسولة (تدرّج برتقالي ← ذهبي) */
export const gradientPill =
  "inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-l from-[#FFB444] to-[#FF6B00] px-6 py-2.5 text-sm font-bold text-[#1A0F00] shadow-[0_8px_28px_-8px_#FF6B00] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";

/** حقل بكبسولة زجاجية */
export const pillField =
  "w-full rounded-full border border-[rgba(255,200,130,.4)] bg-white/[0.06] px-5 py-2.5 text-sm text-[#F4F0EC] outline-none transition placeholder:text-[#8F8378] focus:border-[#FF8A24] focus:shadow-[0_0_0_4px_rgba(255,138,36,.14)]";

/** عنوان الصفحة مرة وحدة: كبير بخط كوفي، وتحته سطر شرح، والزر الرئيسي بالطرف الثاني */
export function ResearchHeader({ title, subtitle, action }: { title: string; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-kufi text-4xl font-extrabold leading-tight text-[#F4F0EC] md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-[60ch] text-base text-[#B8ADA2]">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}

/** كبسولة فلتر مع عدد */
export function FilterPill({ active, count, children, onClick }: { active: boolean; count?: number; children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "rounded-full border px-4 py-1.5 text-sm transition-colors",
        active
          ? "border-[#FF8A24]/70 bg-[#FF6B00]/15 text-[#FFB444]"
          : "border-white/[0.14] text-[#B8ADA2] hover:border-[#FF8A24]/50 hover:text-[#F4F0EC]",
      )}
    >
      {children}
      {count !== undefined && <span className="ms-1.5 opacity-70">{count}</span>}
    </button>
  );
}

/** شارة المصدر — كلها بلون الهوية (الذهبي)، والتفريق بالاسم */
export function SourceBadge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-[#FFB444] px-2.5 py-0.5 text-xs font-bold text-[#1A0F00]">{children}</span>;
}

/** نص المصدر من رابط الدراسة (ما عندنا حقل مصدر محفوظ بالمكتبة) */
export function sourceFromLink(link?: string): string {
  if (!link) return "يدوي";
  const l = link.toLowerCase();
  if (l.includes("pubmed")) return "PubMed";
  if (l.includes("openalex")) return "OpenAlex";
  if (l.includes("doi.org")) return "DOI";
  return "رابط";
}

/** أسماء المحاور بالعربي (القيم المخزّنة إنجليزي) */
export const themeLabelAr: Record<LiteratureTheme, string> = {
  Delirium: "الهذيان",
  "Nursing Knowledge": "معرفة الممرضات",
  "Detection Tools": "أدوات الكشف",
  "Tool Utilization": "استخدام الأدوات",
  "Patient Outcomes": "نتائج المرضى",
};
