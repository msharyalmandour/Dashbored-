import { useEffect, useRef, useState, type ReactNode } from "react";
import { CalendarClock, Check, ChevronDown, Loader2, Plus, Trash2, X } from "lucide-react";
import SupervisorEmailCard from "../SupervisorEmailCard";
import { formatDateFull, formatDateShort, relativeDayLabel } from "../../lib/date";
import { WEEKDAY_NAMES } from "../../lib/meetings";
import type { EmailStatus } from "../../lib/supervisorEmail";
import type { Board, BoardAvailability } from "./useSupervisorBoard";
import { tr, trx } from "../../lib/i18n";

/** «قبل 3 ساعات» / «أمس» — للنشاط وآخر تحديث، بأرقام إنجليزية */
export function relTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return "";
  const m = Math.max(0, Math.round(diff / 60_000));
  const pick = (n: number, one: string, two: string, few: string, many: string) => (n === 1 ? one : n === 2 ? two : n <= 10 ? tr(few, n) : tr(many, n));
  if (m < 2) return tr("الحين");
  if (m < 60) return pick(m, tr("قبل دقيقة"), tr("قبل دقيقتين"), "قبل {0} دقايق", "قبل {0} دقيقة");
  const h = Math.round(m / 60);
  if (h < 24) return pick(h, tr("قبل ساعة"), tr("قبل ساعتين"), "قبل {0} ساعات", "قبل {0} ساعة");
  const d = Math.round(h / 24);
  if (d === 1) return tr("أمس");
  if (d < 45) return pick(d, tr("أمس"), tr("قبل يومين"), "قبل {0} أيام", "قبل {0} يوم");
  return formatDateShort(iso.slice(0, 10));
}

const AV_BG = ["linear-gradient(135deg,#FFD9A8,#FF9A3C)", "linear-gradient(135deg,#FFE7C2,#FFB547)", "linear-gradient(135deg,#F7C9A8,#E9774A)", "linear-gradient(135deg,#F2EBE3,#C9B8A6)"];
export function SvAvatar({ name, initials, i, active, sm }: { name: string; initials?: string; i: number; active?: boolean | null; sm?: boolean }) {
  const letter = (initials || name).trim().charAt(0) || "؟";
  return (
    <span className={`sv-av${sm ? " sm" : ""}`} style={{ background: AV_BG[i % AV_BG.length] }} aria-hidden>
      {letter}
      {active !== undefined && active !== null && <i className={active ? "on" : ""} />}
    </span>
  );
}

