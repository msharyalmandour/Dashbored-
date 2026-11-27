import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { WesyAvatar } from "../brand/Wesy";
import { openAgent } from "../../lib/agentBus";
import { tr } from "../../lib/i18n";

/** ويسي يلاحظ — تلميحات تطلع حسب اللي يسوونه، مو حسب جدول:
    - لصقوا رابط دراسة بأي مكان ← «أحطه في مكتبة الأدلة؟»
    - تنقّلوا بالقائمة كثير وما كلّموه ← «Ctrl+K وقولوا لي وش تبون»
    كل تلميح يطلع مرة وحدة بس. */

interface Nudge {
  id: string;
  text: string;
  cta: string;
  run: () => void;
}

const STUDY_LINK = /(doi\.org|\b10\.\d{4,9}\/|pubmed|ncbi\.nlm\.nih|scholar\.google|sciencedirect|springer|wiley|tandfonline|sagepub|jamanetwork|bmj\.com|nature\.com)/i;
const isMac = typeof navigator !== "undefined" && /Mac/i.test(navigator.platform);

/* حالة صغيرة بالجهاز: وش انشاف من التلميحات، وكم مرة تنقّلوا بالقائمة */
const HINTS = "wesync.nudges";
interface NudgeMemory {
  seen: string[];
  navs: number;
  asked: boolean;
}
const readMem = (): NudgeMemory => {
  try {
    return { seen: [], navs: 0, asked: false, ...(JSON.parse(localStorage.getItem(HINTS) ?? "{}") as Partial<NudgeMemory>) };
  } catch {
    return { seen: [], navs: 0, asked: false };
  }
};
const writeMem = (m: NudgeMemory) => {
  try {
    localStorage.setItem(HINTS, JSON.stringify(m));
  } catch {
    /* ما يهم */
  }
};

export default function WesyNudges() {
  const [mem, setMem] = useState(readMem);
  const update = (patch: Partial<NudgeMemory>) =>
    setMem((m) => {
      const next = { ...m, ...patch };
      writeMem(next);
      return next;
    });
  const navigate = useNavigate();
  const location = useLocation();
  const [nudge, setNudge] = useState<Nudge | null>(null);

  // لصق رابط دراسة
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text")?.trim() ?? "";
      if (!text || text.length > 400 || !STUDY_LINK.test(text)) return;
      if (location.pathname === "/evidence" || location.pathname === "/literature-review") return;
      // برا خانات الكتابة «ارموا أي شي» (GlobalDrop) يتكفّل فيها — ويسي يلاحظ بس لما ينلصق الرابط داخل خانة (مهمة، محادثة…)
      const el = e.target as HTMLElement | null;
      if (!el?.closest?.("input, textarea, [contenteditable='true'], [contenteditable='']")) return;
      setNudge({
        id: "paste-study",
        text: tr("هذا رابط دراسة؟ 👀 مكانه في مكتبة الأدلة، وأطلّع لكم الاقتباس جاهز."),
        cta: tr("حطّوه هناك"),
        run: () => navigate("/evidence", { state: { spot: "evidence-add", link: text } }),
      });
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [location.pathname, navigate]);

  // عدّ التنقل بالقائمة الجانبية
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("aside a, nav a");
      if (a) setMem((m) => {
        const next = { ...m, navs: m.navs + 1 };
        writeMem(next);
        return next;
      });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // ويسي انفتح؟ خلاص يعرفون الطريق المختصر
  useEffect(() => {
    const onAsk = () => update({ asked: true });
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") onAsk();
    };
    window.addEventListener("wesync:open-agent", onAsk);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wesync:open-agent", onAsk);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // الاختصار بعد التعب: 6 تنقلات بالقائمة وما كلّموا ويسي ولا مرة
  useEffect(() => {
    if (nudge || mem.asked || mem.seen.includes("shortcut") || mem.navs < 6) return;
    setNudge({
      id: "shortcut",
      text: tr("تدوّرون بين الصفحات؟ 😄 اضغطوا {0}+K وقولوا لي وش تبون، وأوديكم.", isMac ? "⌘" : "Ctrl"),
      cta: tr("جرّبوها"),
      run: () => openAgent(),
    });
  }, [mem.navs, mem.asked, mem.seen, nudge]);

  useEffect(() => {
    if (!nudge) return;
    const t = window.setTimeout(() => close(), 12000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nudge]);

  const close = () => {
    if (nudge && !mem.seen.includes(nudge.id)) update({ seen: [...mem.seen, nudge.id] });
    setNudge(null);
  };

  if (!nudge) return null;

  return (
    <div
      role="status"
      className="fixed bottom-24 end-4 z-[90] w-[min(92vw,360px)] rounded-[22px] border border-amber-accent-400/40 bg-[#160904] p-3 text-[#F2EBE3] shadow-2xl shadow-black/50 animate-[page-in_0.35s_ease-out] md:bottom-6 print:hidden"
    >
      <div className="flex items-start gap-3 pe-10">
        <WesyAvatar size={48} state="thinking" className="shrink-0" />
        <p className="text-sm font-medium leading-6">{nudge.text}</p>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button onClick={close} className="min-h-11 rounded-full px-4 text-xs font-bold text-[#F2EBE3]/70 hover:text-[#F2EBE3]">
          {tr("لا، شكرًا")}
        </button>
        <button
          onClick={() => {
            const run = nudge.run;
            close();
            run();
          }}
          className="min-h-11 rounded-full bg-gradient-to-l from-[#FF6A00] to-[#FF9A3C] px-5 text-sm font-bold text-[#160904]"
        >
          {nudge.cta}
        </button>
      </div>
      <button onClick={close} aria-label={tr("إغلاق")} className="absolute end-1 top-1 flex h-11 w-11 items-center justify-center rounded-full text-[#F2EBE3]/60 hover:text-[#F2EBE3]">
        <X size={16} />
      </button>
    </div>
  );
}
