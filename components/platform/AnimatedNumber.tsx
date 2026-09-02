"use client";

import { useEffect, useState } from "react";

export default function AnimatedNumber({
  value,
  decimals = 0,
  duration = 1000,
}: {
  value: number;
  decimals?: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const scale = 10 ** decimals;

    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(value * eased * scale) / scale;
      setDisplay(current.toFixed(decimals));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, decimals, duration]);

  return <>{display}</>;
}
