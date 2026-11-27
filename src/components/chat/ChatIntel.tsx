import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Avatar from "../ui/Avatar";
import { tr } from "../../lib/i18n";
import { boldParts, type LiveSummary } from "../../lib/chatIntel";

/* ذكاء المحادثة — القيم منقولة من design-reference/supervisor (SupChatM/D، SupCatchupM) */

const Spark = ({ size = 15 }: { size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
  </svg>
);
const Chev = ({ open }: { open: boolean }) => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="ltr:-scale-x-100" data-open={open}>
    <path d="M15 6l-6 6 6 6" />
  </svg>
);
export const Moon = ({ size = 13 }: { size?: number }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </svg>
);
const Q = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14" />
    <circle cx="12" cy="17" r=".6" />
  </svg>
);

function ago(iso: string | null) {
  if (!iso) return "";
  const min = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (min < 60) return tr("تحدّثت قبل {0} د", min);
  const h = Math.round(min / 60);
  return h < 24 ? tr("تحدّثت قبل {0} س", h) : tr("تحدّثت قبل {0} يوم", Math.round(h / 24));
}

/** الخلاصة الحيّة: انقرر / مفتوح / مين عليه وش — تنطوي لسطر واحد */
export function LiveSummaryCard({ s, updatedAt, collapsed, onToggle }: { s: LiveSummary; updatedAt: string | null; collapsed: boolean; onToggle: () => void }) {
  const tasks = s.owners.length;
  if (collapsed) {
    return (
      <button type="button" className="ci-sum-line" onClick={onToggle} aria-expanded={false}>
        <span className="text-[#FFC777]">
          <Spark />
        </span>
        <span className="min-w-0 flex-1 truncate text-start">
          <b>{tr("الخلاصة:")}</b> {[tr("{0} قرارات", s.decided.length), tr("{0} سؤال مفتوح", s.open.length), tr("{0} مهام", tasks)].join(" · ")}
        </span>
        <span className="text-[#ABA095]">
          <Chev open={false} />
        </span>
      </button>
    );
  }
  const col = (title: string, items: string[]) => (
    <div className="min-w-0 flex-1">
      <div className="mb-1 text-[12px] font-bold text-[#FFB444]">{title}</div>
      {items.length ? (
        items.map((x, i) => (
          <div key={i} className="py-[3px] text-[13px] leading-[1.5] text-[#EAE3DC]" dir="auto">
            {x}
          </div>
        ))
      ) : (
        <div className="py-[3px] text-[13px] text-[#ABA095]">—</div>
      )}
    </div>
  );
  return (
    <section className="ci-sum" aria-label={tr("الخلاصة الحيّة")}>
      <div className="flex items-center gap-2">
        <span className="text-[#FFC777]">
          <Spark />
        </span>
        <b className="flex-1 text-[14px]">{tr("الخلاصة الحيّة")}</b>
        {updatedAt && <span className="text-[12px] text-[#ABA095]">{ago(updatedAt)}</span>}
        <button type="button" aria-label={tr("اطووها")} aria-expanded onClick={onToggle} className="flex h-9 w-11 items-center justify-center border-0 bg-transparent text-[#ABA095]">
          <Chev open />
        </button>
      </div>
      <div className="mt-1.5 flex gap-3">
        {col(tr("انقرر"), s.decided)}
        {col(tr("مفتوح"), s.open)}
        {col(
          tr("مين عليه وش"),
          s.owners.map((o) => `${o.who} · ${o.what}`),
        )}
      </div>
    </section>
  );
}

/** «ينتظر جواب من 26 ساعة · يعرفه خالد؟» */
export function OrphanStrip({
  body,
  hours,
  asker,
  knower,
  canAskDoc,
  onAnswer,
  onAskDoc,
  onDismiss,
}: {
  body: string;
  hours: number;
  asker: { name: string; avatar?: string | null };
  knower: string | null;
  canAskDoc: boolean;
  onAnswer: () => void;
  onAskDoc: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="ci-orphan" role="note">
      <div className="flex items-center gap-2 text-[12px] font-bold text-[#FFC777]">
        <Q />
        {knower ? tr("ينتظر جواب من {0} ساعة · يعرفه {1}؟", hours, knower) : tr("ينتظر جواب من {0} ساعة", hours)}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <Avatar initials="" name={asker.name} avatar={asker.avatar ?? undefined} px={26} ring="#1A120E" />
        <span className="min-w-0 flex-1 text-[14px] text-[#EAE3DC]" dir="auto">
          «{body}»
        </span>
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" className="ci-cream flex-1" onClick={onAnswer}>
          {tr("أجاوب")}
        </button>
        {canAskDoc && (
          <button type="button" className="ci-ghost" onClick={onAskDoc}>
            {tr("اسألوا الدكتورة")}
          </button>
        )}
        <button type="button" className="ci-text" onClick={onDismiss}>
          {tr("ما يحتاج")}
        </button>
      </div>
    </div>
  );
}

