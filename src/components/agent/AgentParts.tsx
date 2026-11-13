import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Check, ChevronLeft, Clock, Flag, HelpCircle, Loader2, Mic, MessageSquareText, Pause, Play, Send, ShieldCheck, Sparkles, Undo2, UserRound, X } from "lucide-react";
import clsx from "clsx";
import AgentOrb from "../ui/AgentOrb";
import AgentStreak from "./AgentStreak";
import { VoiceRecorder, canTranscribeLive } from "../../lib/voice";
import { agoLabel, canUndo, receiptLines, type NeedCard, type NeedIcon, type PlanRow, type Receipt } from "../../lib/agentPlan";
import { tr } from "../../lib/i18n";

const NEED_ICON: Record<NeedIcon, typeof HelpCircle> = { question: HelpCircle, note: MessageSquareText, calendar: CalendarDays, clock: Clock, user: UserRound, flag: Flag, proof: ShieldCheck };

export interface Person {
  id: string;
  name: string;
  initials: string;
}

export function Initial({ p, size = 28 }: { p?: Person | null; size?: number }) {
  const ch = (p?.name.trim()[0] ?? "؟").toUpperCase();
  return (
    <span aria-hidden className="ag-ini" style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {ch}
    </span>
  );
}

// ───────────── «يحتاجكم الحين» ─────────────

