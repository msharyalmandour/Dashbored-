import { Link } from "react-router-dom";
import { ChevronLeft, FileText, Image, Link2, MessageSquareText, Mic } from "lucide-react";
import Vessel from "./Vessel";
import { tr } from "../../lib/i18n";

const CHIPS = [
  { icon: FileText, label: "PDF" },
  { icon: Image, label: tr("صورة") },
  { icon: MessageSquareText, label: tr("رسالة") },
  { icon: Link2, label: tr("رابط") },
  { icon: Mic, label: tr("فويس") },
];

/** كرت الرئيسية (HomeLux): بالديسكتوب كرت كبير «أسرع طريقة تبدون فيها» + أنواع الرمي + «اسحبوها لأي مكان»؛ بالجوال سطر صغير */
export default function DropEntry({ style }: { style?: React.CSSProperties }) {
  return (
    <>
      <Link to="/drop" className="dr-card dr-in dr-d1 mb-2.5 flex min-h-[84px] items-center gap-3 overflow-hidden rounded-3xl py-1 pe-3.5 ps-1.5 text-ws-text no-underline lg:hidden" style={style} data-learn="drop-entry">
        <Vessel size={88} className="-my-2" scene />
        <span className="min-w-0 flex-1 leading-[1.4]">
          <b className="block text-lg">{tr("ارموا أي شي")}</b>
          <span className="text-sm text-ws-text-accent">{tr("ملف، صورة، رسالة المشرف/ة… ونرتبها")}</span>
        </span>
        <ChevronLeft size={20} className="shrink-0 text-ws-muted ltr:rotate-180" aria-hidden />
      </Link>
      <Link to="/drop" className="lx-drop lx-in mb-[18px] hidden lg:flex" style={style} aria-label={tr("ارموا أي شي")} data-learn="drop-entry">
        <span aria-hidden className="lx-drop-glow" />
        <span className="relative -my-10 flex-none">
          <Vessel size={210} style={{ filter: "brightness(1.05)" }} />
        </span>
        <span className="relative min-w-0 flex-1">
          <span className="block text-xs font-extrabold text-ws-accent3">{tr("أسرع طريقة تبدون فيها")}</span>
          <span className="lx-h1 block !m-0 !text-[34px] !leading-[1.15]">{tr("ارموا أي شي")}</span>
          <span className="mt-2.5 flex flex-wrap gap-1.5">
            {CHIPS.map((c) => (
              <span key={c.label} className="lx-chip">
                <c.icon size={13} aria-hidden />
                {c.label}
              </span>
            ))}
          </span>
        </span>
        <span className="relative border-s border-[rgba(255,199,119,.18)] ps-[22px] text-center leading-[1.5]">
          <span className="block text-sm font-extrabold text-ws-text">{tr("اسحبوها لأي مكان بالموقع")}</span>
          <span className="block text-xs text-ws-muted">
            {tr("أو اضغطوا هنا")} · <kbd className="rounded-xl bg-white/[0.07] px-[7px] py-px font-[inherit]" dir="ltr">Ctrl V</kbd> {tr("للصق")}
          </span>
        </span>
      </Link>
    </>
  );
}
