import { useEffect, useState } from "react";

/** رد الوكيل يظهر كلمة كلمة، كل كلمة تتضح من blur خفيف، ومؤشر كتابة يرمش. الردود القديمة (والمحادثة المخزّنة) تظهر كاملة فورًا. */
export default function StreamedText({ text, at }: { text: string; at?: number }) {
  const [live] = useState(() => !!at && Date.now() - at < 2000 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const words = text.split(/(\s+)/);
  const [shown, setShown] = useState(live ? 0 : words.length);

  useEffect(() => {
    if (!live || shown >= words.length) return;
    const t = setTimeout(() => setShown((n) => Math.min(words.length, n + 2)), 38);
    return () => clearTimeout(t);
  }, [live, shown, words.length]);

  if (!live) return <>{text}</>;
  return (
    <>
      {words.slice(0, shown).map((w, i) => (
        <span key={i} className="st-word">
          {w}
        </span>
      ))}
      {shown < words.length && <span aria-hidden className="st-caret" />}
    </>
  );
}
