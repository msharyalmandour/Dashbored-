import { useEffect, useState } from "react";
import AgentOrb from "./AgentOrb";
import { Typing } from "../v3/Motion";
import { tr } from "../../lib/i18n";

const LINES = [
  tr("يقرأ دراساتكم… أسرع منكم بشوي"),
  tr("يدوّر على الفجوة البحثية… لا تخافون، ما ضاعت"),
  tr("يرتّب أفكاركم أحسن من ملف نهائي_نهائي_٣"),
  tr("يكتب بهدوء… عكس آخر ليلة قبل التسليم"),
];

/** «الوكيل يفكّر»: كرة بحالة thinking + جملة خفيفة تتبدل كل ٣ ثواني */
export default function ThinkingLine({ className, steps }: { className?: string; steps?: string[] }) {
  const lines = steps && steps.length > 0 ? steps : LINES;
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % lines.length), 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className={className ?? "inline-flex items-center gap-3"} role="status" aria-live="polite">
      <AgentOrb size={26} state="thinking" />
      <span key={i} className="st-fade text-sm text-[#B8ADA2]">
        {lines[i % lines.length]}
        <Typing />
      </span>
    </span>
  );
}
