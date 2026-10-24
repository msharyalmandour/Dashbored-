import type { ReactNode } from "react";
import clsx from "clsx";

export type AgentOrbState = "idle" | "thinking" | "celebrate";

/** كرة الوكيل (الهوية): idle تتنفّس، thinking تتشكّل وتلف ببطء بهالة، celebrate نبضة وحدة.
    الرمز (∞ أو رقم مرحلة) فوق الكرة ولا يلف معها. الحركة تتوقف مع تقليل الحركة. */
export default function AgentOrb({
  size = 96,
  state = "idle",
  symbol,
  className,
}: {
  size?: number;
  state?: AgentOrbState;
  symbol?: ReactNode;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      data-state={state}
      className={clsx("agent-orb", className)}
      style={{ width: size, height: size, ["--orb" as string]: `${size}px` }}
    >
      <span className="agent-orb__halo" />
      <span className="agent-orb__body" />
      {symbol !== undefined && (
        <span className="relative font-kufi font-extrabold text-[#2a0f02]/80" style={{ fontSize: size * 0.34 }}>
          {symbol}
        </span>
      )}
    </span>
  );
}
