import { useRef, useState } from "react";
import type { WesyInstance, WesyOutfit, WesyState } from "../../vendor/wesy-real";
import wesyFace from "../../assets/wesy/wesy-face.webp";
import wesyBody from "../../assets/wesy/wesy-wave-body.webp";
import wesyHand from "../../assets/wesy/wesy-wave-hand.webp";

/* ويسي — الرسمة الكرتونية البسيطة (minimalist cartoon) بدل الشخصية القديمة من brand/wesy-real.js.
   وجهه (للأفاتار) يهزّ راسه، وجسمه واقف ويده تسلّم (اليد طبقة منفصلة تتحرك).
   الحركة تصير مرة وحدة: أول ما يظهر، ولما تتغيّر حالته، ولما تمرّون عليه أو تضغطون. ما فيه حركة لا نهائية.
   خلّينا نفس الـprops عشان كل الأماكن اللي تستخدمه تشتغل بدون تعديل؛ الحالة والزي يروحون data-attributes بس. */

export const WESY_APP = { shemagh: "#FF6A00", confetti: false, settleAfter: 8000 } as const;

export interface WesyProps {
  state?: WesyState;
  size?: number;
  /** رأسه بس (للأفاتار) */
  head?: boolean;
  formal?: boolean;
  outfit?: WesyOutfit;
  /** 0 · 2 (كتب) · 3 (كتب + كأس ذهبي) حسب تقدّم الفريق */
  stage?: number;
  /** يتابع المؤشر (مكتب الرئيسية) */
  follow?: boolean;
  shadow?: boolean;
  /** مستوى المايك 0..1 بحالة listening */
  level?: number;
  /** الماوس فوق زر الإرسال */
  excited?: boolean;
  label?: string;
  className?: string;
  /** للتسويق بس: الشماغ الأحمر */
  shemagh?: string;
  onReady?: (w: WesyInstance) => void;
}

/** يشغّل الحركة مرة: أول ما يظهر + كل ما تغيّر key، ويرجع يشغلها بالمرور/الضغط */
function usePlayOnce(key: unknown) {
  const [on, setOn] = useState(true);
  const [seen, setSeen] = useState(key);
  if (seen !== key) {
    setSeen(key);
    setOn(true);
  }
  return {
    on,
    replay: () => setOn(true),
    done: () => setOn(false),
  };
}

/** ويسي واقف يسلّم: جسم + يد تتحرك من الرسغ */
export function WesyFigure({ className, label, playKey }: { className?: string; label?: string; playKey?: unknown }) {
  const p = usePlayOnce(playKey);
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className={["wesy-fig", p.on ? "is-waving" : "", className].filter(Boolean).join(" ")}
      onPointerEnter={p.replay}
      onClick={p.replay}
      onAnimationEnd={(e) => e.target === ref.current?.lastElementChild && p.done()}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <img className="wesy-fig-body" src={wesyBody} alt="" draggable={false} />
      <img className="wesy-fig-hand" src={wesyHand} alt="" draggable={false} />
    </div>
  );
}

export default function Wesy(props: WesyProps) {
  const { state = "idle", size = 220, head, outfit = "normal", label, className } = props;
  const p = usePlayOnce(state);
  const h = head ? size : Math.round(size * (500 / 520));
  return (
    <div
      className={["wesy", head ? "wesy-head" : "wesy-body", className].filter(Boolean).join(" ")}
      style={{ width: size, height: h, position: "relative", overflow: "hidden" }}
      data-state={state}
      data-outfit={outfit}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {head ? (
        <img
          className={["wesy-face", p.on ? "is-nodding" : ""].filter(Boolean).join(" ")}
          src={wesyFace}
          alt=""
          draggable={false}
          onAnimationEnd={p.done}
          onPointerEnter={p.replay}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <WesyFigure className="wesy-fig-fit" playKey={state} />
      )}
    </div>
  );
}

/** أفاتار ويسي: رأسه داخل مربع كريمي مدوّر بحلقة ذهبية رفيعة */
export function WesyAvatar({ size = 40, state = "idle", formal, className }: { size?: number; state?: WesyState; formal?: boolean; className?: string }) {
  return (
    <span className={["wesy-av", className].filter(Boolean).join(" ")} style={{ width: size, height: size }}>
      <Wesy head size={size} state={state} formal={formal} />
    </span>
  );
}
