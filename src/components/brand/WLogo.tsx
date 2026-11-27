import { useEffect, useState } from "react";

/* شعار Wesync الرسمي — variant:'wave' من brand/wesync-logo.js: موجتين تنزلق وحدة على الثانية وتصير W وحدة (المزامنة).
   نفس المسار والسماكة (22) والألوان، والمربع: الشعار ×0.8 داخل مربع حوافه 46/200 (brand/logo/app-icon-wave-*.svg).
   الحالات زي الأصل:
   - idle: ثابت (W وحدة، نفس الملفات الثابتة).
   - loading: الموجتين تبتعد (−22,−10)/(+22,+10) وتقرّب، والثانية تبهت لـ .35 — بديل كل مؤشرات التحميل.
   - sync: تبدأ متباعدة وتقفل على W، وبعدها ومضة ذهبية (نجمة) مرة وحدة. للنجاحات الكبيرة بس.
   الحركة بـ CSS (brand.css) بدل حلقة requestAnimationFrame، عشان عشرات المؤشرات ما تثقّل الصفحة. */

export const WAVE = "M22 70 C 44 70 42 138 64 138 C 86 138 84 86 100 86 C 116 86 114 138 136 138 C 158 138 156 70 178 70";
/** النجمة الذهبية عند (100,72) — نفس شكل spark بالأصل بنصف قطر 26 */
const SPARK = (() => {
  const cx = 100, cy = 72, r = 26;
  return `M${cx} ${cy - r}L${cx + r * 0.28} ${cy - r * 0.28}L${cx + r} ${cy}L${cx + r * 0.28} ${cy + r * 0.28}L${cx} ${cy + r}L${cx - r * 0.28} ${cy + r * 0.28}L${cx - r} ${cy}L${cx - r * 0.28} ${cy - r * 0.28}Z`;
})();

export const W_INK = "#1E0B05";
export const W_CREAM = "#F3E9DC";

export type WLogoTone = "cream" | "ink" | "ember" | "bare";
export type WLogoState = "idle" | "loading" | "sync";

/** ألوان كل نوع من brand/logo: cream = مربع كريمي وW حبر (على الداكن) · ink = العكس (على الكريمي) · ember = برتقالي وW أبيض */
const TONES: Record<Exclude<WLogoTone, "bare">, { bg: string; fg: string; gold: string }> = {
  cream: { bg: W_CREAM, fg: W_INK, gold: "#E39A2E" },
  ink: { bg: W_INK, fg: W_CREAM, gold: "#FFB547" },
  ember: { bg: "#E9651F", fg: "#FFFFFF", gold: "#FFB547" },
};

export default function WLogo({
  size = 32,
  tone = "cream",
  state = "idle",
  playKey,
  label,
  className,
}: {
  size?: number;
  tone?: WLogoTone;
  state?: WLogoState;
  /** غيّروه عشان تعيدون لحظة sync (زي .play() بالأصل) */
  playKey?: string | number;
  /** نص للقارئ الصوتي؛ بدونه الشعار زخرفة */
  label?: string;
  className?: string;
}) {
  const s = Math.max(20, size);
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (state === "sync") setRun((n) => n + 1);
  }, [state, playKey]);

  const tile = tone !== "bare";
  const t = tile ? TONES[tone] : { bg: "none", fg: "currentColor", gold: "#FFB547" };
  const cls = ["wl", state === "loading" && "wl-loading", state === "sync" && "wl-sync", className].filter(Boolean).join(" ");
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true as const };
  const moving = state !== "idle";

  const body = (
    <g fill="none" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" style={{ ["--wl-gold" as string]: t.gold, ["--wl-fg" as string]: t.fg }}>
      {moving && <path className="wl-b" d={WAVE} stroke={t.fg} />}
      <path className="wl-a" d={WAVE} stroke={t.fg} />
      {state === "sync" && <path className="wl-spark" d={SPARK} fill={t.gold} stroke="none" />}
    </g>
  );

  if (!tile)
    return (
      <svg key={`b${run}`} width={s} height={Math.round(s * 0.52)} viewBox="6 50 188 100" className={cls} {...a11y}>
        {body}
      </svg>
    );
  return (
    <svg key={`t${run}`} width={s} height={s} viewBox="0 0 200 200" className={cls} {...a11y}>
      <rect width="200" height="200" rx="46" fill={t.bg} />
      <g transform="translate(20 20) scale(.8)">{body}</g>
    </svg>
  );
}

/** نسخة نصية (WLogo.svg بالأصل) للأماكن اللي ما فيها React: الأيقونات والإيميل */
export function wLogoSvg({ size = 512, tone = "cream", tile = true }: { size?: number; tone?: Exclude<WLogoTone, "bare">; tile?: boolean } = {}): string {
  const t = TONES[tone];
  const body = `<path d="${WAVE}" fill="none" stroke="${t.fg}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}">${tile ? `<rect width="200" height="200" rx="46" fill="${t.bg}"/><g transform="translate(20 20) scale(.8)">${body}</g>` : body}</svg>`;
}

/** مؤشر التحميل الموحّد (بدل كل الدوّارات): الموجة بلون النص، بحالة loading */
export function WSpin({ size = 20, className, label }: { size?: number; className?: string; label?: string }) {
  return <WLogo tone="bare" state="loading" size={Math.round(size * 1.5)} className={className} label={label} />;
}
