import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import Avatar from "../ui/Avatar";
import { tr } from "../../lib/i18n";
import { formatDateShort } from "../../lib/date";
import { remainingLabel, statusLabel, wordDiff, type Commitment, type DiffPart } from "../../lib/commitments";

/* أجزاء «كلام الدكتورة يصير التزامات» — القيم من design-reference/supervisor (SupRequest/SupReceipt/SupStates) */

const I = {
  spark: (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    </svg>
  ),
  starFill: (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.6l5.8-.8z" />
    </svg>
  ),
  starLine: (size = 12) => (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.6l5.8-.8z" />
    </svg>
  ),
  msg: (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h16v11h-7l-5 4v-4H4z" />
      <path d="M8 10h8" />
    </svg>
  ),
  cal: (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="15" rx="3" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </svg>
  ),
  check: (
    <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1A0802" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  ),
  doc: (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3h7l5 5v13H7z" />
      <path d="M14 3v5h5M10 13h6M10 17h4" />
    </svg>
  ),
  pen: (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20l4-1 11-11-3-3L5 16z" />
    </svg>
  ),
  info: (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16v.5" />
    </svg>
  ),
};
export const SupIcons = I;

/** صورة الدكتورة: حرفها الأول على كريمي بحلقة ذهبية 1.5px */
export function DocAvatar({ name, px = 32 }: { name: string; px?: number }) {
  const letter = (name.replace(/^د\.?\s*/, "").trim()[0] ?? "د").toUpperCase();
  return (
    <span aria-hidden className="sup-av doc" style={{ width: px, height: px, fontSize: px >= 30 ? 14 : px >= 26 ? 12 : 10 }}>
      {letter}
    </span>
  );
}

/** رسالة الدكتورة داخل محادثة الفريق (فقاعة ذهبية + شارة «الدكتورة») */
export function DocBubble({ name, body, time }: { name: string; body: string; time: string }) {
  return (
    <div className="flex max-w-[88%] items-end gap-2.5" style={{ animation: "none" }}>
      <DocAvatar name={name} />
      <div className="sup-docmsg">
        <div className="flex items-center gap-1.5">
          <b className="text-[13px] text-[#FFC777]">{name}</b>
          <span className="rounded-full px-2 py-px text-[12px] font-bold text-[#FFC777]" style={{ background: "rgba(255,199,119,0.16)" }}>
            {tr("الدكتورة")}
          </span>
        </div>
        <div className="mt-1 whitespace-pre-wrap text-[15px] text-[#EAE3DC]" dir="auto">
          {body}
        </div>
        <div className="mt-1 text-[12px] text-[#ABA095]" dir="ltr">
          {time}
        </div>
      </div>
    </div>
  );
}

/** الخيط الذهبي من رسالتها للكرت (يرسم نفسه مرة وحدة) */
export function Thread() {
  return (
    <svg aria-hidden="true" width="40" height="44" viewBox="0 0 40 44" className="-mb-1 -mt-2 ms-1 block md:hidden">
      <defs>
        <linearGradient id="sup-gth" x1="0" x2="1">
          <stop offset="0" stopColor="#FFC777" />
          <stop offset="1" stopColor="#FF7A1A" />
        </linearGradient>
      </defs>
      <path className="sup-thread" style={{ ["--len" as string]: 50 }} d="M 20 4 C 20 20, 20 26, 20 42" fill="none" stroke="url(#sup-gth)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="4" r="3.5" fill="#FFC777" />
    </svg>
  );
}

/** على الشاشة العريضة: الخيط ينزل من طرف رسالتها وينحني لجنب الكرت (مثل SupRequestD) */
export function SideThread() {
  return (
    <svg aria-hidden="true" width="34" height="150" viewBox="0 0 34 150" className="pointer-events-none absolute -top-[86px] hidden ltr:-scale-x-100 md:block" style={{ insetInlineEnd: -40 }}>
      <path className="sup-thread" style={{ ["--len" as string]: 160 }} d="M 28 4 C 28 70, 6 96, 6 146" fill="none" stroke="url(#sup-gth2)" strokeWidth="2" strokeLinecap="round" />
      <defs>
        <linearGradient id="sup-gth2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FFC777" />
          <stop offset="1" stopColor="#FF7A1A" />
        </linearGradient>
      </defs>
      <circle cx="28" cy="4" r="3.5" fill="#FFC777" />
    </svg>
  );
}

interface Member {
  id: string;
  name: string;
  avatar?: string | null;
}
const first = (n: string) => n.trim().split(/\s+/)[0] ?? n;

/** «طلعنا منها مهمة»: يطلع تحت رسالتها — القائد يعتمد (مهمة «من الدكتورة») أو يعدّل أو «مو مهمة» */
export function RequestCard({
  c,
  members,
  isLeader,
  canWrite,
  busy,
  onApprove,
  onDismiss,
  onStar,
}: {
  c: Commitment;
  members: Member[];
  isLeader: boolean;
  canWrite: boolean;
  busy?: boolean;
  onApprove: (patch: { title: string; assignee: string | null; due: string | null }) => void;
  onDismiss: () => void;
  onStar: (v: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(c.title);
  const [who, setWho] = useState<string | null>(c.assignee_id);
  const [due, setDue] = useState<string>(c.due_at ? c.due_at.slice(0, 10) : "");
  const recurring = !!c.recurring_rule;
  const isPromise = c.direction === "to_team";

  if (isPromise) {
    return (
      <article className="sup-glass sup-crystal" aria-label={tr("وعد من الدكتورة")} style={{ borderRadius: 22, padding: 14 }}>
        <div className="flex items-center gap-2.5">
          <span className="sup-ic gold">{I.spark}</span>
          <div className="min-w-0 flex-1 leading-[1.35]">
            <div className="text-[12px] font-bold text-[#FFB444]">{tr("وعد من الدكتورة")}</div>
            <div className="text-[15px] font-extrabold text-[#EAE3DC]" dir="auto">
              {c.title}
            </div>
          </div>
          <span className="text-[12px] text-[#ABA095]">{c.due_label || (c.due_at ? formatDateShort(c.due_at.slice(0, 10)) : "")}</span>
        </div>
        <div className="mt-1.5 text-[12px] text-[#ABA095]">{tr("ينضاف لسجل الوعود · نذكّركم بلطف لو تأخر")}</div>
      </article>
    );
  }

  if (c.status !== "proposed") {
    const s = statusLabel(c);
    const owner = members.find((m) => m.id === c.assignee_id);
    return (
      <article className="sup-glass" aria-label={tr("طلب الدكتورة")} style={{ borderRadius: 22, padding: 14 }}>
        <div className="flex items-center gap-2.5">
          <span className="sup-ic gold">{I.spark}</span>
          <div className="min-w-0 flex-1 leading-[1.35]">
            <div className="text-[12px] font-bold text-[#FFB444]">{tr("صارت مهمة")}</div>
            <div className="truncate text-[15px] font-extrabold" dir="auto">
              {c.title}
            </div>
          </div>
          {c.important && <span className="text-[#FFC777]">{I.starLine(14)}</span>}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
          {owner && (
            <span className="flex items-center gap-1.5">
              <Avatar initials="" name={owner.name} avatar={owner.avatar ?? undefined} px={24} ring="#1A120E" />
              {first(owner.name)}
            </span>
          )}
          <span className={s.tone === "gold" ? "font-bold text-[#FFC777]" : s.tone === "warm" ? "font-bold text-[#FFB65C]" : "font-bold text-[#ABA095]"}>{s.text}</span>
          <span className="flex-1" />
          {c.created_task_id && (
            <Link to={`/tasks?task=${c.created_task_id}`} className="inline-flex min-h-[44px] items-center font-bold text-[#FFC777]">
              {tr("افتحوا المهمة")}
            </Link>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="sup-glass sup-req sup-crystal sup-sheen" aria-label={tr("طلب من الدكتورة")}>
      <div className="flex items-center gap-2.5">
        <span className="sup-ic gold">{I.spark}</span>
        <div className="min-w-0 flex-1 leading-[1.35]">
          <div className="text-[12px] font-bold text-[#FFB444]">{tr("طلعنا منها مهمة")}</div>
          {editing ? (
            <input
              className="mt-0.5 w-full rounded-[10px] border-0 bg-white/[.06] px-2 py-1 text-[17px] font-extrabold text-[#EAE3DC] outline-none focus:ring-2 focus:ring-[#FFC777]"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label={tr("عنوان المهمة")}
              autoFocus
              dir="auto"
            />
          ) : (
            <div className="text-[17px] font-extrabold text-[#EAE3DC]" dir="auto">
              {title}
            </div>
          )}
        </div>
        <button type="button" className="sup-star" aria-pressed={c.important} aria-label={tr("مهم عند الدكتورة")} disabled={!canWrite} onClick={() => onStar(!c.important)}>
          {c.important ? I.starFill : I.starLine(20)}
        </button>
      </div>
      <div className="mb-1 mt-2.5 flex flex-wrap gap-1.5">
        <span className="sup-chip gold">
          {I.msg} {tr("من الدكتورة")}
        </span>
        {c.important && (
          <span className="sup-chip gold">
            {I.starLine(12)} {tr("مهم عند الدكتورة")}
          </span>
        )}
        {recurring && <span className="sup-chip">{tr("متكررة")}</span>}
      </div>
      <div className="sup-lbl" id={`who-${c.id}`}>
        {tr("لمين؟")}
      </div>
      <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-labelledby={`who-${c.id}`}>
        {members.map((m) => (
          <button key={m.id} type="button" className="sup-who" aria-pressed={who === m.id} disabled={!isLeader || !canWrite} onClick={() => setWho(who === m.id ? null : m.id)}>
            <Avatar initials="" name={m.name} avatar={m.avatar ?? undefined} px={28} ring="#1A120E" />
            {first(m.name)}
          </button>
        ))}
      </div>
      <div className="sup-lbl">{tr("متى؟")}</div>
      {recurring || !isLeader ? (
        <div className="sup-when">
          {I.cal}
          <span className="flex-1">{c.due_label || (c.due_at ? formatDateShort(c.due_at.slice(0, 10)) : tr("بدون موعد محدد"))}</span>
        </div>
      ) : (
        <label className="sup-when">
          {I.cal}
          <span className="sr-only">{tr("الموعد")}</span>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          {c.due_label && <span className="text-[12px] text-[#ABA095]">{c.due_label}</span>}
        </label>
      )}
      {isLeader ? (
        <>
          <div className="mt-3 flex gap-2">
            <button type="button" className="sup-btn-primary" disabled={busy || !canWrite || !title.trim()} onClick={() => onApprove({ title: title.trim(), assignee: who, due: due || null })}>
              {I.check}
              {tr("اعتمدوها")}
            </button>
            <button type="button" className="sup-btn-cream" disabled={busy || !canWrite} onClick={() => setEditing((v) => !v)} aria-pressed={editing}>
              {editing ? tr("خلاص") : tr("عدّلوا")}
            </button>
            <button type="button" className="sup-btn-ghost" disabled={busy || !canWrite} onClick={onDismiss}>
              {tr("مو مهمة")}
            </button>
          </div>
          <div className="mt-2 text-center text-[12px] text-[#ABA095]">{tr("للقائد بس · الدكتورة تشوفها «تحت التنفيذ» أول ما تعتمدونها")}</div>
        </>
      ) : (
        <div className="mt-3 text-center text-[13px] text-[#ABA095]">{tr("تنتظر اعتماد القائد")}</div>
      )}
    </article>
  );
}

/** حالات الكرت/السجل: فاضي · تحميل · خطأ (يخفت، ما يحمّر) */
export function SupState({ kind, title, sub, onRetry }: { kind: "empty" | "loading" | "error"; title?: string; sub?: string; onRetry?: () => void }) {
  if (kind === "loading")
    return (
      <div className="sup-glass flex flex-col gap-2.5" role="status" aria-label={tr("نحمّل…")}>
        <div className="sup-skel w-3/5" />
        <div className="sup-skel w-4/5" style={{ height: 10 }} />
        <div className="sup-skel w-full" style={{ height: 40, borderRadius: 14 }} />
      </div>
    );
  if (kind === "error")
    return (
      <div className="sup-glass sup-dim" role="alert">
        <div className="flex items-center gap-1.5 text-[14px] text-[#E9D3B8]">
          {I.info}
          {title}
        </div>
        {onRetry && (
          <button type="button" className="sup-btn-cream mt-3 w-full" onClick={onRetry}>
            {tr("جربوا مرة ثانية")}
          </button>
        )}
      </div>
    );
  return (
    <div className="sup-glass text-center">
      <b className="block text-[15px]">{title}</b>
      {sub && <p className="m-0 mt-1 text-[13px] text-[#E9D3B8]">{sub}</p>}
    </div>
  );
}

export interface LedgerRow {
  id: string;
  direction: "from_supervisor" | "to_team";
  title: string;
  important: boolean;
  status: Commitment["status"];
  receipt_sent_at: string | null;
  receipt_ack_at: string | null;
  due_at: string | null;
  due_label: string;
  owner?: { name: string; avatar?: string | null } | null;
}

/** سجل الوعود: «طلبات الدكتورة منكم» و«وعود الدكتورة لكم» */
export function Ledger({ rows, docName, action }: { rows: LedgerRow[]; docName: string; action?: (r: LedgerRow) => ReactNode }) {
  const reqs = rows.filter((r) => r.direction === "from_supervisor");
  const proms = rows.filter((r) => r.direction === "to_team");
  return (
    <section className="sup-glass" aria-labelledby="sup-ledger-h">
      <div className="flex items-center gap-2.5">
        <span className="sup-ic">{I.doc}</span>
        <b id="sup-ledger-h" className="flex-1 text-[17px]">
          {tr("سجل الوعود")}
        </b>
        <span className="rounded-full px-2.5 py-[3px] text-[12px] font-extrabold text-[#FFC777]" style={{ background: "rgba(255,199,119,0.14)" }}>
          {tr("{0} طلبات · {1} وعود", reqs.length, proms.length)}
        </span>
      </div>
      {!rows.length ? (
        <p className="m-0 mt-3 text-center text-[13px] text-[#E9D3B8]">
          <b className="mb-1 block text-[15px] text-[#EAE3DC]">{tr("السجل فاضي")}</b>
          {tr("طلبات الدكتورة ووعودها بتتجمع هنا")}
        </p>
      ) : (
        <>
          {reqs.length > 0 && <div className="sup-sec">{tr("طلبات الدكتورة منكم")}</div>}
          {reqs.map((r) => {
            const s = statusLabel(r);
            return (
              <div key={r.id} className="sup-row">
                {action ? null : r.important ? <span className="text-[#FFC777]">{I.starLine(14)}</span> : <span style={{ width: 14 }} aria-hidden />}
                <span className="min-w-0 flex-1 text-[14px] font-bold" dir="auto">
                  {r.title}
                </span>
                <span className="whitespace-nowrap text-[12px] font-bold" style={{ color: s.tone === "gold" ? "#FFC777" : s.tone === "warm" ? "#FFB65C" : "#ABA095" }}>
                  {s.text}
                </span>
                {r.owner ? <Avatar initials="" name={r.owner.name} avatar={r.owner.avatar ?? undefined} px={24} ring="#1A120E" /> : <span style={{ width: 24 }} aria-hidden />}
                {action?.(r)}
              </div>
            );
          })}
          {proms.length > 0 && <div className="sup-sec" style={{ marginTop: 14 }}>{tr("وعود الدكتورة لكم")}</div>}
          {proms.map((r) => (
            <div key={r.id} className="sup-row">
              <DocAvatar name={docName} px={24} />
              <span className="min-w-0 flex-1 text-[14px] font-bold" dir="auto">
                {r.title}
              </span>
              <span className="text-[12px] text-[#EAE3DC]">{r.due_label || (r.due_at ? formatDateShort(r.due_at.slice(0, 10)) : "")}</span>
              <span className="text-[12px] text-[#ABA095]">{r.status === "done" ? tr("تمّ ✓") : remainingLabel(r.due_at)}</span>
              {action?.(r)}
            </div>
          ))}
        </>
      )}
    </section>
  );
}

/** «خيط الالتزام»: كروت الزجاج والخيط الذهبي */
export function ThreadExplainer() {
  return (
    <section className="sup-glass flex items-center gap-3.5">
      <div className="sup-obj" role="img" aria-label={tr("كروت زجاج وخيط ذهبي")} style={{ width: 110, height: 110, flex: "none" }}>
        <img src="/sup/glass.jpg" alt="" width={110} height={110} />
      </div>
      <div className="text-[14px] leading-[1.7] text-[#E9D3B8]">
        <b className="block text-[#EAE3DC]">{tr("خيط الالتزام")}</b>
        {tr("كل طلب من الدكتورة ينربط بخيط ذهبي: رسالتها ← المهمة ← الإيصال.")}
      </div>
    </section>
  );
}

/** الإيصال: الختم الذهبي + «طلبك خلص ✓» + الطلب الأصلي + مين خلّصه ومتى + الملف + «تمام» */
export function ReceiptCard({
  teamName,
  quote,
  who,
  when,
  timing,
  file,
  acked,
  busy,
  onOk,
  onNote,
  onOpenFile,
}: {
  teamName: string;
  quote: string;
  who: string;
  when: string;
  timing: string;
  file?: { name: string } | null;
  acked: boolean;
  busy?: boolean;
  onOk: () => void;
  onNote: () => void;
  onOpenFile?: () => void;
}) {
  return (
    <section className="sup-glass" style={{ borderRadius: 28, padding: "14px 16px 18px" }} aria-labelledby="sup-rcpt-h">
      <div className="flex flex-col items-center text-center">
        <div className="sup-seal">
          <div className="sup-obj" role="img" aria-label={tr("ختم ذهبي")} style={{ width: 170, height: 170, flex: "none" }}>
            <img src="/sup/seal.jpg" alt="" width={170} height={170} />
          </div>
        </div>
        <div className="-mt-2 text-[12px] font-bold tracking-[.06em] text-[#FFB444]">{tr("إيصال إنجاز · {0}", teamName)}</div>
        <h2 id="sup-rcpt-h" className="mb-0.5 mt-1 bg-gradient-to-b from-[#FFF6EC] to-[#E9C9A0] bg-clip-text text-[30px] font-extrabold text-transparent">
          {tr("طلبك خلص ✓")}
        </h2>
        <p className="m-0 text-[15px] text-[#EAE3DC]" dir="auto">
          «{quote}»
        </p>
        <p className="mb-3.5 mt-1 text-[13px] text-[#ABA095]">{[tr("خلّصه {0}", who), when, timing].filter(Boolean).join(" · ")}</p>
      </div>
      {file && (
        <div className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5" style={{ background: "rgba(0,0,0,0.25)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}>
          <span aria-hidden className="relative flex h-[35px] w-[30px] flex-none items-end justify-center rounded-lg pb-[5px] text-[11px] font-extrabold text-[#3A1A08]" style={{ background: "linear-gradient(180deg,#F6EFE7,#E2D6C9)", boxShadow: "0 6px 14px rgba(0,0,0,0.4)" }} dir="ltr">
            {(file.name.split(".").pop() || "FILE").slice(0, 4).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1 leading-[1.35]">
            <div className="truncate text-[13px] font-bold" dir="auto">
              {file.name}
            </div>
          </div>
          {onOpenFile && (
            <button type="button" className="flex min-h-[44px] items-center border-0 bg-transparent font-[inherit] text-[13px] font-bold text-[#FFC777]" onClick={onOpenFile}>
              {tr("افتحوه")}
            </button>
          )}
        </div>
      )}
      {acked ? (
        <p className="m-0 mt-3 text-center text-[14px] font-bold text-[#FFC777]" role="status">
          {tr("وصلنا «تمام» ✓")}
        </p>
      ) : (
        <div className="mt-3 flex gap-2">
          <button type="button" className="sup-btn-primary" style={{ flex: 1, fontSize: 16 }} disabled={busy} onClick={onOk}>
            {tr("تمام")}
          </button>
          <button type="button" className="sup-btn-ghost" style={{ flex: 1, fontSize: 14 }} disabled={busy} onClick={onNote}>
            {tr("عندي ملاحظة")}
          </button>
        </div>
      )}
    </section>
  );
}

const Parts = ({ parts }: { parts: DiffPart[] }) => (
  <>
    {parts.map((p, i) =>
      p.kind === "del" ? (
        <span key={i} className="sup-del">
          {p.t}
        </span>
      ) : p.kind === "add" ? (
        <span key={i} className="sup-add">
          {p.t}
        </span>
      ) : (
        <span key={i}>{p.t}</span>
      ),
    )}
  </>
);

/** «أثر ملاحظتك»: ملاحظتها + الفقرة قبل وبعد (المحذوف مشطوب، والمضاف مظلّل ذهبي) */
export function ImpactCard({ docName, label, comment, before, after }: { docName: string; label: string; comment: string; before: string; after: string }) {
  const d = wordDiff(before, after);
  return (
    <section className="sup-glass" style={{ padding: 18 }} aria-label={tr("أثر ملاحظتك")}>
      <div className="flex items-center gap-2.5">
        <span className="sup-ic">{I.pen}</span>
        <b className="flex-1 text-[18px]">{tr("أثر ملاحظتك")}</b>
        <span className="text-[12px] text-[#ABA095]">{label}</span>
      </div>
      <div className="mt-2.5 flex items-start gap-2 rounded-[14px] px-3 py-2.5" style={{ background: "rgba(255,199,119,0.07)" }}>
        <DocAvatar name={docName} px={24} />
        <span className="text-[13px] text-[#EAE3DC]" dir="auto">
          «{comment}»
        </span>
      </div>
      <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div className="rounded-2xl p-3" style={{ background: "rgba(0,0,0,0.22)" }}>
          <div className="mb-1.5 text-[12px] font-bold text-[#ABA095]">{tr("قبل")}</div>
          <p className="m-0 whitespace-pre-wrap text-[14px] leading-[1.8] text-[#E9D3B8]" dir="auto">
            <Parts parts={d.before} />
          </p>
        </div>
        <div className="rounded-2xl p-3" style={{ background: "rgba(255,199,119,0.05)", boxShadow: "inset 0 0 0 1px rgba(255,199,119,0.2)" }}>
          <div className="mb-1.5 text-[12px] font-bold text-[#FFC777]">{tr("بعد · تعدّل النص ✓")}</div>
          <p className="m-0 whitespace-pre-wrap text-[14px] leading-[1.8] text-[#EAE3DC]" dir="auto">
            <Parts parts={d.after} />
          </p>
        </div>
      </div>
    </section>
  );
}
