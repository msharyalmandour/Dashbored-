import { tr } from "../../lib/i18n";

export type VesselState = "idle" | "hover" | "reading" | "done" | "dim";

/** وعاء «ارموا»: صورة (poster) الآن — المرحلة ٣ تبدله بالـ 3D بنفس الحالات.
    idle هادي · hover/reading مفتوح ودافي · done/dim خافت (الأخطاء ما تحمّر أبدًا). */
export default function Vessel({ size, state = "idle", className = "", style }: { size: number; state?: VesselState; className?: string; style?: React.CSSProperties }) {
  const open = state === "hover" || state === "reading";
  const filter = state === "dim" || state === "done" ? "brightness(.7) saturate(.85)" : open ? `brightness(${state === "reading" ? 1.1 : 1.05})` : "brightness(.92)";
  return (
    <div className={`dr-vs ${state === "hover" ? "dr-warm" : ""} ${className}`} role="img" aria-label={tr("وعاء ارموا")} style={{ width: size, height: size, filter, ...style }}>
      {open && <span className="dr-halo" />}
      <img src={open ? "/drop/vessel-open.jpg" : "/drop/vessel-idle.jpg"} alt="" draggable={false} />
      {state === "reading" && <span className="dr-core dr-pulse3" />}
    </div>
  );
}
