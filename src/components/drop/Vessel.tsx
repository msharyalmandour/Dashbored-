import { Component, lazy, Suspense, useEffect, useId, useState, type ReactNode } from "react";
import { tr } from "../../lib/i18n";

export type VesselState = "idle" | "hover" | "reading" | "done" | "dim";

const VesselCanvas = lazy(() => import("./VesselCanvas"));

/** لو قطعة الـ 3D ما وصلت (نت ضعيف أو نسخة جديدة من الموقع) يبقى البوستر — ما نطيّح الصفحة */
class SceneGuard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    // نكتفي بالبوستر
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** الـ 3D بس لو: الحركة مو مقلّلة (النظام أو «تقليل الحركة» بالتطبيق)، والجهاز يدعم WebGL2، والذاكرة أكثر من ٤ جيجا */
let webgl2: boolean | null = null;
// لو الـ 3D طلع بطيء مرة، نكمل الزيارة كلها بالبوستر
let slowDevice = (() => {
  try {
    return sessionStorage.getItem("wesync-vessel-slow") === "1";
  } catch {
    return false;
  }
})();
function can3D(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  if (document.documentElement.dataset.reduceMotion === "true") return false;
  if (slowDevice) return false;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (mem !== undefined && mem <= 4) return false;
  if (webgl2 === null) {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2");
      webgl2 = !!gl;
      (gl?.getExtension("WEBGL_lose_context") as { loseContext?: () => void } | null)?.loseContext?.();
    } catch {
      webgl2 = false;
    }
  }
  return webgl2;
}

// مشهد واحد بس بكل صفحة: أول وعاء يطلبه ياخذه، والباقي بوسترات
let owner: string | null = null;

/** وعاء «ارموا»: مشهد 3D (يتحمّل لحاله) أو بوستر. الحالات:
    idle هادي · hover/reading مفتوح ودافي · done/dim خافت (الأخطاء ما تحمّر أبدًا). */
export default function Vessel({ size, state = "idle", className = "", style, scene = false }: { size: number; state?: VesselState; className?: string; style?: React.CSSProperties; scene?: boolean }) {
  const id = useId();
  const [live, setLive] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!scene || !can3D() || owner) return;
    owner = id;
    setLive(true);
    const onMotion = () => {
      if (document.documentElement.dataset.reduceMotion === "true") setLive(false);
    };
    const mo = new MutationObserver(onMotion);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-reduce-motion"] });
    return () => {
      mo.disconnect();
      if (owner === id) owner = null;
      setLive(false);
      setReady(false);
    };
  }, [scene, id]);

  const open = state === "hover" || state === "reading";
  const dim = state === "dim" || state === "done";
  const posterFilter = dim ? "brightness(.7) saturate(.85)" : open ? `brightness(${state === "reading" ? 1.1 : 1.05})` : "brightness(.92)";
  return (
    <div className={`dr-vs ${className}`} role="img" aria-label={tr("وعاء ارموا")} style={{ width: size, height: size, ...style }}>
      <span className="dr-halo" style={{ opacity: open ? 1 : 0 }} />
      {/* البوستر: يتبدل بين الهادي والمفتوح بتلاشي .2s، ويختفي لما يجهز الـ 3D */}
      <div className="absolute inset-0" style={{ opacity: live && ready ? 0 : 1, filter: posterFilter, transition: "opacity .2s, filter .45s cubic-bezier(.2,.8,.2,1)" }}>
        <img src="/drop/vessel-idle.jpg" alt="" draggable={false} className="absolute inset-0" style={{ opacity: open ? 0 : 1, transition: "opacity .2s" }} />
        <img src="/drop/vessel-open.jpg" alt="" draggable={false} className="absolute inset-0" style={{ opacity: open ? 1 : 0, transition: "opacity .2s" }} />
        {state === "reading" && !live && <span className="dr-core dr-pulse3" />}
      </div>
      {live && (
        <SceneGuard>
          <Suspense fallback={null}>
            <VesselCanvas
              state={state}
              onReady={() => setReady(true)}
              onSlow={() => {
                slowDevice = true;
                try {
                  sessionStorage.setItem("wesync-vessel-slow", "1");
                } catch {
                  // بدون تخزين: يكفي لهالصفحة
                }
                setReady(false);
                setLive(false);
              }}
            />
          </Suspense>
        </SceneGuard>
      )}
    </div>
  );
}
