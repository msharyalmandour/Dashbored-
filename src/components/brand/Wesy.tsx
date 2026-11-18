import { useEffect, useRef } from "react";
import "../../vendor/wesy-real.js";
import type { WesyInstance, WesyOutfit, WesyState } from "../../vendor/wesy-real";

/* ويسي — الشخصية من brand/wesy-real.js (منسوخة بدون تعديل في src/vendor).
   الإعداد الرسمي داخل التطبيق: شماغ برتقالي الهوية، بدون كونفيتي، ويهدأ بعد 8 ثواني بدون تفاعل ويصحى مع أي لمس أو كتابة.
   جهة الدكتورة دايمًا formal (ما يغمز ولا يضحك). تقليل الحركة: يطلع ثابت (أول إطار) بتلاشي 200ms. */

export const WESY_APP = { shemagh: "#FF6A00", confetti: false, settleAfter: 8000 } as const;

const reduced = () =>
  typeof window !== "undefined" &&
  (document.documentElement.dataset.reduceMotion === "true" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

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

export default function Wesy({ state = "idle", size = 220, head, formal, outfit = "normal", stage = 0, follow, shadow = !head, level, excited, label, className, shemagh, onReady }: WesyProps) {
  const host = useRef<HTMLDivElement>(null);
  const inst = useRef<WesyInstance | null>(null);
  // الدكتورة: ما فيه غمزة ولا ضحكة
  const safe: WesyState = formal && (state === "wink" || state === "laugh") ? "success" : state;

  // إنشاء من جديد لما يتغيّر شي ينبني مرة وحدة (القص، الزي، المرحلة، الرسمية)
  useEffect(() => {
    if (!host.current || typeof window === "undefined" || !window.WesyReal) return;
    const w = new window.WesyReal(host.current, {
      ...WESY_APP,
      // اليوم الوطني: الشماغ الأخضر حق المكتبة (الاستثناء الوحيد للأخضر)
      ...(outfit === "national" ? { shemagh: undefined } : {}),
      ...(shemagh ? { shemagh } : {}),
      state: safe,
      crop: head ? "head" : undefined,
      formal: !!formal,
      outfit,
      stage,
      follow: !!follow,
      shadow,
    });
    inst.current = w;
    onReady?.(w);
    let freeze = 0;
    if (reduced()) freeze = requestAnimationFrame(() => requestAnimationFrame(() => cancelAnimationFrame(w.raf)));
    // يصحى مع أي تفاعل بالصفحة (settleAfter يوقفه بعد 8 ثواني هدوء)
    const wake = () => !reduced() && w.wake();
    addEventListener("pointerdown", wake);
    addEventListener("keydown", wake);
    return () => {
      cancelAnimationFrame(freeze);
      removeEventListener("pointerdown", wake);
      removeEventListener("keydown", wake);
      w.destroy();
      inst.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [head, formal, outfit, stage, follow, shadow, shemagh]);

  useEffect(() => {
    const w = inst.current;
    if (!w) return;
    w.set(safe);
    if (reduced()) requestAnimationFrame(() => requestAnimationFrame(() => cancelAnimationFrame(w.raf)));
  }, [safe]);

  useEffect(() => {
    if (level !== undefined) inst.current?.level(level);
  }, [level]);
  useEffect(() => {
    if (excited !== undefined) inst.current?.excited(excited);
  }, [excited]);

  const h = head ? size : Math.round(size * (500 / 520));
  return (
    <div
      ref={host}
      className={["wesy", className].filter(Boolean).join(" ")}
      style={{ width: size, height: h }}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    />
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
