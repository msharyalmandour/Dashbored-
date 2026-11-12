import { useEffect, useRef, useState } from "react";
import { Check, Loader2, MessageSquarePlus } from "lucide-react";
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
export interface SectionComment {
  id: string;
  sectionKey: string;
  quote: string;
  body: string;
  createdAt: string;
  resolvedAt: string | null;
}

/** ملاحظة المشرف/ة على جملة من القسم: تحدد جملة من النص (اختياري) وتكتب ملاحظتها، وتصير مهمة على كاتب القسم */
function CommentBox({ sectionKey, label, comments, onComment }: { sectionKey: string; label: string; comments: SectionComment[]; onComment: (key: string, label: string, quote: string, body: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [quote, setQuote] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const mine = comments.filter((c) => c.sectionKey === sectionKey);
  const start = () => {
    // الجملة اللي حدّدتها من نص هالقسم بس
    const sel = window.getSelection();
    const host = document.getElementById(`sv-sec-${sectionKey}`);
    const picked = sel && host && sel.anchorNode && host.contains(sel.anchorNode) ? sel.toString().trim().slice(0, 600) : "";
    setQuote(picked);
    setOpen(true);
    setDone(false);
  };
  return (
    <div className="mt-2">
      {mine.length > 0 && (
        <ul className="m-0 mb-2 list-none space-y-1.5 p-0">
          {mine.map((c) => (
            <li key={c.id} className="rounded-[14px] bg-[rgba(255,199,119,.07)] px-3 py-2 text-[13px] leading-relaxed text-[#E9D3B8]">
              {c.quote && <span className="mb-1 block border-s-[3px] border-[#FFC777] ps-2 text-[12px] text-[#ABA095]">«{c.quote}»</span>}
              {c.body}
              <span className="ms-2 text-[12px] text-[#ABA095]">{c.resolvedAt ? tr("· اتعدّلت ✓") : tr("· {0}", relTime(c.createdAt))}</span>
            </li>
          ))}
        </ul>
      )}
      {!open ? (
        <button type="button" className="sv-btn ghost !min-h-[44px] !px-3.5 !text-[13px]" onPointerDown={(e) => e.preventDefault()} onClick={start}>
          <MessageSquarePlus size={15} aria-hidden />
          {done ? tr("انرسلت ✓ — ملاحظة ثانية") : tr("علّقوا على جملة")}
        </button>
      ) : (
        <div className="rounded-[18px] border border-[rgba(255,240,225,.12)] bg-[rgba(0,0,0,.22)] p-3">
          {quote ? (
            <p className="m-0 mb-2 border-s-[3px] border-[#FFC777] ps-2 text-[13px] leading-relaxed text-[#D9CFC5]">«{quote}»</p>
          ) : (
            <p className="m-0 mb-2 text-[12px] text-[#ABA095]">{tr("ملاحظة على القسم كامل. (لو تبون جملة محددة: حدّدوها من النص فوق ثم اضغطوا «علّقوا على جملة».)")}</p>
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            autoFocus
            aria-label={tr("ملاحظتكم على «{0}»", label)}
            placeholder={tr("وش يعدّلون؟")}
            className="min-h-[80px] w-full resize-y rounded-[14px] border border-[rgba(255,240,225,.12)] bg-[rgba(255,245,235,.05)] p-3 text-[15px] leading-relaxed text-[#F2EBE3] outline-none focus:border-[rgba(255,199,119,.55)]"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="sv-btn pri !min-h-[44px] !text-[14px]"
              disabled={busy || !body.trim()}
              onClick={async () => {
                setBusy(true);
                const ok = await onComment(sectionKey, label, quote, body.trim());
                setBusy(false);
                if (ok) {
                  setOpen(false);
                  setBody("");
                  setQuote("");
                  setDone(true);
                }
              }}
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              {tr("أرسلوا الملاحظة")}
            </button>
            <button type="button" className="sv-btn ghost !min-h-[44px] !text-[14px]" onClick={() => setOpen(false)}>
              {tr("إلغاء")}
            </button>
          </div>
          <p className="m-0 mt-2 text-[12px] text-[#ABA095]">{tr("تصير مهمة على اللي كتب القسم، وتوصل الفريق بالمحادثة.")}</p>
        </div>
      )}
    </div>
  );
}

export function SvDocSheet({
  title,
  rows,
  approved,
  approvingKey,
  onApprove,
  comments = [],
  onComment,
  send,
  error,
  onClose,
}: {
  title: string;
  rows: DocRow[];
  approved?: string[];
  approvingKey?: string | null;
  onApprove?: (key: string, label: string) => void;
  comments?: SectionComment[];
  onComment?: (key: string, label: string, quote: string, body: string) => Promise<boolean>;
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
                  <span className="sv-badge soon !text-[#FFC777] !bg-[rgba(255,199,119,.12)]">{tr("معتمد ✓")}</span>
                ) : (
                  <button className="sv-btn ghost !min-h-[38px] !px-3.5 !text-[13px]" disabled={approvingKey === r.key} onClick={() => onApprove(r.key, r.label)}>
                    {approvingKey === r.key && <Loader2 size={13} className="animate-spin" />}
                    {tr("اعتمد القسم")}
                  </button>
                ))}
              {r.status && r.status !== "done" && <span className="sv-badge soon !text-[#ABA095] !bg-[rgba(255,255,255,.06)]">{r.status === "in-progress" ? tr("قيد الكتابة") : tr("ما بدأ")}</span>}
            </div>
            {r.content ? (
              <p id={`sv-sec-${r.key}`} className="m-0 mt-1.5 whitespace-pre-wrap text-[14px] leading-[1.9] text-[#D9D0C6]">
                {r.content}
              </p>
            ) : (
              <p className="m-0 mt-1.5 text-[13px] text-[#ABA095]">{tr("لم يُكتب بعد")}</p>
            )}
            {r.content && onComment && <CommentBox sectionKey={r.key} label={r.label} comments={comments} onComment={onComment} />}
          </div>
        ))}
      </div>
      <Composer placeholder={tr("تعليقكم على «{0}»…", title)} send={(body) => send(tr("تعليق على «{0}»: {1}", title, body))} cta={tr("أرسلوا التعليق")} />
      {error && <p className="sv-err">{error}</p>}
    </SvSheet>
  );
}