/** ديسكتوب: كروت تحت بعض. الجوال (ag-now-m): كروت زجاج تنسحب بالعرض على الخلفية البرتقالية */
export function NeedsList({ needs, onGo, busy }: { needs: NeedCard[]; onGo: (n: NeedCard) => void; busy: boolean }) {
  return (
    <>
      <div className="ag-sec">
        <span>{tr("يحتاجكم الحين · {0}", needs.length)}</span>
        <i aria-hidden />
      </div>
      <div className="ag-needs" role="list">
        {needs.map((n, k) => {
          const Icon = NEED_ICON[n.icon];
          return (
            <article key={n.id} role="listitem" className={clsx("ag-need ag-cas", `ag-s${k + 1}`)}>
              <div className="flex items-start gap-3">
                <span className="ag-ic" aria-hidden>
                  <Icon size={18} />
                </span>
                <div className="min-w-0 flex-1 leading-[1.5]">
                  <b className="block text-[16px] text-[#F2EBE3]">{n.title}</b>
                  <span className="ag-need-sub line-clamp-2 block text-[14px] text-[#E9D3B8]">{n.sub}</span>
                </div>
              </div>
              <div className="ag-need-foot">
                <span className="ag-pill gold">
                  <Sparkles size={12} aria-hidden /> {n.pill}
                </span>
                <span className="flex-1" />
                <button type="button" className={clsx("ag-btn", k === 0 ? "cream" : "glass")} disabled={busy} onClick={() => onGo(n)}>
                  {n.button}
                  <ChevronLeft size={15} className="ag-m-only ltr:rotate-180" aria-hidden />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

// ───────────── الخطة (AgentPlanD / AgentPlanM) ─────────────

export function PlanCard({
  rows,
  why,
  people,
  onApprove,
  running,
  today,
}: {
  rows: PlanRow[];
  why: string;
  people: Person[];
  onApprove: (picked: { row: PlanRow; ownerId: string | null; due: string | null }[]) => void;
  running: boolean;
  today: string;
}) {
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(rows.map((r) => [r.key, r.allowed])));
  const [edit, setEdit] = useState(false);
  const [owners, setOwners] = useState<Record<string, string | null>>(() => Object.fromEntries(rows.map((r) => [r.key, r.ownerId])));
  const [dues, setDues] = useState<Record<string, string | null>>(() => Object.fromEntries(rows.map((r) => [r.key, r.due])));
  const picked = rows.filter((r) => r.allowed && on[r.key]);
  const allTasks = rows.every((r) => r.action.type === "add_task");
  const blocked = rows.filter((r) => !r.allowed);
  const person = (id: string | null) => people.find((p) => p.id === id) ?? null;

  return (
    <section className="ag-plan ag-rise" aria-label={tr("الخطة")}>
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-extrabold text-[#FFB444]">{allTasks ? tr("الخطة · {0} مهام", rows.length) : tr("الخطة · {0} خطوات", rows.length)}</span>
        <span className="flex-1" />
        <span className="ag-pill dim">{tr("ما انحفظ شي للحين")}</span>
      </div>
      <ul className="m-0 mt-1 list-none p-0">
        {rows.map((r) => {
          const p = person(owners[r.key]);
          const canPick = r.allowed && !running;
          return (
            <li key={r.key} className={clsx("ag-prow", !on[r.key] && "off")}>
              <button
                type="button"
                role="switch"
                aria-checked={!!on[r.key] && r.allowed}
                aria-label={tr("ضمّنوا «{0}»", r.title)}
                disabled={!canPick}
                className="ag-switch"
                onClick={() => setOn((s) => ({ ...s, [r.key]: !s[r.key] }))}
              >
                <i aria-hidden />
              </button>
              <div className="min-w-0 flex-1 leading-[1.45]">
                <b className="line-clamp-2 block text-[15px] text-[#F2EBE3]" dir="auto">
                  {r.title}
                </b>
                <span className="block text-[12px] text-[#ABA095]">{r.allowed ? r.sub : r.blockedWhy}</span>
                {edit && r.allowed && (r.action.type === "add_task" || r.action.type === "add_event") && (
                  <span className="mt-2 flex flex-wrap gap-2">
                    {r.action.type === "add_task" && (
                      <select className="ag-field" aria-label={tr("لمين؟")} value={owners[r.key] ?? ""} onChange={(e) => setOwners((s) => ({ ...s, [r.key]: e.target.value || null }))}>
                        {people.map((m) => (
                          <option key={m.id} value={m.id} className="text-black">
                            {m.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <input type="date" className="ag-field" aria-label={tr("متى؟")} min={today} value={dues[r.key] ?? ""} onChange={(e) => setDues((s) => ({ ...s, [r.key]: e.target.value || null }))} />
                  </span>
                )}
              </div>
              {r.action.type === "add_task" && <Initial p={p} />}
            </li>
          );
        })}
      </ul>
      {why && (
        <p className="ag-why">
          <b>{tr("ليش كذا؟")}</b> {why}
        </p>
      )}
      {blocked.length > 0 && blocked.length === rows.length && <p className="m-0 mt-2 text-[13px] text-[#FF8A7A]">{tr("ما تقدرون توافقون على هالخطة: {0}. اطلبوها من القائد.", blocked[0].blockedWhy)}</p>}
      <div className="mt-3 flex items-stretch gap-2">
        <button type="button" className="ag-btn glass" disabled={running || !rows.some((r) => r.allowed)} aria-pressed={edit} onClick={() => setEdit((e) => !e)}>
          {edit ? tr("خلاص") : tr("عدّلوا")}
        </button>
        <button
          type="button"
          className="ag-go flex-1"
          disabled={running || picked.length === 0}
          onClick={() => onApprove(picked.map((row) => ({ row, ownerId: owners[row.key] ?? null, due: dues[row.key] ?? null })))}
        >
          {running ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Check size={16} aria-hidden />}
          {running ? tr("نسوّيها…") : picked.length < rows.length ? tr("وافقوا وسوّوا {0}", picked.length) : tr("وافقوا وسوّوها")}
        </button>
      </div>
    </section>
  );
}

// ───────────── الإيصال (AgentDoneD) ─────────────

export function ReceiptCard({ r, failed, onUndo, undoing }: { r: Receipt; failed: number; onUndo: () => void; undoing: boolean }) {
  const lines = receiptLines(r.items);
  const undone = !!r.undoneAt;
  const [, tick] = useState(0);
  // «قبل ثواني» يتحدّث كل دقيقة (مو حركة — تحديث نص)
  useEffect(() => {
    const t = window.setInterval(() => tick((x) => x + 1), 60_000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <section className={clsx("ag-done ag-rise", undone && "undone")} aria-label={tr("اللي انسوى")}>
      <div className="flex items-center gap-3">
        <span className="ag-seal" aria-hidden>
          {undone ? <Undo2 size={18} /> : <Check size={20} strokeWidth={3} />}
        </span>
        <div className="min-w-0 flex-1 leading-[1.35]">
          <b className="block text-[18px] text-[#F2EBE3]">{undone ? tr("تراجعنا عنها") : tr("سوّيتها")}</b>
          <span className="text-[12px] text-[#ABA095]">{tr("{0} · بموافقة {1}", agoLabel(r.createdAt), r.approvedByName)}</span>
        </div>
        {canUndo(r) && (
          <button type="button" className="ag-btn glass" disabled={undoing} onClick={onUndo} title={tr("تقدرون تتراجعون خلال 24 ساعة")}>
            {undoing ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
            {tr("تراجع")}
            <Undo2 size={15} aria-hidden />
          </button>
        )}
      </div>
      <ul className="m-0 mt-2 list-none p-0">
        {lines.map((l, k) => (
          <li key={k} className={clsx("ag-drow ag-cas", `ag-s${k + 1}`)}>
            <span className="ag-tick" aria-hidden>
              <Check size={12} strokeWidth={3} />
            </span>
            <span className={clsx("min-w-0 flex-1 truncate text-[14px] font-bold text-[#F2EBE3]", undone && "line-through opacity-60")} dir="auto">
              {l.label}
            </span>
            {!undone && (
              <Link to={l.to} className="ag-link">
                {l.place}
                <ChevronLeft size={14} className="ltr:rotate-180" aria-hidden />
              </Link>
            )}
          </li>
        ))}
        {failed > 0 && <li className="ag-drow text-[13px] text-[#FF8A7A]">{tr("{0} ما انسوت. جرّبوها مرة ثانية من الخطة.", failed)}</li>}
      </ul>
    </section>
  );
}

export function NextList({ items, onPick }: { items: string[]; onPick: (s: string) => void }) {
  if (!items.length) return null;
  return (
    <div className="ag-rise">
      <div className="mb-2 text-[12px] font-extrabold text-[#FFB444]">{tr("اللي بعده؟")}</div>
      <div className="flex flex-col gap-2">
        {items.map((s) => (
          <button key={s} type="button" className="ag-next" onClick={() => onPick(s)}>
            <Sparkles size={14} className="text-[#FFC777]" aria-hidden />
            <span className="min-w-0 flex-1 text-start">{s}</span>
            <ChevronLeft size={15} className="ltr:rotate-180" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}

// ───────────── نسمعك (AgentListenM) ─────────────

export function ListenView({ onClose, onSend }: { onClose: () => void; onSend: (text: string) => void }) {
  const rec = useRef<VoiceRecorder | null>(null);
  const [finalText, setFinal] = useState("");
  const [interim, setInterim] = useState("");
  const [level, setLevel] = useState(0);
  const [paused, setPaused] = useState(false);
  const [err, setErr] = useState<string | null>(canTranscribeLive() ? null : tr("المتصفح ما يكتب الكلام. جرّبوا كروم أو سفاري، أو اكتبوا طلبكم."));

  useEffect(() => {
    if (err) return;
    const r = new VoiceRecorder({
      onLevel: (l) => setLevel(l),
      onText: (f, i) => {
        setFinal(f);
        setInterim(i);
      },
    });
    rec.current = r;
    r.start().catch(() => setErr(tr("ما قدرنا نفتح المايك. اسمحوا للموقع يستخدمه وجرّبوا مرة ثانية.")));
    return () => r.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    if (!rec.current) return;
    if (paused) rec.current.resume();
    else rec.current.pause();
    setPaused((p) => !p);
  };
  const send = async () => {
    const r = rec.current;
    const said = r ? (await r.stop()).text : "";
    const text = (said || `${finalText} ${interim}`).trim();
    if (text) onSend(text);
    else onClose();
  };

  return (
    <div className="ag-listen" role="region" aria-label={tr("نسمعك")}>
      <button type="button" className="ag-close-pill" onClick={onClose}>
        <X size={15} aria-hidden /> {tr("سكّروا")}
      </button>
      <div className="ag-listen-orb">
        <AgentOrb size={230} state={paused ? "idle" : "thinking"} />
      </div>
      <span className="ag-pill listen">{err ? tr("المايك مو شغّال") : paused ? tr("وقّفنا") : tr("نسمعك…")}</span>
      <p className="ag-transcript" aria-live="polite">
        {err ? (
          <span className="text-[16px] font-medium text-[#F2EBE3]">{err}</span>
        ) : (
          <>
            <b>{finalText}</b> <span>{interim || (!finalText ? tr("تكلّموا… مثل «وزّع مهام الأسبوع على الفريق»") : "")}</span>
          </>
        )}
      </p>
      <span className="flex-1" />
      <div className="w-full px-2">
        <AgentStreak width={340} height={56} level={paused || err ? 0 : level} />
      </div>
      <div className="ag-listen-ctl">
        <button type="button" className="ag-round" onClick={toggle} disabled={!!err} aria-label={paused ? tr("كمّلوا") : tr("وقّفوا")}>
          {paused ? <Play size={18} aria-hidden /> : <Pause size={18} aria-hidden />}
        </button>
        <button type="button" className="ag-mic-big" onClick={toggle} disabled={!!err} aria-label={paused ? tr("كمّلوا الكلام") : tr("وقّفوا المايك")} aria-pressed={!paused}>
          <Mic size={26} aria-hidden />
        </button>
        <button type="button" className="ag-round" onClick={() => void send()} aria-label={tr("أرسلوا")}>
          <Send size={18} className="ltr:rotate-0 rtl:-scale-x-100" aria-hidden />
        </button>
      </div>
    </div>
  );
}
