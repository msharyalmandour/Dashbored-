import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { topProgress, useTopProgressActive } from "../../lib/topProgress";

/** شريط برتقالي ٣px أعلى الشاشة: يشتغل مع أي تحميل مسجّل (topProgress.start/done) ومع كل تنقل بين الصفحات */
export default function TopProgress() {
  const active = useTopProgressActive();
  const [phase, setPhase] = useState<"idle" | "run" | "finish">("idle");
  const { key } = useLocation();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    topProgress.pulse();
  }, [key]);

  useEffect(() => {
    if (active) {
      setPhase("run");
      return;
    }
    setPhase((p) => (p === "run" ? "finish" : p));
    const t = setTimeout(() => setPhase((p) => (p === "finish" ? "idle" : p)), 600);
    return () => clearTimeout(t);
  }, [active]);

  if (phase === "idle") return null;
  return (
    <div className="top-progress" data-phase={phase} role="progressbar" aria-label="جاري التحميل" aria-busy={phase === "run"}>
      <div className="top-progress__bar" />
    </div>
  );
}
