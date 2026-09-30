import { useEffect, useRef, useState } from "react";

const BASE = `${(import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "https://uwdejlkvhsiqolmgihjq.supabase.co"}/storage/v1/object/public/site-media`;
export const HERO_POSTER = `${BASE}/login-hero-b.png`;
export const HERO_VIDEO = `${BASE}/login-hero.mp4`;

/** توفير بيانات أو "تقليل الحركة" = نكتفي بالصورة الثابتة بدون تحميل الفيديو. */
function shouldSkipVideo(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return true;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return Boolean(c?.saveData || c?.effectiveType === "slow-2g" || c?.effectiveType === "2g");
}

const FADE_SEC = 0.9;

/** خلفية سينمائية: صورة ثابتة فورًا، والفيديو يطلع فوقها لما يجهز.
    فيديوين متراكبين يتبادلون بتلاشي قرب نهاية المقطع عشان ما يبان قفز عند التكرار. */
export default function HeroVideo() {
  const skip = useRef(shouldSkipVideo()).current;
  const refs = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)];
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (skip || failed) return;
    const a = refs[active].current;
    const b = refs[1 - active].current;
    if (!a || !b) return;
    a.play().catch(() => setFailed(true));
    let switched = false;
    const onTime = () => {
      if (switched || !a.duration || a.duration - a.currentTime > FADE_SEC) return;
      switched = true;
      b.currentTime = 0;
      b.play().catch(() => {});
      setActive(1 - active);
    };
    a.addEventListener("timeupdate", onTime);
    return () => a.removeEventListener("timeupdate", onTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, skip, failed]);

  const vidClass = (i: number) =>
    `absolute inset-0 h-full w-full object-cover transition-opacity ease-linear ${
      ready && active === i ? "opacity-100" : "opacity-0"
    }`;

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#03060a]" aria-hidden>
      <img
        src={HERO_POSTER}
        alt=""
        className="absolute inset-0 h-full w-full animate-[cine-zoom_14s_ease-out_forwards] object-cover motion-reduce:animate-none"
        fetchPriority="high"
      />
      {!skip && !failed &&
        [0, 1].map((i) => (
          <video
            key={i}
            ref={refs[i]}
            src={HERO_VIDEO}
            poster={HERO_POSTER}
            muted
            playsInline
            preload="auto"
            className={vidClass(i)}
            style={{ transitionDuration: `${FADE_SEC}s` }}
            onCanPlay={() => i === 0 && setReady(true)}
            onError={() => setFailed(true)}
          />
        ))}
    </div>
  );
}
