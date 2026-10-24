import { useEffect } from "react";
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import AgentOrb from "./AgentOrb";
import { stageCelebration, useStageCelebration } from "../../lib/stageCelebration";
import { whatsappUrl } from "../../lib/meetings";
import { gradientPill } from "./researchUi";
import { tr, trx } from "../../lib/i18n";

const arDigit = (n: number) => String(n).replace(/\d/g, (d) => tr("٠١٢٣٤٥٦٧٨٩")[Number(d)]);
const SPARKS = Array.from({ length: 28 }, (_, i) => {
  const a = (i / 28) * Math.PI * 2;
  const r = 130 + (i % 4) * 38;
  return { x: Math.cos(a) * r, y: Math.sin(a) * r, s: 4 + (i % 3) * 2, d: (i % 7) * 0.05, c: i % 2 ? "#FFB444" : "#FF6B00" };
});

/** احتفال إنهاء مرحلة: الكرة تنبض برقم المرحلة، شرارات برتقالية وذهبية، «خلصتوا [المرحلة]!»، و«يلا للمرحلة التالية» */
export default function StageCelebration() {
  const c = useStageCelebration();

  useEffect(() => {
    if (!c) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && stageCelebration.hide();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [c]);

  if (!c) return null;
  const share = tr("خلّصنا مرحلة «{0}» ببحثنا على Wesync 🎉", c.title);
  return (
    <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && stageCelebration.hide()}>
      <div role="dialog" aria-modal="true" aria-label={tr("خلصتوا {0}", c.title)} className="celebrate-card relative w-full max-w-[420px] rounded-[36px] border border-[rgba(255,107,0,.3)] bg-[rgba(24,16,8,.95)] px-8 py-10 text-center text-[#F4F0EC] shadow-[0_40px_120px_rgba(0,0,0,.6)]">
        <div className="relative mx-auto flex h-32 w-32 items-center justify-center">
          {SPARKS.map((s, i) => (
            <span key={i} aria-hidden className="spark" style={{ ["--x" as string]: `${s.x}px`, ["--y" as string]: `${s.y}px`, ["--s" as string]: `${s.s}px`, ["--d" as string]: `${s.d}s`, ["--c" as string]: s.c }} />
          ))}
          <AgentOrb size={112} state="celebrate" symbol={arDigit(c.order)} />
        </div>
        <h2 className="mt-6 font-kufi text-3xl font-extrabold">{trx("خلصتوا {0}!", c.title)}</h2>
        <p className="mt-2 text-sm text-[#B8ADA2]">{c.nextTitle ? tr("الجاي: «{0}». خطوة خطوة وبحثكم يخلص بوقته.", c.nextTitle) : tr("بحثكم قطع شوط كبير. عاشت أيديكم.")}</p>
        <div className="mt-7 flex flex-col gap-3">
          <Link to={c.nextTo} onClick={() => stageCelebration.hide()} className={`${gradientPill} !py-3`}>{tr("يلا للمرحلة التالية")}</Link>
          <a href={whatsappUrl(`${share}\n${window.location.origin}`)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-[#FF8A24]/50 py-3 text-sm font-bold text-[#FFB444] hover:bg-[#FF6B00]/10">
            <MessageCircle size={15} />{tr("شاركوها بالقروب")}</a>
          <button onClick={() => stageCelebration.hide()} className="text-xs text-[#B8ADA2] hover:text-[#F4F0EC]">{tr("لاحقًا")}</button>
        </div>
      </div>
    </div>
  );
}
