import { useState } from "react";
import { AlertTriangle, Check, Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { errorText, inviteSupervisorByEmail, type EmailStatus } from "../../lib/supervisorEmail";
import { tr } from "../../lib/i18n";

/** القائد يكتب إيميل المشرف/ة ويتفعّل على طول: يوصلها إيميل ترحيب فيه وش ينتظرها، وبعده المحاضر والطلبات.
    يطلع كمان لو الإشعارات رايحة لإيميل عضو بالفريق، أو لو ينتظر تأكيد قديم ما انضغط. */
export default function SupervisorEmailInvite({ status, onSent }: { status: EmailStatus | null; onSent?: () => void }) {
  const { team, isLeader, canWrite } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const wrong = !!status?.isTeamMember && status.state !== "none" && status.state !== "off";
  const pending = status?.state === "pending" && !status.isTeamMember;
  const missing = !status || status.state === "none" || status.state === "off" || pending;
  if (!team?.shareToken || (!wrong && !missing)) return null;

  const send = async () => {
    setBusy(true);
    setMsg(null);
    const { error } = await inviteSupervisorByEmail(team.shareToken!, email.trim());
    setBusy(false);
    if (error) {
      setMsg({ ok: false, text: errorText[error] });
      return;
    }
    setMsg({ ok: true, text: tr("تمام، تفعّلت. وصلها إيميل ترحيب، ومن الحين توصلها المحاضر والأسئلة والمواعيد على طول. لو ما لقته قولوا لها تشوف الرسائل المزعجة (Junk).") });
    setEmail("");
    onSent?.();
  };

  return (
    <div className="mt-2 rounded-2xl border border-[rgba(255,199,119,.25)] bg-[rgba(255,199,119,.07)] p-3">
      {wrong && (
        <p className="m-0 mb-2 flex items-start gap-2 text-[13px] font-bold leading-relaxed text-[#FFC777]" role="alert">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            {tr("الإشعارات رايحة لإيميل عضو بالفريق ({0})، مو للمشرف/ة. عشان كذا المحاضر والطلبات ما توصلها.", status!.emailMasked)}
          </span>
        </p>
      )}
      {pending && (
        <p className="m-0 mb-2 flex items-start gap-2 text-[13px] font-bold leading-relaxed text-[#FFC777]" role="alert">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>{tr("إيميل المشرف/ة ({0}) ينتظر تأكيد ما انضغط، فما يوصلها شي. أضيفوه مرة ثانية من هنا ويتفعّل على طول.", status!.emailMasked)}</span>
        </p>
      )}
      {isLeader ? (
        <>
          <p className="m-0 mb-2 text-[13px] leading-relaxed text-[#E9D3B8]">{tr("اكتبوا إيميل المشرف/ة ويتفعّل على طول: توصلها المحاضر والأسئلة والمواعيد، وتقدر توقفها بضغطة من أي إيميل.")}</p>
          <div className="flex flex-wrap gap-2">
            <input
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@kau.edu.sa"
              aria-label={tr("إيميل المشرف/ة")}
              disabled={!canWrite}
              className="min-h-[44px] min-w-0 flex-1 basis-full rounded-full border border-[rgba(255,240,225,.14)] sm:basis-auto bg-[rgba(255,245,235,.05)] px-4 text-[15px] text-[#F2EBE3] outline-none focus:border-[rgba(255,199,119,.55)]"
            />
            <button type="button" onClick={send} disabled={busy || !canWrite || !/^\S+@\S+\.\S+$/.test(email.trim())} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#F2EBE3] px-4 text-[14px] font-extrabold text-[#160904] disabled:opacity-50">
              {msg?.ok ? <Check size={15} aria-hidden /> : <Mail size={15} aria-hidden />}
              {busy ? tr("لحظة…") : tr("فعّلوا إيميلات المشرف/ة")}
            </button>
          </div>
        </>
      ) : (
        <p className="m-0 text-[13px] text-[#ABA095]">{tr("القائد يكتب إيميل المشرف/ة من هنا.")}</p>
      )}
      {msg && (
        <p className={`m-0 mt-2 text-[13px] leading-relaxed ${msg.ok ? "text-[#7FE0A6]" : "text-[#FF8A7A]"}`} role={msg.ok ? "status" : "alert"}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
