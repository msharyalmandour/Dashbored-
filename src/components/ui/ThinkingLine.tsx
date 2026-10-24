import { useEffect, useState } from "react";
import AgentOrb from "./AgentOrb";

const LINES = [
  "يقرأ دراساتكم… أسرع منكم بشوي",
  "يدوّر على الفجوة البحثية… لا تخافون، ما ضاعت",
  "يرتّب أفكاركم أحسن من ملف نهائي_نهائي_٣",
  "يكتب بهدوء… عكس آخر ليلة قبل التسليم",
];

/** «الوكيل يفكّر»: كرة بحالة thinking + جملة خفيفة تتبدل كل ٣ ثواني */
export default function ThinkingLine({ className }: { className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % LINES.length), 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className={className ?? "inline-flex items-center gap-3"} role="status" aria-live="polite">
      <AgentOrb size={26} state="thinking" />
      <span key={i} className="st-fade text-sm text-[#B8ADA2]">
        {LINES[i]}
      </span>
    </span>
  );
}
