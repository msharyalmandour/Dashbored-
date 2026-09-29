import { useEffect, useRef } from "react";

/** توهج خفيف يتبع الماوس على الخلفيات الداكنة — بدون إعادة رندر (تعديل مباشر على الـ DOM) */
export default function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      el.style.background = `radial-gradient(600px circle at ${e.clientX}px ${e.clientY}px, rgba(251,191,36,0.08), transparent 40%)`;
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return <div ref={ref} className="pointer-events-none fixed inset-0 z-0 transition-[background]" />;
}
