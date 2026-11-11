import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowLeftRight, Award, BarChart3, CalendarDays, Check, CircleHelp, Eye, FileText, Folder, LibraryBig, MessageSquareText, PenLine, Scale, X } from "lucide-react";
import { tr } from "../../lib/i18n";
import { formatDateShort } from "../../lib/date";
import { CONFIDENT_AT, countOf, DEST_LABEL, DESTS, fileTag, retarget, SECTION_LABEL, type Destination, type DropResult } from "../../lib/drops";
import type { TeamMember } from "../../data/types";

export const DEST_ICON: Record<Destination, typeof Check> = {
  library: LibraryBig,
  tasks: Check,
  minutes: FileText,
  supervisor_note: MessageSquareText,
  supervisor_question: CircleHelp,
  proposal: PenLine,
  dataset: BarChart3,
  tools: Scale,
  ethics: Award,
  calendar: CalendarDays,
  files: Folder,
};

export function FileIcon({ name, mime, small }: { name: string; mime?: string | null; small?: boolean }) {
  return (
    <span aria-hidden className={`dr-file${small ? " sm" : ""}`} dir="ltr">
      {fileTag(name, mime)}
      <i />
    </span>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className="dr-switch" onClick={(e) => (e.stopPropagation(), onChange(!on))}>
      <span>
        <i />
      </span>
    </button>
  );
}

export function ConfidencePill({ value }: { value: number }) {
  return value >= CONFIDENT_AT ? (
    <span className="dr-chip gold">
      <Check size={12} strokeWidth={2.6} aria-hidden />
      {tr("متأكدين")}
    </span>
  ) : (
    <span className="dr-chip warn">
      <Eye size={12} aria-hidden />
      {tr("تأكدوا منها")}
    </span>
  );
}

const AV_BG = ["#FFE3C2", "#FF9A5A", "#FFC85A", "#FFB2A6", "#E9C9A0"];
function Owner({ id, roster }: { id: string | null; roster: TeamMember[] }) {
  const i = roster.findIndex((m) => m.id === id);
  if (i < 0) return null;
  const m = roster[i];
  return (
    <span className="dr-av" style={{ background: AV_BG[i % AV_BG.length] }} title={m.name} aria-label={m.name}>
      {m.name.trim().charAt(0)}
    </span>
  );
}

const useful = (v: unknown) => typeof v === "string" && v.trim() && !/غير مذكور/.test(v);

