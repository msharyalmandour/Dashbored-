import { useEffect, useRef } from "react";

/** إحساس عمق خفيف (parallax) حسب موقع الماوس داخل حاوية. يتوقف تلقائيًا لو المستخدم مفعّل تقليل الحركة.
    ما يستخدم حالة React: يكتب متغيّرين CSS (‎--px و--py‎) مباشرة على العنصر داخل requestAnimationFrame،
    فما تنعاد رسم الصفحة كلها مع كل حركة ماوس (كان هذا سبب التعليق بالرئيسية).
    الاستخدام: style={{ transform: "translate3d(calc(var(--px, 0) * 1px), calc(var(--py, 0) * 1px), 0)" }} */
export function useMouseParallax(strength = 12) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    let next = { x: 0, y: 0 };
    const apply = () => {
      frame = 0;
      el.style.setProperty("--px", next.x.toFixed(2));
      el.style.setProperty("--py", next.y.toFixed(2));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      next = { x: x * strength, y: y * strength };
      schedule();
    };
    const onLeave = () => {
      next = { x: 0, y: 0 };
      schedule();
    };

    el.addEventListener("mousemove", onMove, { passive: true });
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [strength]);

  return { ref };
}
