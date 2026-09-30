import { useEffect, useRef, useState } from "react";

const BASE = `${(import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "https://uwdejlkvhsiqolmgihjq.supabase.co"}/storage/v1/object/public/site-media`;
export const HERO_POSTER = `${BASE}/login-hero-b.png`;
export const HERO_VIDEO = `${BASE}/login-hero.mp4`;
export const LANDING_POSTER = `${BASE}/landing-hero.png`;
export const LANDING_VIDEO = `${BASE}/landing-hero.mp4`;
export const WELCOME_AUDIO = `${BASE}/welcome-desmond.mp3`;

/** توفير بيانات أو "تقليل الحركة" = نكتفي بالصورة الثابتة بدون تحميل الفيديو. */
function shouldSkipVideo(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return true;
  // الجوال: صورة ثابتة فقط (يوفّر بطارية وبيانات ~٣ ميجا)
  if (window.innerWidth < 768) return true;
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return Boolean(c?.saveData || c?.effectiveType === "slow-2g" || c?.effectiveType === "2g");
}

const FADE_SEC = 0.9;

/** خلفية سينمائية: صورة ثابتة فورًا، والفيديو يطلع فوقها لما يجهز.
    فيديوين متراكبين يتبادلون بتلاشي قرب نهاية المقطع عشان ما يبان قفز عند التكرار. */
export default function HeroVideo({
  poster = HERO_POSTER,
  video = HERO_VIDEO,
  objectPosition = "center",
}: {
  poster?: string;
  video?: string;
  objectPosition?: string;
} = {}) {
  const skip = useRef(shouldSkipVideo()).current;
  const refs = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)];
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // نوقف الفيديو لما الخلفية تطلع من الشاشة أو التبويب ينخفي — نفس الصورة بس بدون استهلاك
  useEffect(() => {
    if (skip || failed) return;
    const el = box.current;
    if (!el) return;
    let visible = true;
    const apply = () => {
      const v = refs[active].current;
      if (!v) return;
      if (visible && !document.hidden) v.play().catch(() => {});
      else v.pause();
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      apply();
    }, { threshold: 0.05 });
    io.observe(el);
    document.addEventListener("visibilitychange", apply);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", apply);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, skip, failed]);

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
    <div ref={box} className="absolute inset-0 overflow-hidden bg-[#03060a]" aria-hidden>
      <img
        src={poster}
        alt=""
        className="absolute inset-0 h-full w-full animate-[cine-zoom_14s_ease-out_forwards] object-cover motion-reduce:animate-none"
        style={{ objectPosition }}
        fetchPriority="high"
      />
      {!skip && !failed &&
        [0, 1].map((i) => (
          <video
            key={i}
            ref={refs[i]}
            src={video}
            poster={poster}
            muted
            playsInline
            preload={i === 0 ? "auto" : "metadata"}
            className={vidClass(i)}
            style={{ transitionDuration: `${FADE_SEC}s`, objectPosition }}
            onCanPlay={() => i === 0 && setReady(true)}
            onError={() => setFailed(true)}
          />
        ))}
    </div>
  );
}
