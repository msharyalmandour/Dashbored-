import { useEffect, useRef, useState, type ReactNode } from "react";

/** يكشف العنصر بدوران ثلاثي الأبعاد يستقر بمكانه أول ما يدخل الشاشة — للصور
    والبطاقات البارزة (أقوى من Reveal العادي، يعطي إحساس "يجي من الفضاء لمكانه") */
export default function RevealRotate({
  children,
  className,
  direction = "left",
}: {
  children: ReactNode;
  className?: string;
  direction?: "left" | "right";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hiddenRotateY = direction === "left" ? -38 : 38;

  return (
    <div className={className} style={{ perspective: 1400 }}>
      <div
        ref={ref}
        className="transition-[transform,opacity] duration-[950ms] ease-out"
        style={{
          transformStyle: "preserve-3d",
          opacity: visible || reducedMotion ? 1 : 0,
          transform:
            visible || reducedMotion
              ? "rotateY(0deg) translateX(0) scale(1)"
              : `rotateY(${hiddenRotateY}deg) translateX(${direction === "left" ? -30 : 30}px) scale(0.88)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