/** «اللي فاتك ويخصك» بعد غياب 48 ساعة: 3 أسطر + «وصلت» */
export function CatchupSheet({ away, lines, onClose, onJump }: { away: string; lines: string[]; onClose: () => void; onJump: () => void }) {
  const ok = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ok.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <>
      <div aria-hidden className="ci-scrim" onClick={onClose} />
      <section role="dialog" aria-modal="true" aria-labelledby="ci-catch-h" className="ci-catch">
        <div className="flex items-center gap-3">
          <div className="sup-obj" role="img" aria-label={tr("كروت زجاج وخيط ذهبي")} style={{ width: 84, height: 84, flex: "none" }}>
            <img src="/sup/glass.jpg" alt="" width={84} height={84} />
          </div>
          <div>
            <div className="text-[12px] font-bold text-[#FFB444]">{away}</div>
            <h2 id="ci-catch-h" className="m-0 bg-gradient-to-b from-[#FFF6EC] to-[#E9C9A0] bg-clip-text text-[24px] font-extrabold text-transparent">
              {tr("اللي فاتك ويخصك")}
            </h2>
          </div>
        </div>
        <ol className="m-0 list-none p-0">
          {lines.map((l, i) => (
            <li key={i} className="flex items-start gap-2.5 py-2.5" style={{ borderTop: i ? "1px solid rgba(255,255,255,.06)" : 0 }}>
              <b className="flex h-6 w-6 flex-none items-center justify-center rounded-lg text-[12px] text-[#FFB65C]" style={{ background: "rgba(255,154,60,.16)" }}>
                {i + 1}
              </b>
              <span className="text-[15px] leading-[1.6] text-[#EAE3DC]" dir="auto">
                {boldParts(l).map((p, k) => (p.b ? <b key={k}>{p.t}</b> : <span key={k}>{p.t}</span>))}
              </span>
            </li>
          ))}
        </ol>
        <button ref={ok} type="button" className="sup-btn-cream mt-2.5 w-full" style={{ height: 50, fontSize: 15 }} onClick={onClose}>
          {tr("وصلت")}
        </button>
        <button type="button" className="flex min-h-[44px] w-full items-center justify-center border-0 bg-transparent font-[inherit] text-[13px] text-[#EAE3DC]" onClick={onJump}>
          {tr("ودّوني لأول رسالة ما قريتها")}
        </button>
      </section>
    </>,
    document.body,
  );
}

export type FocusChoice = "1h" | "2h" | "tomorrow";

/** وقت تركيز: ساعة / ساعتين / لين بكرة */
export function FocusPanel({ active, onPick, onEnd }: { active: FocusChoice | null; onPick: (c: FocusChoice) => void; onEnd: () => void }) {
  const opts: [FocusChoice, string][] = [
    ["1h", tr("ساعة")],
    ["2h", tr("ساعتين")],
    ["tomorrow", tr("لين بكرة")],
  ];
  return (
    <section className="sup-glass" aria-labelledby="ci-focus-h">
      <div className="flex items-center gap-2.5">
        <span className="sup-ic text-[#FFC777]">
          <Moon size={16} />
        </span>
        <b id="ci-focus-h" className="flex-1 text-[17px]">
          {tr("وقت تركيز")}
        </b>
        {active && (
          <button type="button" className="ci-text !min-h-[36px]" onClick={onEnd}>
            {tr("أنهوه")}
          </button>
        )}
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-1.5" role="group" aria-label={tr("مدة التركيز")}>
        {opts.map(([k, label]) => (
          <button key={k} type="button" aria-pressed={active === k} className="ci-seg" onClick={() => onPick(k)}>
            {label}
          </button>
        ))}
      </div>
      <p className="m-0 mt-2.5 text-[13px] leading-[1.7] text-[#E9D3B8]">{tr("الإشعارات تتجمع، إلا لو أحد أشار لك أو الرسالة من الدكتورة. ويطلع لك ملخص لما يخلص الوقت.")}</p>
    </section>
  );
}

/** حبة الهيدر: «وقت تركيز · لين 4:00» */
export function FocusPill({ until, onClick }: { until: string | null; onClick: () => void }) {
  if (!until) {
    return (
      <button type="button" className="tc-round" aria-label={tr("وقت تركيز")} onClick={onClick}>
        <Moon size={18} />
      </button>
    );
  }
  const t = new Date(until).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?[ap]m/i, "");
  return (
    <button type="button" className="ci-pill" onClick={onClick}>
      <Moon />
      <span className="max-md:hidden">{tr("وقت تركيز · لين {0}", t)}</span>
      <span className="md:hidden">{tr("تركيز · {0}", t)}</span>
    </button>
  );
}

/** لما يخلص وقت التركيز: وش جاك وقتها */
export function FocusDone({ count, mentions, doc, onClose }: { count: number; mentions: number; doc: number; onClose: () => void }) {
  return (
    <div className="ci-orphan" role="status">
      <div className="flex items-center gap-2 text-[12px] font-bold text-[#FFC777]">
        <Moon />
        {tr("خلص وقت التركيز")}
      </div>
      <p className="m-0 mt-1 text-[14px] text-[#EAE3DC]">
        {count === 0 ? tr("ما فاتك شي — المحادثة كانت هادية.") : [tr("وصلت {0} رسائل", count), mentions ? tr("{0} منها أشارت لك", mentions) : "", doc ? tr("{0} من الدكتورة", doc) : ""].filter(Boolean).join(" · ")}
      </p>
      <div className="mt-2 flex">
        <button type="button" className="ci-cream flex-1" onClick={onClose}>
          {tr("تمام")}
        </button>
      </div>
    </div>
  );
}
