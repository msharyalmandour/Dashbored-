import { useEffect, useState } from "react";

/* شعار Wesync الرسمي «الموجة»: موجتين تنزلق وحدة على الثانية وتصير W مدوّرة (المزامنة).
   المصدر: الكانفس (CeoHomeD) — مربع كريمي حوافه 46/200 وW بالحبر، سماكة 18.
   الحالات: idle ثابت · loading الموجتين تبتعد وتقرّب (بديل كل مؤشرات التحميل) · sync تقفل على W وومضة ذهبية مرة وحدة.
   القواعد: أصغر حجم 20px، على الداكن كريمي وعلى الكريمي حبر، وما يتمدد ولا يتلوّن برّا الهوية. */

export const W_LEFT = "M40 76 C 58 76 56 130 74 130 C 92 130 90 90 100 90";
export const W_RIGHT = "M100 90 C 110 90 108 130 126 130 C 144 130 142 76 160 76";
const INK = "#160904";
const CREAM = "#F2EBE3";

export type WLogoTone = "cream" | "ink" | "ember" | "bare";
export type WLogoState = "idle" | "loading" | "sync";

const TONES: Record<Exclude<WLogoTone, "bare">, { bg: string; fg: string }> = {
  cream: { bg: CREAM, fg: INK },
  ink: { bg: INK, fg: CREAM },
  ember: { bg: "url(#wl-ember)", fg: INK },
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
  /** cream = مربع كريمي (على الداكن) · ink = مربع حبر (على الكريمي) · ember = برتقالي · bare = الموجة بس بلون النص */
  tone?: WLogoTone;
  state?: WLogoState;
  /** غيّروه عشان تعيدون حركة sync (للنجاحات الكبيرة بس) */
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
  const t = tile ? TONES[tone] : { bg: "none", fg: "currentColor" };
  const cls = ["wl", state === "loading" && "wl-loading", state === "sync" && "wl-sync", className].filter(Boolean).join(" ");
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true as const };

  return (
    <svg key={state === "sync" ? `s${run}` : "w"} width={s} height={s} viewBox={tile ? "0 0 200 200" : "30 60 140 86"} className={cls} {...a11y} style={tile ? undefined : { width: s * 1.35, height: s * 0.83 }}>
      {tone === "ember" && (
        <defs>
          <linearGradient id="wl-ember" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#FF6A00" />
            <stop offset="1" stopColor="#FF9A3C" />
          </linearGradient>
        </defs>
      )}
      {tile && <rect width="200" height="200" rx="46" fill={t.bg} />}
      {tile && state === "sync" && <rect className="wl-flash" width="200" height="200" rx="46" fill="none" stroke="#FFC777" strokeWidth="10" />}
      <g fill="none" stroke={t.fg} strokeWidth="18" strokeLinecap="round">
        <path className="wl-l" d={W_LEFT} />
        <path className="wl-r" d={W_RIGHT} />
      </g>
    </svg>
  );
}

/** نسخة نصية للأماكن اللي ما فيها React (الكانفس، الإيميل، الأيقونات) */
export function wLogoSvg({ size = 200, tone = "cream" }: { size?: number; tone?: "cream" | "ink" } = {}): string {
  const t = TONES[tone];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 200 200"><rect width="200" height="200" rx="46" fill="${t.bg}"/><path d="${W_LEFT} ${W_RIGHT.replace(/^M100 90 /, "")}" fill="none" stroke="${t.fg}" stroke-width="18" stroke-linecap="round"/></svg>`;
}

/** مؤشر التحميل الموحّد (بدل كل الدوّارات): الموجة بلون النص، تتنفس */
export function WSpin({ size = 20, className, label }: { size?: number; className?: string; label?: string }) {
  return <WLogo tone="bare" state="loading" size={size} className={className} label={label} />;
}
