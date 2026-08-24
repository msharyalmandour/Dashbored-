import { useEffect, useRef, useState } from "react";

/** يحسب إزاحة العنصر حسب موقع الماوس داخل حاوية — يستخدم لإحساس عمق خفيف
    (parallax) بين طبقات مختلفة. يتوقف تلقائيًا لو المستخدم مفعّل تقليل الحركة. */
export function useMouseParallax(strength = 12) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      setOffset({ x: x * strength, y: y * strength });
    };
    const onLeave = () => setOffset({ x: 0, y: 0 });

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [strength]);

  return { ref, offset };
}
