import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ChevronLeft, Clock, Copy, Flag, MapPin, ShieldCheck, UserRound } from "lucide-react";
import clsx from "clsx";
import { tr } from "../../lib/i18n";

/* قطع Lux المشتركة (HomeLux / TasksLux / MeetLux) */

export function LuxHead({ kicker, title, sub, children }: { kicker: string; title: string; sub?: string; children?: ReactNode }) {
  return (
    <header className="lx-head">
      <div className="min-w-0 flex-[1_1_320px]">
        <div className="lx-kick">{kicker}</div>
        <h1 className="lx-h1">{title}</h1>
        {sub && <p className="lx-sub">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </header>
  );
}

/** تبديل حبوب: الحالية كريمية (بعدّاد غامق) والباقي شفاف */
export function Segmented<T extends string>({ items, value, onChange, label }: { items: { id: T; label: string; count?: number; to?: string }[]; value: T; onChange?: (id: T) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="lx-seg">
      {items.map((it) => {
        const on = it.id === value;
        const inner = (
          <>
            {it.label}
            {it.count !== undefined && (
              <b className="lx-seg-n" dir="ltr">
                {it.count}
              </b>
            )}
          </>
        );
        return it.to ? (
          <Link key={it.id} to={it.to} role="tab" aria-selected={on} className={clsx("lx-seg-b", on && "on")}>
            {inner}
          </Link>
        ) : (
          <button key={it.id} type="button" role="tab" aria-selected={on} className={clsx("lx-seg-b", on && "on")} onClick={() => onChange?.(it.id)}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}

export type ReviewRow = { id: string; count: number; text: string; fix: string; to: string };
const REVIEW_ICON: Record<string, typeof AlertCircle> = { unproven: AlertCircle, dup: Copy, late: Clock, owners: UserRound, deadline: Flag, unplaced: MapPin };

/** «قبل لا تشوفها الدكتورة»: مشاكل حقيقية من بياناتكم، مرتبة من الأهم، وكل وحدة لها حل */
export function ReviewCard({ items, className, limit, moreTo = "/tasks" }: { items: ReviewRow[]; className?: string; limit?: number; moreTo?: string }) {
  const shown = limit ? items.slice(0, limit) : items;
  const more = items.length - shown.length;
  return (
    <section className={clsx("lx-card lx-in p-[18px]", className)} aria-labelledby="lx-rv-h">
      <div className="flex items-center gap-2.5">
        <span className="lx-ic" aria-hidden>
          <ShieldCheck size={17} />
        </span>
        <h2 id="lx-rv-h" className="lx-h2 flex-1">
          {tr("قبل لا تشوفها الدكتورة")}
        </h2>
        <span className="lx-pill-n" dir="ltr">
          {items.length}
        </span>
      </div>
      <p className="m-0 mt-1 text-[13px] text-[#ABA095]">{tr("مرتبة من الأهم. كل وحدة لها حل واحد.")}</p>
      {items.length === 0 ? (
        <p className="m-0 mt-4 text-[14px] text-[#E9D3B8]">{tr("ما لقينا شي يضعّف شغلكم ✓")}</p>
      ) : (
        <ol className="m-0 mt-2 list-none p-0">
          {shown.map((it) => {
            const Icon = REVIEW_ICON[it.id] ?? AlertCircle;
            const text = it.text.replace(/[.،]\s*$/, "");
            const cut = text.search(/[.،]\s/);
            const title = cut > 0 ? text.slice(0, cut) : text;
            const sub = cut > 0 ? text.slice(cut + 1).trim() : "";
            return (
              <li key={it.id} className="lx-rv-row">
                <span className="lx-ic lg" aria-hidden>
                  <Icon size={18} />
                </span>
                {/* الحل تحت النص (مو جنبه) عشان النص ياخذ عرض البطاقة كله حتى بالشاشات الصغيرة */}
                <div className="min-w-0 flex-1 leading-[1.45]">
                  <b className="line-clamp-2 block text-[15px] text-[#F2EBE3]" dir="auto">
                    {title}
                  </b>
                  {sub && (
                    <span className="line-clamp-2 block text-[13px] text-[#ABA095]" dir="auto">
                      {sub}
                    </span>
                  )}
                  <Link to={it.to} className="lx-fix !min-h-[36px]">
                    {it.fix}
                    <ChevronLeft size={15} className="ltr:rotate-180" aria-hidden />
                  </Link>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {more > 0 && (
        <Link to={moreTo} className="lx-fix mt-1 !min-h-[44px] text-[13px]">
          {tr("شوفوا الباقي ({0})", more)}
          <ChevronLeft size={15} className="ltr:rotate-180" aria-hidden />
        </Link>
      )}
    </section>
  );
}
