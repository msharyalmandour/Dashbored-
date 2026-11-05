import { useState } from "react";
import { AlertTriangle, Check, Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { errorText, inviteSupervisorByEmail, type EmailStatus } from "../../lib/supervisorEmail";
import { tr } from "../../lib/i18n";

/** لو إشعارات المشرف/ة مفعّلة على إيميل عضو بالفريق (غالبًا طالب جرّب رابطها) نقولها بوضوح،
    والقائد يكتب إيميلها ويوصلها رابط تأكيد. الاشتراك الجديد يحل محل القديم أول ما ينطلب. */
export default function SupervisorEmailInvite({ status, onSent }: { status: EmailStatus | null; onSent?: () => void }) {
  const { team, isLeader, canWrite } = useAuth();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const wrong = !!status?.isTeamMember && status.state !== "none" && status.state !== "off";
  const missing = !status || status.state === "none" || status.state === "off";
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
    setMsg({ ok: true, text: tr("أرسلنا لها رابط تأكيد. أول ما تضغطه توصلها المحاضر والطلبات على إيميلها (قولوا لها تشوف الرسائل المزعجة لو ما لقته).") });
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
      {isLeader ? (
        <>
          <p className="m-0 mb-2 text-[13px] leading-relaxed text-[#E9D3B8]">{tr("اكتبوا إيميل المشرف/ة ونرسل لها رابط تأكيد. ما يوصلها شي ثاني قبل ما تضغطه.")}</p>
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
              {busy ? tr("لحظة…") : tr("أرسلوا لها رابط التأكيد")}
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
