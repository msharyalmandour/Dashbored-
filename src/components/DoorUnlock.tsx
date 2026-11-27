import { useEffect, useRef, useState } from "react";
import { syncChime } from "../lib/sound";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { DOOR_UNLOCKED, type DoorId } from "../lib/doors";
import { tr } from "../lib/i18n";
import { WesyAvatar } from "./brand/Wesy";

/** كبسولة الإشعار (DoorToastD/M · CeoToastM): تنزل من فوق عند 1200ms (بعد لحظة انفتاح الباب بالقائمة)،
    راس ويسي بمربع كريمي، «ويسي فتح لكم: المقترح» (الكلمة الأخيرة ذهبية)، «افتحوه» كريمي و«شاركوها» زجاج،
    وشريط ذهبي يقصر خلال 6 ثواني — يوقف لما الماوس فوقها أو تنلمس — وبعدها تختفي بـ 260ms. */
const SHOW_AT = 1200;
const LIFE = 6000;

export default function DoorUnlock({ door, onDone, onGo, onShare }: { door: DoorId; onDone: () => void; onGo?: () => void; onShare?: () => void }) {
  const d = DOOR_UNLOCKED[door];
  const name = d.title.split(/[:：]\s*/).pop() ?? d.title;
  const [shown, setShown] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const left = useRef(LIFE);
  const started = useRef(0);

  useEffect(() => {
    const t = window.setTimeout(() => setShown(true), SHOW_AT);
    // نبضة اهتزاز وحدة مع نبضة الباب بالقائمة (1100ms)، بس لو المستخدم تفاعل مع الصفحة
    const v = window.setTimeout(() => navigator.userActivation?.hasBeenActive && navigator.vibrate?.(12), 1100);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(v);
    };
  }, [door]);
  useEffect(() => {
    if (shown) syncChime();
  }, [shown]);

  const close = () => {
    setLeaving(true);
    window.setTimeout(onDone, 260);
  };
  // المؤقت: 6 ثواني، يوقف مع المرور/اللمس ويكمل من مكانه
  useEffect(() => {
    if (!shown || paused || leaving) return;
    started.current = Date.now();
    const t = window.setTimeout(close, left.current);
    return () => {
      window.clearTimeout(t);
      left.current -= Date.now() - started.current;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, paused, leaving]);

  if (!shown) return null;
  return createPortal(
    <div
      className={leaving ? "door-pop out" : "door-pop"}
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="door-row">
        <WesyAvatar size={44} state="wink" />
        <span className="min-w-0 flex-1 leading-tight">
          <b className="block text-base text-ws-text">
            {tr("ويسي فتح لكم:")} <span className="text-ws-accent3">{name}</span>
          </b>
          <span className="block text-sm text-ws-text-accent">{d.sub}</span>
        </span>
        <button type="button" className="door-x" aria-label={tr("إغلاق")} onClick={close}>
          ×
        </button>
      </div>
      <div className="door-acts">
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
        {onShare && (
          <button
            type="button"
            className="door-share"
            onClick={() => {
              onShare();
              onDone();
            }}
          >
            {tr("شاركوها")}
          </button>
        )}
      </div>
      <span className={paused ? "door-timer paused" : "door-timer"} style={{ animationDuration: `${LIFE}ms` }} aria-hidden />
    </div>,
    document.body,
  );
}
