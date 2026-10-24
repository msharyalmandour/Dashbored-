import { useEffect, useState } from "react";
import { Infinity as InfinityIcon } from "lucide-react";
import AgentOrb from "./AgentOrb";

const LINES = ["نرتّب مساحة فريقكم…", "نجيب مهامكم ومواعيدكم…", "نجهّز آخر المستجدات…", "لحظات ونكون جاهزين"];

/** شاشة التحميل الأول: الكرة فيها ∞ وحلقتين تتوسعان، وجملة تتبدل كل ثانيتين */
export default function AppSplash() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, LINES.length - 1)), 2000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-10 bg-[#080808] text-[#F4F0EC]" role="status" aria-live="polite">
      <div className="relative flex h-32 w-32 items-center justify-center">
        <span aria-hidden className="app-splash__ring h-32 w-32" />
        <span aria-hidden className="app-splash__ring h-32 w-32" style={{ ["--d" as string]: "1.4s" }} />
        <AgentOrb size={96} state="thinking" symbol={<InfinityIcon size={34} strokeWidth={2.6} />} />
      </div>
      <p key={i} className="app-splash__line font-kufi text-base font-bold text-[#B8ADA2]">
        {LINES[i]}
      </p>
    </div>
  );
}
