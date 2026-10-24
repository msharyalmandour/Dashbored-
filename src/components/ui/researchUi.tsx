import type { ReactNode } from "react";
import clsx from "clsx";
import type { LiteratureTheme } from "../../data/types";
import { tr } from "../../lib/i18n";

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
  if (!link) return tr("يدوي");
  const l = link.toLowerCase();
  if (l.includes("pubmed")) return "PubMed";
  if (l.includes("openalex")) return "OpenAlex";
  if (l.includes("doi.org")) return "DOI";
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return tr("رابط");
  }
}

/** أسماء المحاور بالعربي (القيم المخزّنة إنجليزي) */
export const themeLabelAr: Record<LiteratureTheme, string> = {
  Delirium: tr("الهذيان"),
  "Nursing Knowledge": tr("معرفة الممرضات"),
  "Detection Tools": tr("أدوات الكشف"),
  "Tool Utilization": tr("استخدام الأدوات"),
  "Patient Outcomes": tr("نتائج المرضى"),
};

/** شعارات مصادر البحث — رسم مبسّط داخل بلاطة كريمية (مو ملفات الشعار الرسمية) */
export type SourceName = "pubmed" | "openalex" | "scholar";

export function SourceLogo({ name, size = 22 }: { name: SourceName; size?: number }) {
  const tile = "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[7px] bg-[#F4F0EC]";
  if (name === "scholar")
    return (
      <span className={tile} style={{ width: size, height: size }} aria-hidden>
        <svg viewBox="0 0 24 24" width={size * 0.8} height={size * 0.8}>
          <path d="M12 3 2.5 9.2 12 12.6l9.5-3.4z" fill="#4285F4" />
          <path d="M5.3 12.4v3.1c0 2.3 3 4 6.7 4s6.7-1.7 6.7-4v-3.1L12 14.8z" fill="#356AC3" />
          <circle cx="12" cy="9.6" r="0" fill="#fff" />
          <path d="M12 12.7a4.6 4.6 0 0 1 4.3 3.1H7.7A4.6 4.6 0 0 1 12 12.7z" fill="#A0C3FF" />
          <circle cx="9.3" cy="17.4" r="0.9" fill="#fff" />
          <circle cx="12" cy="17.9" r="0.9" fill="#fff" />
          <circle cx="14.7" cy="17.4" r="0.9" fill="#fff" />
        </svg>
      </span>
    );
  if (name === "openalex")
    return (
      <span className={tile} style={{ width: size, height: size }} aria-hidden>
        <svg viewBox="0 0 24 24" width={size * 0.82} height={size * 0.82}>
          <circle cx="12" cy="12" r="9.2" fill="#C2185B" />
          <path d="M7.6 16.6 12 6.8l4.4 9.8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9.4 13.6h5.2" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    );
  return (
    <span className={tile} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 24 24" width={size * 0.86} height={size * 0.86}>
        <rect x="2.4" y="2.4" width="19.2" height="19.2" rx="4" fill="#20558A" />
        <path d="M9 17.6V6.6h3.6a3 3 0 1 1 0 6H9" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/** كبسولة مصدر: شعار + اسم (مع علامة صح لو مصدر فعّال بالبحث) */
export function sourceKey(source?: string): SourceName | null {
  return source === "pubmed" ? "pubmed" : source === "openalex" ? "openalex" : null;
}

/** شارة مصدر من الاسم النصي (PubMed / OpenAlex / DOI / يدوي…) مع الشعار لو متوفر */
export function SourceTag({ label }: { label: string }) {
  const key = label === "PubMed" ? "pubmed" : label === "OpenAlex" ? "openalex" : null;
  return (
    <SourceBadge>
      <span className="flex items-center gap-1.5">
        {key && <SourceLogo name={key} size={16} />}
        {label}
      </span>
    </SourceBadge>
  );
}
