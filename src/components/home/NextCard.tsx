import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Eye, Share2 } from "lucide-react";
import { journeyStep } from "../../lib/doors";
import { pickStep } from "../../lib/nextCard";
import type { NextStep } from "../../lib/nextSteps";
import type { NextState } from "../../lib/nextState";
import type { DoorSignals, DoorId } from "../../lib/doors";
import { isEn, tr } from "../../lib/i18n";

/** «الجاي لكم» (NextCardsD/M · CeoStates): خطوة وحدة، سطر واحد، وزر برتقالي واحد يودّي للمكان بالضبط.
    الحالات: يوم أول (حقل الموضوع) · منتصف · ينتظرون الدكتورة (كريمي بدون برتقالي) · خلص كل شي · تحميل (لمعان).
    لما الخطوة تخلص: «تم ✓» ثانية، وبعدها cross-fade 400ms والكرت الجديد يرتفع 6px. */
export default function NextCard({
  state,
  signals,
  open,
  urgent,
  fallback,
  docName,
  onTopic,
  onAchieve,
  style,
}: {
  state: NextState;
  signals: DoorSignals | null;
  open: Set<DoorId>;
  urgent?: NextStep;
  fallback?: NextStep;
  docName: string;
  onTopic: (t: string) => Promise<boolean>;
  onAchieve: () => void;
  style?: CSSProperties;
}) {
  const step = pickStep(urgent, signals, fallback);
  const n = state === "done" ? 10 : state === "first" ? 1 : signals ? journeyStep(signals, open) : null;
  const prev = useRef<{ key: string; done: string } | null>(null);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);

  const key = step?.key ?? "";
  const doneLabel = step?.done ?? "";
  useEffect(() => {
    if (!key) return;
    const p = prev.current;
    prev.current = { key, done: doneLabel };
    if (p && p.key !== key) {
      setCelebrate(p.done);
      const t = window.setTimeout(() => setCelebrate(null), 1000);
      return () => window.clearTimeout(t);
    }
  }, [key, doneLabel]);

  const submitTopic = async (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || busy) return;
    setBusy(true);
    await onTopic(topic.trim());
    setBusy(false);
  };

  if (state === "loading")
    return (
      <section className="nx-card" style={style} aria-busy="true" aria-label={tr("لحظة، أرتّب أوراقكم…")}>
        <span className="nx-sk" style={{ width: "30%", height: 12 }} />
        <span className="nx-sk" style={{ width: "75%", height: 28, marginTop: 14 }} />
        <span className="nx-sk" style={{ width: "50%", height: 12, marginTop: 10 }} />
        <span className="nx-sk" style={{ width: 130, height: 48, marginTop: 16, borderRadius: 999 }} />
        <Dots n={0} />
      </section>
    );

  const cream = state === "waiting";
  const kicker = cream ? tr("تنتظرون {0}", docName) : state === "done" ? tr("خلصتوا الـ10 كلها") : tr("الجاي لكم");
  return (
    <section className={cream ? "nx-card cream" : "nx-card"} style={style} aria-labelledby="nx-title">
      <div className="nx-kick">
        <span>{kicker}</span>
        {n !== null && <span className="nx-of">{tr("{0} من {1}", n, 10)}</span>}
      </div>
      <div key={celebrate ? "done" : `${state}-${step?.key}`} className="nx-body">
        {celebrate ? (
          <h2 id="nx-title" className="nx-title nx-done">
            {celebrate}
          </h2>
        ) : state === "first" ? (
          <>
            <h2 id="nx-title" className="nx-title">
              {tr("وش موضوع بحثكم؟")}
            </h2>
            <p className="nx-why">{tr("منه نبني كل الخطوات الجاية.")}</p>
            <form className="nx-topic" onSubmit={submitTopic}>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={200} placeholder={tr("مثال: الاحتراق الوظيفي عند ممرضات العناية المركزة")} aria-label={tr("موضوع البحث")} dir="auto" />
              <button type="submit" className="nx-go" disabled={!topic.trim() || busy}>
                {tr("ابدأوا")}
              </button>
            </form>
          </>
        ) : state === "waiting" ? (
          <>
            <h2 id="nx-title" className="nx-title">
              {tr("شغلكم عند الدكتورة الحين")}
            </h2>
            <p className="nx-why">{tr("عادة ترد خلال يومين. نبلغكم أول ما ترد.")}</p>
            <Link to="/meeting-minutes?tab=decisions" className="nx-ghost">
              <Eye size={16} aria-hidden />
              {tr("شوفوا اللي أرسلتوه")}
            </Link>
          </>
        ) : state === "done" ? (
          <>
            <h2 id="nx-title" className="nx-title nx-done">
              {tr("بحثكم جاهز للتسليم ✓")}
            </h2>
            <p className="nx-why">{tr("رحلة كاملة. تستاهلون بطاقتها.")}</p>
            <button type="button" className="nx-go" onClick={onAchieve}>
              <Share2 size={16} aria-hidden />
              {tr("سوّوا بطاقة الإنجاز")}
            </button>
          </>
        ) : step ? (
          <>
            <h2 id="nx-title" className="nx-title" dir="auto">
              {step.title}
            </h2>
            <p className="nx-why">{step.why}</p>
            <Link to={step.to} className="nx-go">
              {step.cta} <span aria-hidden>{isEn ? "→" : "←"}</span>
            </Link>
          </>
        ) : null}
      </div>
      {n !== null && <Dots n={n} />}
    </section>
  );
}

function Dots({ n }: { n: number }) {
  return (
    <div className="nx-dots" role="img" aria-label={tr("الرحلة: {0} من {1}", n, 10)}>
      {Array.from({ length: 10 }, (_, i) => (
        <i key={i} className={n >= 10 || i < n - 1 ? "on" : i === n - 1 ? "now" : ""} />
      ))}
    </div>
  );
}
