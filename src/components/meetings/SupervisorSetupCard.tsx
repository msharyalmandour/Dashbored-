import { useEffect, useState } from "react";
import { Check, ChevronDown, Copy, Mail, MessageCircle, UserRound } from "lucide-react";
import clsx from "clsx";
import { Panel, ghostBtn, rowSurface } from "../ui/page";
import { getMyEmailStatus, type EmailStatus } from "../../lib/supervisorEmail";
import { mailtoUrl, supervisorInviteMessage, whatsappUrl } from "../../lib/meetings";
import { tr, trx } from "../../lib/i18n";

const SENT_KEY = "wesync.supervisorInviteSent";

function Step({ n, done, title, desc, children }: { n: number; done: boolean; title: string; desc: string; children?: React.ReactNode }) {
  return (
    <li className={clsx(rowSurface, "flex gap-3")}>
      <span className={clsx("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-extrabold", done ? "bg-[#7fd6a0]/20 text-[#7fd6a0]" : "border border-brand-500/50 text-amber-accent-400")}>
        {done ? <Check size={14} strokeWidth={3} /> : n}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-brand-950">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-brand-950/55">{desc}</p>
        {children && <div className="mt-2.5">{children}</div>}
      </div>
    </li>
  );
}

/** «جهّزوا المشرف/ة»: ٤ خطوات واضحة (اسمها، إرسال رابطها، تفعيلها للإيميل، تحديدها لأوقاتها) مع حالة كل خطوة.
    تنطوي لسطر صغير لما تكتمل. المشرف/ة ما تحتاج حساب — كل شي من رابط واحد. */
