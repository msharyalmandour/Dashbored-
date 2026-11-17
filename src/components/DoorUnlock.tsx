import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { DOOR_UNLOCKED, type DoorId } from "../lib/doors";
import { tr } from "../lib/i18n";

/** لحظة انفتاح باب: كبسولة زجاج فوق الشاشة — قفل ذهبي ينفك، خط ذهبي يمشي على حافتها، وسطر واحد.
    تطلع مرة وحدة لكل باب، وتختفي بعد 6 ثواني. (المرجع: docs/DESIGN_BRIEF_UNLOCK.md) */
export default function DoorUnlock({ door, onDone, onGo }: { door: DoorId; onDone: () => void; onGo?: () => void }) {
  const d = DOOR_UNLOCKED[door];
  useEffect(() => {
    // نبضة خفيفة بالجوال، بس لو المستخدم تفاعل مع الصفحة (وإلا المتصفح يمنعها ويطبع تحذير)
    if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(10);
    const t = window.setTimeout(onDone, 6000);
    return () => window.clearTimeout(t);
  }, [door, onDone]);

  return createPortal(
    <div className="door-pop" role="status" aria-live="polite">
      <span className="door-trace" aria-hidden />
      <span className="door-lock" aria-hidden>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="10" rx="2.5" />
          <path className="door-shackle" d="M8 11V7.5a4 4 0 0 1 8 0" />
        </svg>
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <b className="block text-[15px] text-[#F2EBE3]">{d.title}</b>
        <span className="block text-[13px] text-[#E9D3B8]">{d.sub}</span>
      </span>
      <Link
        to={d.to}
        className="door-go"
        onClick={() => {
          onDone();
          onGo?.();
        }}
      >
        {tr("افتحوه")}
      </Link>
      <button type="button" className="door-x" aria-label={tr("إغلاق")} onClick={onDone}>
        ×
      </button>
    </div>,
    document.body,
  );
}
