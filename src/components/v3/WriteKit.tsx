import type { CSSProperties, ReactNode } from "react";
import { Lightbulb, Moon, Sun } from "lucide-react";
import clsx from "clsx";
import { CheckSvg } from "./Motion";
import { isEn, tr } from "../../lib/i18n";

/* قطع صفحات «أكتب» المصحّحة: قائمة الأقسام (يمين) وكرت المحرر (يسار) — نفس شكل الرئيسية. */

export type RailItem = { key: string; label: string; en?: string; done: boolean; group?: string };

function Ring({ pct }: { pct: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex h-[54px] w-[54px] flex-none items-center justify-center" role="img" aria-label={tr("{0}٪ مكتمل", pct)}>
      <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden className="absolute inset-0 -rotate-90">
        <circle cx="27" cy="27" r={r} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="5" />
        {pct > 0 && <circle cx="27" cy="27" r={r} fill="none" stroke="url(#wf-ring)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(pct / 100) * c} ${c}`} />}
        <defs>
          <linearGradient id="wf-ring" x1="0" x2="1">
            <stop offset="0" stopColor="#FF6A00" />
            <stop offset="1" stopColor="#FFC777" />
          </linearGradient>
        </defs>
      </svg>
      <span className="wf-num text-[13px]">{pct}%</span>
    </span>
  );
}

/** قائمة الأقسام: كمبيوتر عمودية (مع المجموعات)، جوال شريط أفقي ينسحب */
export function SectionRail({
  title,
  items,
  activeKey,
  onPick,
  footer,
  style,
  ariaLabel,
}: {
  title: string;
  items: RailItem[];
  activeKey: string | null | undefined;
  onPick: (key: string) => void;
  footer?: ReactNode;
  style?: CSSProperties;
  ariaLabel?: string;
}) {
  const done = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  let lastGroup: string | undefined;
  return (
    <nav aria-label={ariaLabel ?? title} className="hg-card min-w-0 self-start !px-4 !pb-4 !pt-5" style={style}>
      <div className="flex items-center gap-3 px-1.5 pb-2.5">
        <div className="min-w-0 flex-1">
          <div className="text-[20px] font-extrabold">{title}</div>
          <div className="text-[13px] text-[#ABA095]">
            <b className="wf-num text-[#EAE3DC]">{done}</b> {tr("من")} <b className="wf-num text-[#EAE3DC]">{items.length}</b> {tr("خلصت")}
          </div>
        </div>
        <Ring pct={pct} />
      </div>

      {/* جوال */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden" style={{ scrollbarWidth: "none" }}>
        {items.map((it, i) => {
          const on = it.key === activeKey;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onPick(it.key)}
              aria-current={on ? "step" : undefined}
              className={clsx("wf-sec !w-auto shrink-0 !rounded-full !py-1.5 !pe-4", it.done && "done")}
            >
              <span className="wf-dn">{it.done ? <CheckSvg size={13} /> : i + 1}</span>
              <span className="wf-t whitespace-nowrap">{it.label}</span>
            </button>
          );
        })}
      </div>

      {/* كمبيوتر */}
      <ol className="m-0 hidden list-none flex-col gap-0.5 p-0 lg:flex">
        {items.map((it, i) => {
          const on = it.key === activeKey;
          const showGroup = it.group && it.group !== lastGroup;
          lastGroup = it.group;
          return (
            <li key={it.key}>
              {showGroup && <div className="wf-grp">{it.group}</div>}
              <button type="button" onClick={() => onPick(it.key)} aria-current={on ? "step" : undefined} className={clsx("wf-sec", it.done && "done")}>
                <span className="wf-dn">{it.done ? <CheckSvg size={14} /> : i + 1}</span>
                <span className="min-w-0">
                  <span className="wf-t">{it.label}</span>
                  {!isEn && it.en && <span className="wf-e">{it.en}</span>}
                </span>
                {it.done ? <span className="wf-st done">{tr("خلص")}</span> : on ? <span className="wf-st now">{tr("الحين")}</span> : null}
              </button>
            </li>
          );
        })}
      </ol>
      {footer && <div className="mt-3 grid grid-cols-2 gap-2">{footer}</div>}
    </nav>
  );
}

/** تبديل «داكن / ورقة» داخل كرت المحرر */
export function ModeToggle({ paper, onChange }: { paper: boolean; onChange: (on: boolean) => void }) {
  return (
    <div className="wf-mode" role="group" aria-label={tr("شكل منطقة الكتابة")}>
      <button type="button" aria-pressed={!paper} onClick={() => onChange(false)}>
        <Moon size={14} aria-hidden />
        {tr("داكن")}
      </button>
      <button type="button" aria-pressed={paper} onClick={() => onChange(true)}>
        <Sun size={14} aria-hidden />
        {tr("ورقة")}
      </button>
    </div>
  );
}

/** كرت المحرر: «القسم X من Y»، العنوان والمصطلح، تبديل الشكل، التلميح، وبعدها المحتوى */
export function EditorCard({
  index,
  total,
  title,
  en,
  paper,
  onPaper,
  hint,
  children,
  style,
  titleId,
}: {
  index: number;
  total: number;
  title: string;
  en?: string;
  paper: boolean;
  onPaper: (on: boolean) => void;
  hint?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
  titleId?: string;
}) {
  return (
    <section className={clsx("hg-card ws-write flex flex-col gap-4 !p-5 sm:!px-[26px] sm:!py-6", paper && "is-paper")} style={style} aria-labelledby={titleId}>
      <div className="ws-paper-layer" aria-hidden />
      <div className="ws-paper-margin" aria-hidden />
      <div className="flex items-start gap-3.5">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold text-[#ABA095]">
            {tr("القسم")} <span className="wf-num">{index}</span> {tr("من")} <span className="wf-num">{total}</span>
          </div>
          <h2 id={titleId} className="m-0 text-[24px] font-extrabold leading-[1.25] sm:text-[30px]">
            {title}
          </h2>
          {!isEn && en && <div className="text-sm text-[#ABA095]" dir="ltr" style={{ textAlign: "right" }}>{en}</div>}
        </div>
        <ModeToggle paper={paper} onChange={onPaper} />
      </div>
      {hint && (
        <div className="wf-hint ws-dark-only">
          <Lightbulb size={17} className="mt-0.5 shrink-0 text-[#FFC777]" aria-hidden />
          <span>{hint}</span>
        </div>
      )}
      {children}
    </section>
  );
}

/** «{n} كلمة · ينحفظ تلقائيًا» */
export function WordsSaved({ words, extra }: { words: number; extra?: ReactNode }) {
  return (
    <span className="text-[13px] text-[#ABA095]">
      <b className="wf-num text-[#EAE3DC]">{words}</b> {tr("كلمة")} · {tr("ينحفظ تلقائيًا")}
      {extra}
    </span>
  );
}
