import { useEffect, useState } from "react";

/** عدّاد يطلع من صفر للرقم مرة وحدة. لو «قلّل الحركة» مفعّل يطلع الرقم على طول. */
export function useCountUp(to: number, ms = 1200, delay = 250): number {
  const [n, setN] = useState(() => (reduced() ? to : 0));
  useEffect(() => {
    if (reduced() || !Number.isFinite(to)) {
      setN(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now() + delay;
    const step = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - t0) / ms));
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, ms, delay]);
  return n;
}

function reduced(): boolean {
  if (typeof window === "undefined") return true;
  return (
    document.documentElement.hasAttribute("data-reduce-motion") ||
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}
