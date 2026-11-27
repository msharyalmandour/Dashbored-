import { useEffect } from "react";

/** يخفي زر الواتساب العائم لما يغطّي عنصر معلّم data-wa-avoid (أزرار، نماذج…) */
export function useWhatsAppAvoid(ref: React.RefObject<HTMLAnchorElement | null>) {
  useEffect(() => {
    let raf = 0;
    const check = () => {
      const fab = ref.current;
      if (!fab) return;
      const f = fab.getBoundingClientRect();
      const hit = Array.from(document.querySelectorAll<HTMLElement>("[data-wa-avoid]")).some((el) => {
        const r = el.getBoundingClientRect();
        return r.bottom > f.top - 12 && r.top < f.bottom + 12 && r.right > f.left - 12 && r.left < f.right + 12;
      });
      fab.classList.toggle("lv-wa-hide", hit);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [ref]);
}