/** Bottom sheet: يطلع من تحت بالجوال، وبالكمبيوتر بعرض العمود نفسه. Esc أو الضغط برا يقفله. */
export function SvSheet({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <>
      <div className="sv-scrim" onClick={onClose} aria-hidden />
      <div ref={ref} role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined} tabIndex={-1} className="sv-sheet sv-sheet-in outline-none" dir="rtl">
        <div className="sv-grab" aria-hidden />
        <div className="sv-sh">
          <h2>{title}</h2>
          <button onClick={onClose} className="sv-x" aria-label={tr("إغلاق")}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

// ───────────────────────────── «تنتظركم» ─────────────────────────────

interface WaitingProps {
  board: Board;
  busy: string | null;
  error: string | null;
  leaving: string[];
  /** ينفّذ الرد ويخفي الكرت بحركة ناعمة ويطلع toast */
  respond: (key: string, fn: string, args: Record<string, unknown>, toast: string) => Promise<boolean>;
}

export function SvWaiting({ board, busy, error, leaving, respond }: WaitingProps) {
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [decisionNote, setDecisionNote] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const { minutes, decisions, bookings } = board.waiting;
  const empty = minutes.length + decisions.length + bookings.length === 0;
  const spin = (id: string) => busy === id && <Loader2 size={15} className="animate-spin" />;
  const back = () => {
    setNoteFor(null);
    setNote("");
  };

  if (empty) {
    return (
      <p className="sv-ok">
        <Check size={16} strokeWidth={3} />
        {tr("ما ينتظركم شي الحين ✓")}
      </p>
    );
  }

  return (
    <div className="sv-stack">
      {error && (
        <p role="alert" className="sv-err !mt-0">
          {error}
        </p>
      )}
      {minutes.map((m) => {
        const hours = Math.max(0, Math.ceil((new Date(m.autoApprovesAt).getTime() - Date.now()) / 3600_000));
        const commenting = noteFor === m.id;
        return (
          <article key={m.id} className={`sv-req${leaving.includes(m.id) ? " leaving" : ""}`}>
            <p className="sv-kind m-0">
              {tr("محضر اجتماع")} <span>· {trx("يُعتمد تلقائيًا بعد {0} ساعة", hours)}</span>
            </p>
            <h3 className="sv-req-t">{trx("اجتماع {0}", formatDateFull(m.meetingDate))}</h3>
            <p className="sv-req-d">{m.discussion}</p>
            <button className="sv-more" onClick={() => setOpen((o) => ({ ...o, [m.id]: !o[m.id] }))} aria-expanded={!!open[m.id]}>
              {open[m.id] ? tr("إخفاء المحضر") : tr("اقرأ المحضر كامل")}
              <ChevronDown size={14} className={`transition-transform ${open[m.id] ? "rotate-180" : ""}`} />
            </button>
            {open[m.id] && (
              <div className="sv-detail">
                {m.attendees.length > 0 && <div className="text-[13px] text-[#ABA095]">{trx("الحاضرون: {0}", m.attendees.join(tr("، ")))}</div>}
                {m.agenda && <div className="mt-1 text-[13px] text-[#ABA095]">{m.agenda}</div>}
                <div className="mt-2">{m.discussion}</div>
                {m.decisions && (
                  <div className="mt-2">
                    <b className="text-[#F2EBE3]">{tr("القرارات:")}</b> {m.decisions}
                  </div>
                )}
                {m.actions.length > 0 && (
                  <ul className="m-0 mt-2 list-none space-y-1 p-0">
                    {m.actions.map((a, i) => (
                      <li key={i}>
                        • {a.text} <span className="text-[12px] text-[#ABA095]">— {a.assigneeName ?? "—"}{a.dueDate ? ` · ${formatDateShort(a.dueDate)}` : ""}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {commenting ? (
              <div className="mt-3">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} placeholder={tr("وش التعديل المطلوب؟")} aria-label={tr("التعديل المطلوب")} className="sv-in" />
                <div className="sv-btns">
                  <button className="sv-btn pri" disabled={!note.trim() || busy === m.id} onClick={() => respond(m.id, "supervisor_resolve_minutes", { p_minutes_id: m.id, p_decision: "changes_requested", p_note: note }, tr("انرسل تعليقكم ✓")).then((ok) => ok && back())}>
                    {spin(m.id)}
                    {tr("أرسلوا التعليق")}
                  </button>
                  <button className="sv-btn ghost" onClick={back}>
                    {tr("رجوع")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="sv-btns">
                <button className="sv-btn pri" disabled={busy === m.id} onClick={() => respond(m.id, "supervisor_resolve_minutes", { p_minutes_id: m.id, p_decision: "approved", p_note: "" }, tr("تم الاعتماد ✓"))}>
                  {spin(m.id)}
                  {tr("اعتمد")}
                </button>
                <button className="sv-btn ghost" onClick={() => { setNoteFor(m.id); setNote(""); }}>
                  {tr("علّق")}
                </button>
              </div>
            )}
          </article>
        );
      })}

      {decisions.map((d) => {
        const choice = picked[d.id];
        return (
          <article key={d.id} className={`sv-req${leaving.includes(d.id) ? " leaving" : ""}`}>
            <p className="sv-kind m-0">
              {tr("قرار")}
              {d.neededBy && <span> · {trx("مطلوب قبل {0} ({1})", formatDateShort(d.neededBy), relativeDayLabel(d.neededBy))}</span>}
            </p>
            <h3 className="sv-req-t">{d.question}</h3>
            <p className="sv-req-d">{tr("اختاروا واحد — يوصل الفريق ردّكم على طول.")}</p>
            <div className={`sv-btns${d.options.length > 2 ? " many" : ""}`}>
              {d.options.map((o, i) => (
                <button key={i} aria-pressed={choice === i} className={`sv-btn ${choice === undefined && i === 0 && d.options.length <= 2 ? "pri" : "ghost"}`} onClick={() => setPicked((p) => ({ ...p, [d.id]: i }))}>
                  {o}
                </button>
              ))}
            </div>
            {choice !== undefined && (
              <div className="mt-3">
                <input value={decisionNote[d.id] ?? ""} onChange={(e) => setDecisionNote((p) => ({ ...p, [d.id]: e.target.value }))} maxLength={1000} placeholder={tr("ملاحظة (اختياري)")} aria-label={tr("ملاحظة على القرار")} className="sv-in" />
                <div className="sv-btns">
                  <button className="sv-btn pri" disabled={busy === d.id} onClick={() => respond(d.id, "supervisor_answer_decision", { p_id: d.id, p_choice: choice, p_note: decisionNote[d.id] ?? "" }, tr("انرسل قراركم ✓"))}>
                    {spin(d.id)}
                    {trx("تأكيد: {0}", d.options[choice])}
                  </button>
                  <button className="sv-btn ghost" onClick={() => setPicked((p) => { const n = { ...p }; delete n[d.id]; return n; })}>
                    {tr("رجوع")}
                  </button>
                </div>
              </div>
            )}
          </article>
        );
      })}

      {bookings.map((b) => {
        const declining = noteFor === b.id;
        return (
          <article key={b.id} className={`sv-req${leaving.includes(b.id) ? " leaving" : ""}`}>
            <p className="sv-kind m-0">
              {tr("طلب موعد")} <span>· {relativeDayLabel(b.date)}</span>
            </p>
            <h3 className="sv-req-t">
              {formatDateFull(b.date)} · <span className="sv-num">{b.time}</span>
            </h3>
            <p className="sv-req-d">{b.note ? trx("{0} دقيقة · {1}", b.durationMin, b.note) : trx("{0} دقيقة", b.durationMin)}</p>
            {declining ? (
              <div className="mt-3">
                <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={tr("اقترحوا وقت ثاني (اختياري)")} aria-label={tr("الوقت البديل")} className="sv-in" />
                <div className="sv-btns">
                  <button className="sv-btn pri" disabled={busy === b.id} onClick={() => respond(b.id, "supervisor_respond_booking", { p_id: b.id, p_decision: "decline", p_note: note }, tr("انرسل ردّكم ✓")).then((ok) => ok && back())}>
                    {spin(b.id)}
                    {tr("أرسلوا")}
                  </button>
                  <button className="sv-btn ghost" onClick={back}>
                    {tr("رجوع")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="sv-btns">
                <button className="sv-btn pri" disabled={busy === b.id} onClick={() => respond(b.id, "supervisor_respond_booking", { p_id: b.id, p_decision: "confirm", p_note: "" }, tr("تم تأكيد الموعد ✓"))}>
                  {spin(b.id)}
                  {tr("قبول")}
                </button>
                <button className="sv-btn ghost" onClick={() => { setNoteFor(b.id); setNote(""); }}>
                  {tr("وقت ثاني")}
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

// ───────────────────────────── «جهّزوا صفحتكم» ─────────────────────────────

export function SvSetupStrip({ nameDone, emailDone, timesDone, onOpen }: { nameDone: boolean; emailDone: boolean; timesDone: boolean; onOpen: () => void }) {
  const all = nameDone && emailDone && timesDone;
  const part = (done: boolean, label: string) => (done ? <b>{label} ✓</b> : label);
  return (
    <button className="sv-setup" onClick={onOpen} aria-haspopup="dialog">
      <span className="min-w-0">
        <span className="t block">{all ? tr("صفحتكم جاهزة") : tr("جهّزوا صفحتكم")}</span>
        <span className="s block">
          {part(nameDone, tr("اسمكم"))} · {part(emailDone, tr("الإيميل"))} · {part(timesDone, tr("أوقاتكم"))}
        </span>
      </span>
      <span className="sv-dots" aria-label={tr("{0} من 3", [nameDone, emailDone, timesDone].filter(Boolean).length)}>
        <i className={nameDone ? "on" : ""} />
        <i className={emailDone ? "on" : ""} />
        <i className={timesDone ? "on" : ""} />
      </span>
    </button>
  );
}

interface WindowRow { key: number; weekday: number; start: string; end: string }
let winKey = 0;

/** الخطوات الثلاث (الاسم، إيميل التنبيهات، الأوقات) ومعها «أوقاتي وتفضيلاتي» كاملة — كلها داخل نفس الـ sheet */
export function SvSetupSheet({
  token,
  name,
  onNameChange,
  email,
  onEmailChanged,
  availability,
  busy,
  error,
  save,
  onClose,
}: {
  token: string;
  name: string;
  onNameChange: (v: string) => void;
  email: EmailStatus | null;
  onEmailChanged: () => void;
  availability: BoardAvailability | null;
  busy: string | null;
  error: string | null;
  save: (av: { windows: { weekday: number; start: string; end: string }[]; slot: number; auto: boolean; replyDays: string; note: string }) => Promise<boolean>;
  onClose: () => void;
}) {
  const [windows, setWindows] = useState<WindowRow[]>(() => (availability?.windows ?? []).map((w) => ({ key: winKey++, ...w })));
  const [slot, setSlot] = useState(availability?.slotMinutes ?? 30);
  const [auto, setAuto] = useState(availability?.autoConfirm ?? true);
  const [replyDays, setReplyDays] = useState(availability?.replyDays ? String(availability.replyDays) : "");
  const [avNote, setAvNote] = useState(availability?.note ?? "");
  const [saved, setSaved] = useState(false);
  const nameDone = name.trim().length > 0;
  const emailDone = email?.state === "active";
  const timesDone = !!availability?.windows.length;

  return (
    <SvSheet title={tr("جهّزوا صفحتكم")} onClose={onClose}>
      <p className="sv-sd !mt-0 mb-5">{tr("من هالصفحة تعتمدون المحاضر، وتجاوبون على قرارات الفريق، وتأكدون المواعيد — كله بضغطة وبدون حساب.")}</p>
      <ol className="m-0 list-none p-0">
        <li className="sv-step">
          <span className={`sv-sn${nameDone ? " done" : ""}`}>{nameDone ? <Check size={14} strokeWidth={3} /> : "1"}</span>
          <div className="min-w-0 flex-1">
            <p className="sv-st m-0">{tr("اسمكم")}</p>
            <p className="sv-sd m-0">{tr("يظهر للفريق لما تردّون عليهم (مثل: د. نورة).")}</p>
            <input value={name} onChange={(e) => onNameChange(e.target.value)} maxLength={80} placeholder={tr("اسمكم — مثل: د. نورة")} aria-label={tr("اسمكم")} className="sv-in mt-2.5" />
          </div>
        </li>
        <li className="sv-step">
          <span className={`sv-sn${emailDone ? " done" : ""}`}>{emailDone ? <Check size={14} strokeWidth={3} /> : "2"}</span>
          <div className="min-w-0 flex-1">
            <p className="sv-st m-0">{tr("إيميلكم للتنبيهات")}</p>
            <p className="sv-sd m-0">{tr("كل ما أرسل الفريق محضر أو قرار أو طلب موعد يوصلكم إيميل برابط مباشر. ما نرسل شي قبل ما تأكدونه.")}</p>
            <div className="mt-2.5">
              {emailDone ? (
                <p className="sv-ok m-0">
                  <Check size={15} strokeWidth={3} />
                  {tr("مفعّلة على ")}
                  <b dir="ltr">{email?.emailMasked}</b>
                </p>
              ) : (
                <SupervisorEmailCard token={token} onChanged={onEmailChanged} embedded glass />
              )}
            </div>
          </div>
        </li>
        <li className="sv-step">
          <span className={`sv-sn${timesDone ? " done" : ""}`}>{timesDone ? <Check size={14} strokeWidth={3} /> : "3"}</span>
          <div className="min-w-0 flex-1">
            <p className="sv-st m-0">{tr("أوقاتكم وتفضيلاتكم")}</p>
            <p className="sv-sd m-0">{tr("حدّدوها مرة وحدة، والفريق يحجز منها بضغطة بدل رسائل الأخذ والرد. ما ينحجز شي خارجها.")}</p>
            <ul className="m-0 mt-2.5 list-none space-y-2 p-0">
              {windows.map((w) => (
                <li key={w.key} className="grid grid-cols-[1fr_1fr_44px] items-center gap-1.5 rounded-2xl bg-white/[.03] p-1.5">
                  <select value={w.weekday} onChange={(e) => setWindows((x) => x.map((y) => (y.key === w.key ? { ...y, weekday: Number(e.target.value) } : y)))} aria-label={tr("يوم الأسبوع")} className="sv-in col-span-2 !px-2.5">
                    {WEEKDAY_NAMES.map((n, i) => (
                      <option key={n} value={i}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => setWindows((x) => x.filter((y) => y.key !== w.key))} aria-label={tr("حذف")} className="grid h-11 w-11 place-items-center rounded-full text-[#ABA095] hover:text-[#FF9A8A]">
                    <Trash2 size={16} />
                  </button>
                  <input type="time" value={w.start} onChange={(e) => setWindows((x) => x.map((y) => (y.key === w.key ? { ...y, start: e.target.value } : y)))} aria-label={tr("من")} className="sv-in !px-2.5" />
                  <input type="time" value={w.end} onChange={(e) => setWindows((x) => x.map((y) => (y.key === w.key ? { ...y, end: e.target.value } : y)))} aria-label={tr("إلى")} className="sv-in !px-2.5" />
                </li>
              ))}
            </ul>
            <button onClick={() => setWindows((x) => [...x, { key: winKey++, weekday: 0, start: "10:00", end: "12:00" }])} disabled={windows.length >= 14} className="sv-more !mt-2 disabled:opacity-40">
              <Plus size={14} />
              {tr("أضيفوا وقت")}
            </button>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-[13px] font-bold text-[#ABA095]">
                {tr("مدة الاجتماع")}
                <select value={slot} onChange={(e) => setSlot(Number(e.target.value))} className="sv-in mt-1">
                  {[15, 20, 30, 45, 60].map((m) => (
                    <option key={m} value={m}>
                      {trx("{0} دقيقة", m)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-[13px] font-bold text-[#ABA095]">
                {tr("أرد عادةً خلال (أيام)")}
                <input type="number" min={1} max={30} value={replyDays} onChange={(e) => setReplyDays(e.target.value)} placeholder={tr("مثال: 3")} className="sv-in mt-1" />
              </label>
            </div>
            <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-[14px]">
              <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="mt-1 h-4 w-4 accent-[#FF9A3C]" />
              <span>
                <b>{tr("أكّد الحجز تلقائيًا")}</b> <span className="text-[13px] text-[#ABA095]">{tr("— لو اختار الفريق وقت من أوقاتكم يتأكد على طول.")}</span>
              </span>
            </label>
            <input value={avNote} onChange={(e) => setAvNote(e.target.value)} maxLength={300} placeholder={tr("ملاحظة للفريق (اختياري): مثل «أفضّل الرسائل الصباحية»")} aria-label={tr("ملاحظة للفريق")} className="sv-in mt-3" />
            {error && <p className="sv-err">{error}</p>}
            <button
              className="sv-btn pri mt-3 w-full"
              disabled={busy === "availability"}
              onClick={async () => {
                const ok = await save({ windows: windows.map(({ weekday, start, end }) => ({ weekday, start, end })), slot, auto, replyDays, note: avNote });
                if (ok) {
                  setSaved(true);
                  setTimeout(() => setSaved(false), 2500);
                }
              }}
            >
              {busy === "availability" ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <CalendarClock size={15} />}
              {saved ? tr("انحفظت") : tr("احفظوا أوقاتكم")}
            </button>
          </div>
        </li>
      </ol>
    </SvSheet>
  );
}
