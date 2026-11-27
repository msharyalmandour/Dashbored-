import type { WesyInstance, WesyOutfit, WesyState } from "../../vendor/wesy-real";
import wesyFace from "../../assets/wesy/wesy-face.webp";
import wesyWave from "../../assets/wesy/wesy-wave.webp";

/* ويسي — الرسمة الكرتونية البسيطة (minimalist cartoon) بدل الشخصية القديمة من brand/wesy-real.js.
   صورتين ثابتة: وجهه (للأفاتار) وهو واقف يسلّم (للمشاهد الكبيرة).
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

export default function Wesy(props: WesyProps) {
  const { state = "idle", size = 220, head, outfit = "normal", label, className } = props;
  const h = head ? size : Math.round(size * (500 / 520));
  return (
    <div
      className={["wesy", head ? "wesy-head" : "wesy-body", className].filter(Boolean).join(" ")}
      style={{ width: size, height: h, position: "relative", overflow: "hidden" }}
      data-state={state}
      data-outfit={outfit}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <img
        src={head ? wesyFace : wesyWave}
        alt=""
        draggable={false}
        style={
          head
            ? { width: "100%", height: "100%", objectFit: "cover", display: "block" }
            : { position: "absolute", left: "50%", top: 0, height: "100%", width: "auto", transform: "translateX(-50%)" }
        }
      />
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
