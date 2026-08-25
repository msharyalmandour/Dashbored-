import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

/** يكشف العنصر بحركة ناعمة (تلاشي + انزلاق + ميلان ثلاثي أبعاد خفيف) أول ما يدخل
    الشاشة أثناء التمرير */
export default function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
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
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const shown = visible || reducedMotion;

  return (
    <div style={{ perspective: 900 }}>
      <div
        ref={ref}
        style={{
          transitionDelay: shown ? `${delay}ms` : "0ms",
          transformStyle: "preserve-3d",
          transform: shown ? "translateY(0) rotateX(0deg)" : "translateY(2rem) rotateX(10deg)",
        }}
        className={clsx(
          "transition-all duration-[400ms] ease-out",
          shown ? "opacity-100" : "opacity-0",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
