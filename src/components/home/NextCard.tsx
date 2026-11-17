import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useDoors } from "../../hooks/useDoors";
import { journeyStep } from "../../lib/doors";
import { pickStep } from "../../lib/nextCard";
import type { NextStep } from "../../lib/nextSteps";
import { isEn, tr } from "../../lib/i18n";

/** «الجاي لكم»: أول شي بالرئيسية — خطوة وحدة، سطر واحد، وزر برتقالي واحد يودّي للمكان بالضبط.
    لما الخطوة تخلص، نفس الكرت يقول «تم ✓» ثانية وحدة ويطلع اللي بعدها مكانه (ما يرجع الطالب يدوّر). */
export default function NextCard({ urgent, fallback, style }: { urgent?: NextStep; fallback?: NextStep; style?: CSSProperties }) {
  const doors = useDoors();
  const step = pickStep(urgent, doors.signals, fallback);
  const n = doors.signals ? journeyStep(doors.signals, doors.open) : null;
  const prev = useRef<{ key: string; done: string } | null>(null);
  const [celebrate, setCelebrate] = useState<string | null>(null);

  const key = step?.key ?? "";
  const doneLabel = step?.done ?? "";
  useEffect(() => {
    if (!key) return;
    const p = prev.current;
    prev.current = { key, done: doneLabel };
    if (p && p.key !== key) {
      setCelebrate(p.done);
      const t = window.setTimeout(() => setCelebrate(null), 1300);
      return () => window.clearTimeout(t);
    }
  }, [key, doneLabel]);

  if (!step) return null;
  return (
    <section className="nx-card" style={style} aria-labelledby="nx-title">
      <div className="nx-kick">
        <span>{tr("الجاي لكم")}</span>
        {n !== null && (
          <span className="nx-of">
            {tr("{0} من {1}", n, 10)}
          </span>
        )}
      </div>
      <div key={celebrate ? "done" : step.key} className="nx-body">
        {celebrate ? (
          <h2 id="nx-title" className="nx-title nx-done">
            {celebrate}
          </h2>
        ) : (
          <>
            <h2 id="nx-title" className="nx-title" dir="auto">
              {step.title}
            </h2>
            <p className="nx-why">{step.why}</p>
            <Link to={step.to} className="nx-go">
              {step.cta} <span aria-hidden>{isEn ? "→" : "←"}</span>
            </Link>
          </>
        )}
      </div>
      {n !== null && (
        <div className="nx-dots" role="img" aria-label={tr("الرحلة: {0} من {1}", n, 10)}>
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} className={i < n - 1 ? "on" : i === n - 1 ? "now" : ""} />
          ))}
        </div>
      )}
    </section>
  );
}