/** معاينة البيانات حسب المكان: حقول الجدول، سطور المهام، ملخص المحضر… */
function Preview({ r, roster }: { r: DropResult; roster: TeamMember[] }) {
  const p = r.payload ?? {};
  switch (r.destination) {
    case "library": {
      const cells: [string, unknown][] = [
        [tr("الدولة"), p.country],
        [tr("الهدف"), p.aim],
        [tr("التصميم"), p.design],
        [tr("العينة"), p.sample],
        [tr("جمع البيانات"), p.data_collection],
        [tr("النتيجة"), p.finding],
      ];
      const shown = cells.filter(([, v]) => useful(v));
      return shown.length ? (
        <div className="grid grid-cols-2 gap-1.5">
          {shown.map(([k, v]) => (
            <div key={k} className="dr-cell">
              <div>{k}</div>
              <div dir="auto" className="line-clamp-3">
                {String(v)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="dr-line" dir="auto">
          {[p.authors, p.year].filter(Boolean).join(" · ")}
        </div>
      );
    }
    case "tasks":
      return (
        <div>
          {(p.tasks ?? []).slice(0, 6).map((t: { title: string; owner_id: string | null; due: string }, i: number) => (
            <div key={i} className="dr-task">
              <span className="dr-box" aria-hidden />
              <span className="min-w-0 flex-1 text-[14px] font-bold" dir="auto">
                {t.title}
              </span>
              {t.due && <span className="text-[12px] font-bold text-[#ABA095]">{formatDateShort(t.due)}</span>}
              <Owner id={t.owner_id} roster={roster} />
            </div>
          ))}
          {(p.tasks?.length ?? 0) > 6 && <div className="dr-line">{tr("و{0} غيرها", p.tasks.length - 6)}</div>}
        </div>
      );
    case "minutes":
      return (
        <>
          {p.discussion && (
            <div className="dr-line line-clamp-2" dir="auto">
              {tr("النقاش: {0}", p.discussion)}
            </div>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {p.decisions && (
              <span className="dr-chip" dir="auto">
                {tr("قرار: {0}", String(p.decisions).split("\n")[0].slice(0, 40))}
              </span>
            )}
            {(p.action_items?.length ?? 0) > 0 && <span className="dr-chip">{tr("{0} بنود عمل", p.action_items.length)}</span>}
          </div>
        </>
      );
    case "supervisor_note":
      return (
        <div className="dr-line" dir="auto">
          «{p.comments?.[0]?.text}»{p.comments?.length > 1 ? ` + ${tr("{0} غيرها", p.comments.length - 1)}` : ""}
        </div>
      );
    case "supervisor_question":
      return (
        <>
          <div className="dr-line">{tr("بنرسله للمشرف/ة بصفحة المشرف/ة — وما ينسحب بعد ما ينرسل.")}</div>
          {p.options?.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {p.options.map((o: string) => (
                <span key={o} className="dr-chip" dir="auto">
                  {o}
                </span>
              ))}
            </div>
          )}
        </>
      );
    case "proposal":
      return (
        <>
          <div className="dr-line">{tr("{0} كلمة ← قسم «{1}» بالمقترح", String(p.text ?? "").split(/\s+/).filter(Boolean).length, SECTION_LABEL[p.section] ?? p.section)}</div>
          <div className="mt-1.5">
            <span className="dr-chip">{tr("نسخة جديدة — ما نكتب فوق نصكم")}</span>
          </div>
        </>
      );
    case "dataset":
      return (
        <>
          <div className="dr-line">{tr("{0} رد · {1} عمود", p.row_count ?? 0, p.columns?.length ?? 0)}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(p.columns ?? []).slice(0, 4).map((c: string) => (
              <span key={c} className="dr-chip" dir="auto">
                {c}
              </span>
            ))}
          </div>
        </>
      );
    case "tools":
      return (
        <div className="dr-line" dir="auto">
          {[p.items_count, p.dimensions, p.scale].filter(useful).join(" · ")}
        </div>
      );
    case "ethics":
      return (
        <div className="dr-line" dir="auto">
          {[p.approval_number && tr("رقم {0}", p.approval_number), p.approval_date && formatDateShort(p.approval_date)].filter(Boolean).join(" · ")} {tr("← تصير الخطوة «مكتملة»")}
        </div>
      );
    case "calendar":
      return (
        <div className="flex flex-wrap gap-1.5">
          {(p.events ?? []).slice(0, 4).map((e: { title: string; date: string }, i: number) => (
            <span key={i} className="dr-chip" dir="auto">
              {e.title} · {formatDateShort(e.date)}
            </span>
          ))}
        </div>
      );
    default:
      return <div className="dr-line">{p.why || tr("ما لقينا مكان أنسب، بيروح للملفات.")}</div>;
  }
}

/** كرت نتيجة: أيقونة المكان + اسمه (+ ×العدد)، العنوان، معاينة، الثقة، «غيّروا المكان»، ومفتاح التضمين */
export function ResultCard({ r, roster, selected, onSelect, onToggle, onMove, isLeader, index }: { r: DropResult; roster: TeamMember[]; selected: boolean; onSelect: () => void; onToggle: (v: boolean) => void; onMove: () => void; isLeader: boolean; index: number }) {
  const Icon = DEST_ICON[r.destination];
  const n = countOf(r);
  return (
    <article className={`dr-res dr-card dr-fan${r.included ? "" : " off"}${selected ? " sel" : ""}`} style={{ animationDelay: `${0.08 * (index + 1)}s` }} onClick={onSelect} aria-current={selected || undefined}>
      <div className="flex items-center gap-2.5">
        <span className="dr-ic gold" aria-hidden>
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1 leading-[1.35]">
          <div className="dr-dest">
            {DEST_LABEL[r.destination]}
            {n > 1 && (
              <b className="text-[12px] text-[#FFC777]" dir="ltr">
                ×{n}
              </b>
            )}
          </div>
          <div className="dr-res-t" dir="auto">
            {r.title}
          </div>
        </div>
        <Switch on={r.included} onChange={onToggle} label={r.included ? tr("مضمّنة — اضغطوا لاستبعادها") : tr("مستبعدة — اضغطوا لتضمينها")} />
      </div>
      <div className="mt-2">
        <Preview r={r} roster={roster} />
        {r.destination === "tasks" && !isLeader && <div className="dr-line mt-1 text-[#FFC777]">{tr("المهام يضيفها القائد — بنحفظ الباقي ونخبره.")}</div>}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <ConfidencePill value={r.confidence} />
        <span className="flex-1" />
        <button type="button" className="dr-text dim !px-1 !text-[12px]" onClick={(e) => (e.stopPropagation(), onMove())}>
          <ArrowLeftRight size={13} aria-hidden />
          {tr("غيّروا المكان")}
        </button>
      </div>
    </article>
  );
}

/** ورقة سفلية (بالجوال) / نافذة بالنص (بالديسكتوب) — Esc يقفل، والتركيز يدخلها */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <>
      <div className="dr-scrim" onClick={onClose} aria-hidden />
      <div ref={box} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className="dr-sheet dr-sh outline-none">
        <div className="dr-grab md:hidden" aria-hidden />
        <div className="mb-2 flex items-center gap-2">
          <h2 className="m-0 flex-1 text-[17px] font-extrabold text-[#F2EBE3]">{title}</h2>
          <button type="button" className="dr-text dim !min-w-[44px]" onClick={onClose} aria-label={tr("إغلاق")}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </>,
    document.body,
  );
}

/** «غيّروا المكان»: الأماكن كلها، واللي ما ينفع له البيانات تنطفي مع السبب */
export function DestinationSheet({ r, onClose, onPick }: { r: DropResult | null; onClose: () => void; onPick: (to: Destination) => void }) {
  return (
    <Sheet open={!!r} onClose={onClose} title={tr("وين تبونها تروح؟")}>
      <div className="flex flex-col gap-1">
        {r &&
          DESTS.map((d) => {
            const Icon = DEST_ICON[d];
            const ok = !!retarget(r, d);
            const cur = d === r.destination;
            return (
              <button key={d} type="button" className="dr-menu-i disabled:opacity-40" disabled={!ok} aria-current={cur || undefined} onClick={() => onPick(d)} style={cur ? { background: "rgba(255,154,60,.12)" } : undefined}>
                <span className="dr-ic" style={cur ? { background: "rgba(255,199,119,.14)", color: "#FFC777" } : undefined} aria-hidden>
                  <Icon size={16} />
                </span>
                <span className="flex-1">{DEST_LABEL[d]}</span>
                {!ok && <span className="text-[12px] text-[#ABA095]">{d === "calendar" ? tr("يحتاج تاريخ") : d === "dataset" ? tr("يحتاج جدول") : tr("ما يناسبها")}</span>}
                {cur && <Check size={16} className="text-[#FFC777]" aria-hidden />}
              </button>
            );
          })}
      </div>
    </Sheet>
  );
}

type Field = { key: string; label: string; area?: boolean; type?: string };
const FIELDS: Partial<Record<Destination, Field[]>> = {
  library: [
    { key: "title", label: tr("العنوان") },
    { key: "authors", label: tr("المؤلفين") },
    { key: "year", label: tr("السنة"), type: "number" },
    { key: "country", label: tr("الدولة") },
    { key: "aim", label: tr("الهدف"), area: true },
    { key: "design", label: tr("التصميم") },
    { key: "sample", label: tr("العينة") },
    { key: "data_collection", label: tr("جمع البيانات") },
    { key: "finding", label: tr("النتيجة"), area: true },
  ],
  minutes: [
    { key: "meeting_date", label: tr("التاريخ"), type: "date" },
    { key: "agenda", label: tr("جدول الأعمال"), area: true },
    { key: "discussion", label: tr("النقاش"), area: true },
    { key: "decisions", label: tr("القرارات"), area: true },
  ],
  supervisor_question: [{ key: "question", label: tr("السؤال"), area: true }],
  proposal: [{ key: "text", label: tr("النص"), area: true }],
  dataset: [{ key: "name", label: tr("الاسم") }],
  tools: [
    { key: "tool_name", label: tr("اسم الأداة") },
    { key: "items_count", label: tr("عدد البنود") },
    { key: "dimensions", label: tr("الأبعاد") },
    { key: "scale", label: tr("المقياس") },
  ],
  ethics: [
    { key: "approval_number", label: tr("رقم الموافقة") },
    { key: "approval_date", label: tr("تاريخ الموافقة"), type: "date" },
  ],
  files: [{ key: "name", label: tr("الاسم") }],
};

/** «عدّلوا»: حقول الكرت المختار */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function EditSheet({ r, roster, onClose, onSave }: { r: DropResult | null; roster: TeamMember[]; onClose: () => void; onSave: (title: string, payload: Record<string, any>) => void }) {
  const [title, setTitle] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [p, setP] = useState<Record<string, any>>({});
  const [key, setKey] = useState("");
  if (r && key !== r.id) {
    setKey(r.id);
    setTitle(r.title);
    setP(JSON.parse(JSON.stringify(r.payload ?? {})));
  }
  const set = (k: string, v: unknown) => setP((prev) => ({ ...prev, [k]: v }));
  const setIn = (list: string, i: number, k: string, v: unknown) => setP((prev) => ({ ...prev, [list]: prev[list].map((x: Record<string, unknown>, j: number) => (j === i ? { ...x, [k]: v } : x)) }));
  return (
    <Sheet open={!!r} onClose={onClose} title={tr("عدّلوا قبل لا نحطها")}>
      {r && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(title.trim() || r.title, p);
          }}
        >
          <label className="dr-label" htmlFor="dr-e-title">
            {tr("عنوان الكرت")}
          </label>
          <input id="dr-e-title" className="dr-field" value={title} onChange={(e) => setTitle(e.target.value)} dir="auto" />
          {(FIELDS[r.destination] ?? []).map((f) => (
            <div key={f.key}>
              <label className="dr-label" htmlFor={`dr-e-${f.key}`}>
                {f.label}
              </label>
              {f.area ? (
                <textarea id={`dr-e-${f.key}`} className="dr-field" rows={3} value={p[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} dir="auto" />
              ) : (
                <input id={`dr-e-${f.key}`} className="dr-field" type={f.type ?? "text"} value={p[f.key] ?? ""} onChange={(e) => set(f.key, f.type === "number" ? (e.target.value ? Number(e.target.value) : null) : e.target.value)} dir="auto" />
              )}
            </div>
          ))}
          {r.destination === "tasks" &&
            (p.tasks ?? []).map((t: { title: string; owner_id: string | null; due: string }, i: number) => (
              <fieldset key={i} className="mt-3 rounded-2xl border border-white/10 p-3">
                <legend className="px-1 text-[12px] text-[#ABA095]">{tr("مهمة {0}", i + 1)}</legend>
                <input className="dr-field" aria-label={tr("عنوان المهمة")} value={t.title} onChange={(e) => setIn("tasks", i, "title", e.target.value)} dir="auto" />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <select className="dr-field" aria-label={tr("المسؤول")} value={t.owner_id ?? ""} onChange={(e) => setIn("tasks", i, "owner_id", e.target.value || null)}>
                    <option value="">{tr("بدون مسؤول")}</option>
                    {roster.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <input className="dr-field" type="date" aria-label={tr("الموعد")} value={t.due ?? ""} onChange={(e) => setIn("tasks", i, "due", e.target.value)} />
                </div>
              </fieldset>
            ))}
          {r.destination === "supervisor_note" &&
            (p.comments ?? []).map((c: { text: string }, i: number) => (
              <div key={i}>
                <label className="dr-label" htmlFor={`dr-e-c${i}`}>
                  {tr("ملاحظة {0}", i + 1)}
                </label>
                <textarea id={`dr-e-c${i}`} className="dr-field" rows={2} value={c.text} onChange={(e) => setIn("comments", i, "text", e.target.value)} dir="auto" />
              </div>
            ))}
          {r.destination === "calendar" &&
            (p.events ?? []).map((ev: { title: string; date: string; time: string }, i: number) => (
              <div key={i} className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                <input className="dr-field" aria-label={tr("عنوان الموعد")} value={ev.title} onChange={(e) => setIn("events", i, "title", e.target.value)} dir="auto" />
                <input className="dr-field" type="date" aria-label={tr("التاريخ")} value={ev.date} onChange={(e) => setIn("events", i, "date", e.target.value)} />
              </div>
            ))}
          <div className="mt-4 flex gap-2">
            <button type="submit" className="dr-cream">
              {tr("احفظوا التعديل")}
            </button>
            <button type="button" className="dr-ghost" onClick={onClose}>
              {tr("إلغاء")}
            </button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
