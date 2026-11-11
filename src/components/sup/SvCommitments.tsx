import { useCallback, useEffect, useRef, useState } from "react";
import { tr } from "../../lib/i18n";
import { formatDateShort, formatWeekday } from "../../lib/date";
import { receiptFileUrl, supervisorAck, supervisorCommitments, supervisorFulfil, supervisorSetImportant, timingLabel, type SupImpact, type SupItem } from "../../lib/commitments";
import { ImpactCard, Ledger, ReceiptCard, SupIcons, type LedgerRow } from "./SupParts";

/** صفحة الدكتورة: إيصالات طلباتها اللي خلصت + أثر ملاحظاتها + سجل الوعود */
export default function SvCommitments({ token, name, teamName, openTarget, onToast, onPending }: { token: string; name: string; teamName: string; openTarget: string; onToast: (m: string) => void; onPending?: (v: boolean) => void }) {
  const [items, setItems] = useState<SupItem[] | null>(null);
  const [impacts, setImpacts] = useState<SupImpact[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const opened = useRef(false);

  const load = useCallback(async () => {
    const r = await supervisorCommitments(token);
    if (!r) return setItems((p) => p ?? []);
    setItems(r.items);
    setImpacts(r.impacts);
  }, [token]);
  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
  }, [load]);

  // من الإيميل: ?open=receipt:<id> — ننزل للإيصال نفسه
  useEffect(() => {
    if (opened.current || !items || !openTarget.startsWith("receipt:")) return;
    opened.current = true;
    const el = document.getElementById(`sv-rcpt-${openTarget.slice(8)}`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [items, openTarget]);

  const pending = !!items?.some((c) => c.direction === "from_supervisor" && c.status === "done" && !c.receipt_ack_at);
  useEffect(() => onPending?.(pending), [pending, onPending]);

  if (!items) return null;
  const openId = openTarget.startsWith("receipt:") ? openTarget.slice(8) : "";
  // الإيصالات: اللي ما انقال لها «تمام» + اللي جت من رابط الإيميل
  const receipts = items.filter((c) => c.direction === "from_supervisor" && c.status === "done" && (!c.receipt_ack_at || c.id === openId));
  const ledger: LedgerRow[] = items.map((c) => ({ ...c, owner: c.assignee ? { name: c.assignee } : null }));
  if (!receipts.length && !impacts.length && !ledger.length) return null;

  const ack = async (id: string, withNote?: string) => {
    setBusy(id);
    const r = await supervisorAck(token, id, withNote, name);
    setBusy(null);
    if (r.error) return onToast(r.error);
    setItems((p) => p?.map((c) => (c.id === id ? { ...c, receipt_ack_at: new Date().toISOString(), receipt_note: withNote ?? null } : c)) ?? p);
    setNoteFor(null);
    setNote("");
    onToast(withNote ? tr("وصلت ملاحظتك للفريق ✓") : tr("وصلهم «تمام» ✓"));
  };
  const openFile = async (id: string) => {
    const w = window.open("", "_blank");
    const url = await receiptFileUrl(token, id);
    if (url && w) w.location.href = url;
    else {
      w?.close();
      onToast(tr("ما قدرنا نفتح الملف — جرّبوا بعد شوي."));
    }
  };
  const star = async (r: LedgerRow) => {
    const next = !r.important;
    setItems((p) => p?.map((c) => (c.id === r.id ? { ...c, important: next } : c)) ?? p);
    const res = await supervisorSetImportant(token, r.id, next);
    if (res.error) {
      setItems((p) => p?.map((c) => (c.id === r.id ? { ...c, important: !next } : c)) ?? p);
      onToast(res.error);
    }
  };
  const fulfil = async (id: string) => {
    setBusy(id);
    const r = await supervisorFulfil(token, id);
    setBusy(null);
    if (r.error) return onToast(r.error);
    setItems((p) => p?.map((c) => (c.id === id ? { ...c, status: "done", done_at: new Date().toISOString() } : c)) ?? p);
    onToast(tr("انعلّم الوعد «تمّ» ✓"));
  };

  return (
    <div className="mt-5 flex flex-col gap-3">
      {receipts.map((c) => (
        <div key={c.id} id={`sv-rcpt-${c.id}`} className="flex flex-col gap-2">
          <ReceiptCard
            teamName={teamName}
            quote={c.quote || c.title}
            who={c.assignee || tr("الفريق")}
            when={c.done_at ? `${formatWeekday(c.done_at.slice(0, 10))} ${formatDateShort(c.done_at.slice(0, 10))}` : ""}
            timing={timingLabel(c.done_at, c.task_due ?? c.due_at)}
            file={c.has_proof && c.proof_name ? { name: c.proof_name } : null}
            acked={!!c.receipt_ack_at}
            busy={busy === c.id}
            onOk={() => void ack(c.id)}
            onNote={() => setNoteFor(noteFor === c.id ? null : c.id)}
            onOpenFile={c.has_proof ? () => void openFile(c.id) : undefined}
          />
          {noteFor === c.id && !c.receipt_ack_at && (
            <form
              className="sup-glass flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (note.trim()) void ack(c.id, note.trim());
              }}
            >
              <label htmlFor={`sv-note-${c.id}`} className="text-[13px] font-bold text-[#ABA095]">
                {tr("ملاحظتك توصل للفريق بالمحادثة")}
              </label>
              <textarea id={`sv-note-${c.id}`} value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1500} autoFocus className="w-full resize-none rounded-[14px] border-0 bg-white/5 p-3 font-[inherit] text-[14px] text-[#EAE3DC] outline-none focus-visible:ring-2 focus-visible:ring-[#FFC777]" dir="auto" />
              <button type="submit" className="sup-btn-cream" disabled={!note.trim() || busy === c.id}>
                {tr("أرسلوا الملاحظة")}
              </button>
            </form>
          )}
        </div>
      ))}
      {impacts.slice(0, 3).map((m) => (
        <ImpactCard key={m.id} docName={name || tr("الدكتورة")} label={m.label} comment={m.body} before={m.before} after={m.after} />
      ))}
      {ledger.length > 0 && (
        <Ledger
          rows={ledger}
          docName={name || tr("الدكتورة")}
          action={(r) =>
            r.direction === "from_supervisor" ? (
              <button type="button" className="sup-star" aria-pressed={r.important} aria-label={r.important ? tr("شيلوا «مهم عندي»") : tr("علّموه «مهم عندي»")} onClick={() => void star(r)}>
                {r.important ? SupIcons.starFill : SupIcons.starLine(18)}
              </button>
            ) : r.status !== "done" ? (
              <button type="button" className="sup-btn-ghost" style={{ minHeight: 44, fontSize: 12, padding: "0 12px", whiteSpace: "nowrap" }} disabled={busy === r.id} onClick={() => void fulfil(r.id)}>
                {tr("تمّ")}
              </button>
            ) : null
          }
        />
      )}
    </div>
  );
}
