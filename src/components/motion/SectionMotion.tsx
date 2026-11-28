import { useEffect, type RefObject } from "react";

/** حركة الأقسام: الكروت تطلع وحدة ورا الثانية أول ما تفتح القسم، واللي تحت تطلع لما توصلها بالتمرير.
    ما نلمس محتوى React — بس نضيف data-mo وكلاس mo-go، والحركة كلها CSS (motion.css). */
const SEL = [
  ".lx-card",
  ".hg-card",
  ".lh-card",
  ".dr-card",
  ".ws-card",
  "[class*='rounded-2xl'][class*='border']",
  "[class*='rounded-3xl'][class*='border']",
].join(",");
const SKIP = ".lxp-scene,.lxs,[role='dialog'],[data-no-motion]";
const MAX = 60;

function reduced() {
  return (
    document.documentElement.hasAttribute("data-reduce-motion") ||
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export function useSectionMotion(root: RefObject<HTMLElement | null>, key: string) {
  useEffect(() => {
    const el = root.current;
    if (!el || reduced() || !("IntersectionObserver" in window)) return;
    let order = 0;
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          const t = en.target as HTMLElement;
          t.classList.add("mo-go");
          io.unobserve(t);
        }
      },
      { rootMargin: "0px 0px -6% 0px" },
    );
    const scan = () => {
      if (order >= MAX) return;
      const found = el.querySelectorAll<HTMLElement>(SEL);
      const vh = window.innerHeight;
      for (const c of found) {
        if (order >= MAX) break;
        if (c.dataset.mo || c.closest(SKIP)) continue;
        // الكرت الخارجي بس — مو الكروت اللي داخله
        const outer = c.parentElement?.closest(SEL);
        if (outer && el.contains(outer)) continue;
        const r = c.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        c.dataset.mo = "1";
        if (r.top < vh) {
          c.style.setProperty("--mo-d", `${Math.min(order, 10) * 60}ms`);
          requestAnimationFrame(() => c.classList.add("mo-go"));
        } else {
          io.observe(c);
        }
        order++;
      }
    };
    scan();
    // البيانات توصل بعد شوي: نراقب أول ٤ ثواني ونحرّك اللي يطلع جديد
    let raf = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(scan);
    });
    mo.observe(el, { childList: true, subtree: true });
    const stop = setTimeout(() => mo.disconnect(), 4000);
    // أمان: أي كرت ظل مخفي بعد ٦ ثواني يطلع
    const safety = setTimeout(() => el.querySelectorAll<HTMLElement>("[data-mo]:not(.mo-go)").forEach((c) => {
      if (c.getBoundingClientRect().top < window.innerHeight) c.classList.add("mo-go", "mo-safe");
    }), 6000);
    return () => {
      io.disconnect();
      mo.disconnect();
      clearTimeout(stop);
      clearTimeout(safety);
      cancelAnimationFrame(raf);
    };
  }, [root, key]);
}
