import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { SvSheet, relTime } from "./SvParts";
import { tr } from "../../lib/i18n";

export interface ThreadMessage {
  id: string;
  sender: "supervisor" | "team";
  senderName: string;
  body: string;
  createdAt: string;
}

/** حقل نص + زر إرسال للفريق (نفس submit_supervisor_message) */
function Composer({ placeholder, send, cta }: { placeholder: string; send: (body: string) => Promise<boolean>; cta: string }) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  return (
    <div className="mt-4">
      <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} maxLength={1500} placeholder={placeholder} aria-label={placeholder} className="sv-in" />
      <button
        className="sv-btn orange mt-2.5 w-full"
        disabled={busy || !draft.trim()}
        onClick={async () => {
          setBusy(true);
          const ok = await send(draft.trim());
          setBusy(false);
          if (ok) {
            setDraft("");
            setSent(true);
            setTimeout(() => setSent(false), 2500);
          }
        }}
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : sent ? <Check size={15} /> : null}
        {sent ? tr("انرسلت") : cta}
      </button>
    </div>
  );
}

/** «ملاحظة للفريق»: المحادثة كاملة + رسالة جديدة. الملاحظات تتحول مهام عند الفريق مثل قبل. */
export function SvNoteSheet({ thread, name, onNameChange, send, error, onClose }: { thread: ThreadMessage[]; name: string; onNameChange: (v: string) => void; send: (body: string) => Promise<boolean>; error: string | null; onClose: () => void }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.length]);
  return (
    <SvSheet title={tr("ملاحظة للفريق")} onClose={onClose}>
      <p className="sv-sd !mt-0">{tr("رسالتكم توصل الفريق كتنبيه، ويقدرون يحوّلونها مهام. ردودهم تظهر هنا.")}</p>
      {thread.length > 0 && (
        <div className="mt-3 flex max-h-[38vh] flex-col gap-2 overflow-y-auto">
          {thread.map((m) => {
            const mine = m.sender === "supervisor";
            return (
              <div key={m.id} className={`sv-msg ${mine ? "me" : "them"}`}>
                <small>
                  {mine ? m.senderName || tr("أنتم") : m.senderName ? tr("الفريق — {0}", m.senderName) : tr("الفريق")} · {relTime(m.createdAt)}
                </small>
                <span className="whitespace-pre-wrap">{m.body}</span>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      )}
      {!name.trim() && <input value={name} onChange={(e) => onNameChange(e.target.value)} maxLength={80} placeholder={tr("اسمكم (اختياري) — مثل: د. نورة")} aria-label={tr("اسمكم")} className="sv-in mt-4" />}
      <Composer placeholder={tr("مثال: راجعوا صياغة الفجوة البحثية قبل الاجتماع الجاي.")} send={send} cta={tr("أرسلوا للفريق")} />
      {error && <p className="sv-err">{error}</p>}
    </SvSheet>
  );
}

export interface DocRow {
  key: string;
  label: string;
  en?: string;
  status?: "not-started" | "in-progress" | "done";
  content: string;
}

/** قراءة مستند (المقترح / المنهجية / الموافقة) + اعتماد أقسام المقترح + تعليق يوصل الفريق */
export function SvDocSheet({
  title,
  rows,
  approved,
  approvingKey,
  onApprove,
  send,
  error,
  onClose,
}: {
  title: string;
  rows: DocRow[];
  approved?: string[];
  approvingKey?: string | null;
  onApprove?: (key: string, label: string) => void;
  send: (body: string) => Promise<boolean>;
  error: string | null;
  onClose: () => void;
}) {
  return (
    <SvSheet title={title} onClose={onClose}>
      <div>
        {rows.map((r) => (
          <div key={r.key} className="sv-ds">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1">
                <span className="sv-st">{r.label}</span>
                {r.en && <span className="mx-2 text-[12px] text-[#8F857C]" dir="ltr">{r.en}</span>}
              </span>
              {r.status === "done" && onApprove &&
                (approved?.includes(r.key) ? (
                  <span className="sv-badge soon !text-[#7FE0A6] !bg-[rgba(127,224,166,.12)]">{tr("معتمد ✓")}</span>
                ) : (
                  <button className="sv-btn ghost !min-h-[38px] !px-3.5 !text-[13px]" disabled={approvingKey === r.key} onClick={() => onApprove(r.key, r.label)}>
                    {approvingKey === r.key && <Loader2 size={13} className="animate-spin" />}
                    {tr("اعتمد القسم")}
                  </button>
                ))}
              {r.status && r.status !== "done" && <span className="sv-badge soon !text-[#ABA095] !bg-[rgba(255,255,255,.06)]">{r.status === "in-progress" ? tr("قيد الكتابة") : tr("ما بدأ")}</span>}
            </div>
            {r.content ? <p className="m-0 mt-1.5 whitespace-pre-wrap text-[14px] leading-[1.9] text-[#D9D0C6]">{r.content}</p> : <p className="m-0 mt-1.5 text-[13px] text-[#7A7067]">{tr("لم يُكتب بعد")}</p>}
          </div>
        ))}
      </div>
      <Composer placeholder={tr("تعليقكم على «{0}»…", title)} send={(body) => send(tr("تعليق على «{0}»: {1}", title, body))} cta={tr("أرسلوا التعليق")} />
      {error && <p className="sv-err">{error}</p>}
    </SvSheet>
  );
}
