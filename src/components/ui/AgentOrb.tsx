import type { ReactNode } from "react";
import clsx from "clsx";
import Wesy, { WesyAvatar } from "../brand/Wesy";
import type { WesyState } from "../../vendor/wesy-real";

export type AgentOrbState = "idle" | "thinking" | "celebrate" | "typing" | "listening" | "success" | "error";

/** صورة ويسي = ويسي (الخطوة 4). نفس واجهة الكرة القديمة عشان كل الأماكن تتبدّل مرة وحدة:
    أقل من 90px = رأسه بالمربع الكريمي (الأفاتار)، وأكبر = ويسي كامل على مكتبه.
    الرمز (رقم مرحلة مثلًا) يطلع شارة ذهبية صغيرة بالزاوية. formal = جهة الدكتورة. */
const MAP: Record<AgentOrbState, WesyState> = {
  idle: "idle",
  thinking: "thinking",
  celebrate: "success",
  typing: "typing",
  listening: "listening",
  success: "success",
  error: "error",
};

export default function AgentOrb({
  size = 96,
  state = "idle",
  symbol,
  formal,
  className,
}: {
  size?: number;
  state?: AgentOrbState;
  symbol?: ReactNode;
  formal?: boolean;
  className?: string;
}) {
  const ws = MAP[state] ?? "idle";
  return (
    <span aria-hidden className={clsx("relative inline-flex flex-none items-center justify-center", className)} style={{ width: size, height: size }}>
      {size < 90 ? <WesyAvatar size={size} state={ws} formal={formal} /> : <Wesy size={size} state={ws} formal={formal} shadow={false} />}
      {symbol !== undefined && typeof symbol !== "object" && (
        <span
          className="absolute -bottom-1 -end-1 flex items-center justify-center rounded-full bg-[#FFC777] font-extrabold text-[#160904] ring-2 ring-[#080808]"
          style={{ minWidth: Math.max(22, size * 0.26), height: Math.max(22, size * 0.26), fontSize: Math.max(12, size * 0.14) }}
        >
          {symbol}
        </span>
      )}
    </span>
  );
}