export default function SupervisorSetupCard({
  supervisorName,
  onSaveName,
  supervisorUrl,
  projectTitle,
  hasAvailability,
  canWrite,
}: {
  supervisorName: string;
  onSaveName: (name: string) => Promise<unknown> | void;
  supervisorUrl: string | null;
  projectTitle: string;
  hasAvailability: boolean;
  canWrite: boolean;
}) {
  const [name, setName] = useState(supervisorName);
  const [nameSaved, setNameSaved] = useState(false);
  const [email, setEmail] = useState<EmailStatus | null>(null);
  const [toEmail, setToEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState(() => {
    try {
      return localStorage.getItem(SENT_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    setName(supervisorName);
  }, [supervisorName]);
  useEffect(() => {
    let alive = true;
    getMyEmailStatus().then((s) => alive && setEmail(s));
    return () => {
      alive = false;
    };
  }, []);

  const markSent = () => {
    setSent(true);
    try {
      localStorage.setItem(SENT_KEY, "1");
    } catch {
      // بدون تخزين: يرجع يسألنا بالزيارة الجاية، مو مشكلة
    }
  };

  const emailActive = email?.state === "active";
  const emailPending = email?.state === "pending";
  const nameDone = supervisorName.trim().length > 0;
  // لو المشرف/ة فعّلت الإيميل أو حددت أوقاتها فهذا يعني إنها فتحت الرابط فعلًا
  const linkDone = sent || emailActive || emailPending || hasAvailability;
  const done = [nameDone, linkDone, emailActive, hasAvailability].filter(Boolean).length;
  const allDone = done === 4;
  const expanded = open ?? !allDone;
  const message = supervisorUrl ? supervisorInviteMessage(supervisorUrl, projectTitle) : "";

  const copy = async () => {
    if (!supervisorUrl) return;
    try {
      await navigator.clipboard.writeText(supervisorUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // التحديد اليدوي ممكن
    }
  };

  const saveName = async () => {
    if (name.trim() === supervisorName.trim()) return;
    await onSaveName(name.trim());
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 1800);
  };

  return (
    <Panel>
      <button onClick={() => setOpen(!expanded)} aria-expanded={expanded} className="flex w-full items-center justify-between gap-3 text-start">
        <span className="flex flex-wrap items-center gap-2 font-display text-lg font-bold text-brand-950">
          {allDone ? tr("المشرف/ة جاهزة") : tr("جهّزوا المشرف/ة عشان تشتغل الأمور")}
          <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-xs font-bold text-amber-accent-400">{trx("{0} من ٤", done)}</span>
        </span>
        <ChevronDown size={16} className={clsx("text-brand-950/40 transition-transform", expanded && "rotate-180")} />
      </button>

      {expanded && (
        <>
          <p className="mt-3 text-sm leading-relaxed text-brand-950/65">{tr("المشرف/ة ما تحتاج حساب ولا تنزيل برنامج. ترسلون لها ")}<b className="text-brand-950">{tr("رابط واحد خاص فيها")}</b>{tr("، تفتحه من جوالها وتشوف تقدمكم، وتعتمد محاضركم وتجاوب على أسئلتكم وتحدد أوقاتها بضغطة. هذي الخطوات تخلي كل شي يوصلها لحد عندها:")}</p>
          <ol className="mt-4 space-y-2.5">
            <Step n={1} done={nameDone} title={tr("اسمها")} desc={tr("يظهر بالمحاضر والقرارات والرسائل (مثل: د. أمل حسن).")}>
              <div className="flex flex-wrap gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canWrite}
                  maxLength={80}
                  placeholder={tr("اسم المشرف/ة")}
                  aria-label={tr("اسم المشرف/ة")}
                  className="min-w-0 flex-1 rounded-full border border-brand-100 bg-paper px-4 py-2 text-sm outline-none focus:border-brand-300 sm:max-w-xs"
                />
                <button onClick={saveName} disabled={!canWrite || !name.trim() || name.trim() === supervisorName.trim()} className={ghostBtn}>
                  {nameSaved ? <Check size={14} /> : <UserRound size={14} />}
                  {nameSaved ? tr("انحفظ") : tr("احفظوا الاسم")}
                </button>
              </div>
            </Step>

            <Step n={2} done={linkDone} title={tr("أرسلوا لها رابطها")} desc={tr("أول مرة بس. الرسالة جاهزة وفيها شرح مختصر لها وش هذا الرابط.")}>
              {supervisorUrl ? (
                <div className="space-y-2.5">
                  <div className="flex flex-wrap gap-2">
                    <a href={whatsappUrl(message)} onClick={markSent} target="_blank" rel="noreferrer" className={ghostBtn}>
                      <MessageCircle size={14} />{tr("بواتساب")}</a>
                    <button onClick={copy} className={ghostBtn}>
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? tr("اننسخ") : tr("انسخوا الرابط")}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="email"
                      dir="ltr"
                      value={toEmail}
                      onChange={(e) => setToEmail(e.target.value)}
                      placeholder={tr("إيميلها: name@university.edu.sa")}
                      aria-label={tr("إيميل المشرف/ة")}
                      className="min-w-0 flex-1 rounded-full border border-brand-100 bg-paper px-4 py-2 text-sm outline-none focus:border-brand-300 sm:max-w-xs"
                    />
                    <a
                      href={toEmail.includes("@") ? mailtoUrl(toEmail, tr("رابط متابعة بحث التخرج على Wesync"), message) : undefined}
                      onClick={toEmail.includes("@") ? markSent : (e) => e.preventDefault()}
                      aria-disabled={!toEmail.includes("@")}
                      className={clsx(ghostBtn, !toEmail.includes("@") && "pointer-events-none opacity-40")}
                    >
                      <Mail size={14} />{tr("افتحوا الإيميل")}</a>
                  </div>
                  <p className="text-[11px] text-brand-950/40">{tr("يفتح عندكم برنامج الإيميل والرسالة جاهزة — ما نخزّن إيميلها ولا نرسل لها شي منّا قبل ما تفعّله بنفسها.")}</p>
                </div>
              ) : (
                <p className="text-xs text-brand-950/50">{tr("الرابط يظهر بعد ما ينشأ الفريق بالوضع الحقيقي.")}</p>
              )}
            </Step>

            <Step
              n={3}
              done={emailActive}
              title={tr("تفعيلها لإيميل التنبيهات")}
              desc={tr("من صفحتها تكتب إيميلها وتؤكده، وبعدها يوصلها إيميل مع كل محضر أو قرار أو موعد جديد، فلا تحتاج تتذكر تفتح الرابط.")}
            >
              <p className="text-sm text-brand-950/70">
                {emailActive ? (
                  <>{tr("مفعّل على ")}<b dir="ltr">{email?.emailMasked}</b>
                  </>
                ) : emailPending ? (
                  <>{tr("أرسلنا لها رابط تأكيد على ")}<b dir="ltr">{email?.emailMasked}</b>{tr(" — بانتظار ضغطها عليه.")}</>
                ) : (
                  tr("ما فعّلته بعد — تفعّله من أسفل بطاقة «جهّزوا صفحتكم» بصفحتها. لو تأخرت، تظل رسائل الواتساب الجاهزة تحت كل طلب.")
                )}
              </p>
            </Step>

            <Step n={4} done={hasAvailability} title={tr("أوقاتها المتاحة")} desc={tr("هي تحدد أيامها وساعاتها مرة وحدة، وأنتم تحجزون موعد من تبويب «المواعيد» بضغطة بدل رسائل الأخذ والرد.")}>
              <p className="text-sm text-brand-950/70">{hasAvailability ? tr("محدّدة — تقدرون تحجزون من تبويب «المواعيد».") : tr("لسا ما حددتها. بعد ما تفتح رابطها بتشوف خطوة «حدّدوا أوقاتكم».")}</p>
            </Step>
          </ol>
        </>
      )}
    </Panel>
  );
}
