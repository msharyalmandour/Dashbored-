import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { tr } from "../lib/i18n";

/* مقبض القائمة الجانبية (الكمبيوتر): اسحبوه لجهة الحافة (يمين بالعربي) وتختفي القائمة والداش ياخذ الشاشة كاملة،
   واسحبوه للداخل أو اضغطوه وترجع. الاختيار ينحفظ بالجهاز. اختصار: Ctrl + \ . الجوال ما يتأثر (القائمة هناك درج). */

const KEY = "wesync.sideHidden";
const read = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

export function useSideHidden() {
  const [hidden, setHidden] = useState(read);
  useEffect(() => {
    document.documentElement.dataset.side = hidden ? "hidden" : "shown";
    try {
      localStorage.setItem(KEY, hidden ? "1" : "0");
    } catch {
      // التخزين ممنوع: يبقى لهالجلسة بس
    }
  }, [hidden]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
        e.preventDefault();
        setHidden((v) => !v);
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);
  return [hidden, setHidden] as const;
}

export default function SideHandle({ hidden, setHidden }: { hidden: boolean; setHidden: (v: boolean) => void }) {
  const start = useRef<{ x: number; moved: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  // اتجاه «الحافة»: بالعربي القائمة يمين، فالسحب لليمين = إخفاء
  const edge = () => (document.documentElement.dir === "rtl" ? 1 : -1);
  const side = () => document.querySelector<HTMLElement>(".lx-side");

  const down = (e: React.PointerEvent<HTMLButtonElement>) => {
    start.current = { x: e.clientX, moved: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!start.current) return;
    const toEdge = (e.clientX - start.current.x) * edge();
    start.current.moved = toEdge;
    if (Math.abs(toEdge) > 4) setDragging(true);
    // القائمة تتبع الإصبع وهي ظاهرة (بس لجهة الحافة)
    const el = side();
    if (el && !hidden && toEdge > 0) {
      el.style.transition = "none";
      el.style.transform = `translateX(${(toEdge * edge()).toFixed(0)}px)`;
      el.style.opacity = String(Math.max(0.2, 1 - toEdge / 300));
    }
  };
  const up = () => {
    const s = start.current;
    start.current = null;
    const el = side();
    if (el) {
      el.style.transition = "";
      el.style.transform = "";
      el.style.opacity = "";
    }
    setDragging(false);
    if (!s) return;
    if (Math.abs(s.moved) < 5) return setHidden(!hidden); // ضغطة
    if (!hidden && s.moved > 60) setHidden(true);
    else if (hidden && s.moved < -30) setHidden(false);
  };

  return (
    <button
      type="button"
      className={`side-handle${hidden ? " is-hidden" : ""}${dragging ? " is-drag" : ""}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      aria-expanded={!hidden}
      aria-label={hidden ? tr("أظهروا القائمة") : tr("أخفوا القائمة وكبّروا الداش")}
      title={hidden ? tr("أظهروا القائمة (Ctrl + \\)") : tr("اسحبوه لليمين أو اضغطوه (Ctrl + \\)")}
    >
      {hidden ? <ChevronLeft size={16} aria-hidden /> : <span className="side-handle-bar" aria-hidden />}
    </button>
  );
}
