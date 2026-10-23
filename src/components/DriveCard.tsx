import { useEffect, useRef, useState } from "react";
import { Check, ExternalLink, RefreshCw, FileText, FolderOpen, HardDrive, Link2, Loader2, Mail, ShieldCheck, Unplug, Users } from "lucide-react";
import Card from "./ui/Card";
import { GoogleDriveLogo, LogoTile } from "./ui/BrandLogos";
import ThreeDotsMenu from "./ui/ThreeDotsMenu";
import { useToast } from "../context/ToastContext";
import { disconnectDrive, driveErrorMessage, shareDriveFolder, startDriveConnect, type DriveStatus } from "../lib/driveTeam";

const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;

const STEPS = [
  { icon: Link2, title: "اربطوا مرة وحدة", desc: "قائد الفريق يسجّل بحساب Google حقه" },
  { icon: FolderOpen, title: "مجلد مشترك", desc: "ينفتح باسم فريقكم ويتشارك مع الأعضاء" },
  { icon: FileText, title: "محاضركم تنرفع", desc: "كل محضر Word ينحفظ فيه تلقائيًا" },
];

interface DriveCardProps {
  status: DriveStatus;
  onChanged: () => void;
}

/** ربط درايف الفريق: القائد يربط حسابه مرة وحدة، والمجلد ينشارك مع الأعضاء، ومحاضر الاجتماعات تنرفع له.
    تختفي كاملة لو الميزة غير مفعّلة على الخادم (ما نعرض أزرار ميتة). */
export default function DriveCard({ status, onChanged }: DriveCardProps) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState<"connect" | "share" | null>(null);
  const [doctorEmail, setDoctorEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const popup = useRef<Window | null>(null);

  // بعد ما نفتح نافذة قوقل: نتابع الحالة كل ٣ ثواني (لين ٥ دقايق) ونكمل لحالنا لما يتم الربط
  useEffect(() => {
    if (!waiting) return;
    if (status.connected) {
      setWaiting(false);
      setBusy(null);
      return;
    }
    const started = Date.now();
    const t = setInterval(() => {
      if (Date.now() - started > 5 * 60_000) {
        setWaiting(false);
        setBusy(null);
        return;
      }
      onChanged();
    }, 3000);
    return () => clearInterval(t);
  }, [waiting, status.connected, onChanged]);

  // تعذّر فحص الحالة — ما نخفي البطاقة بصمت
  if (status.unreachable) {
    return (
      <Card tone="cream" className="flex flex-wrap items-center justify-between gap-3 !p-4">
        <p className="flex items-center gap-2 text-sm text-brand-950/70">
          <HardDrive size={16} className="text-brand-500" />
          تعذّر فحص ربط الدرايف الحين{status.errorCode && status.errorCode !== "failed" ? ` (${status.errorCode})` : ""}.
        </p>
        <button onClick={onChanged} className="flex items-center gap-1.5 rounded-xl border border-brand-100 px-3.5 py-2 text-sm font-bold text-brand-700 hover:bg-surface-muted">
          <RefreshCw size={14} />
          أعيدوا المحاولة
        </button>
      </Card>
    );
  }

  if (!status.configured) return null;

  const connect = async () => {
    setBusy("connect");
    setMsg(null);
    // نفتح النافذة فورًا (قبل أي انتظار) عشان المتصفح ما يحجبها؛ لو انحجبت نرجع للتحويل بنفس الصفحة
    popup.current = window.open("", "_blank");
    const r = await startDriveConnect();
    if (r.data?.url) {
      if (popup.current && !popup.current.closed) {
        popup.current.location.href = r.data.url;
        setWaiting(true);
        return;
      }
      window.location.href = r.data.url;
      return;
    }
    popup.current?.close();
    setMsg(driveErrorMessage(r.error));
    setBusy(null);
  };

  const cancelWaiting = () => {
    setWaiting(false);
    setBusy(null);
    popup.current?.close();
  };

  const share = async () => {
    const email = doctorEmail.trim();
    if (email && !EMAIL.test(email)) {
      setMsg("إيميل الدكتورة غير صحيح.");
      return;
    }
    setBusy("share");
    setMsg(null);
    const r = await shareDriveFolder(email ? [email] : []);
    if (r.data) {
      const failed = r.data.failed.length;
      showToast({
        title: "تمت مشاركة المجلد",
        desc: failed ? `تعذّرت المشاركة مع ${failed}. تأكدوا من الإيميلات.` : `شاركنا المجلد مع ${r.data.shared} ${r.data.shared === 1 ? "شخص" : "أشخاص"}. توصلهم دعوة بالإيميل.`,
        icon: Check,
        tone: "brand",
      });
      setDoctorEmail("");
    } else setMsg(driveErrorMessage(r.error));
    setBusy(null);
  };

  const disconnect = async () => {
    const r = await disconnectDrive();
    if (r.error) setMsg(driveErrorMessage(r.error));
    else onChanged();
  };

  const connected = status.connected;

  return (
    <Card tone="cream" className="relative overflow-hidden !p-0">
      <div aria-hidden className="pointer-events-none absolute -top-16 -end-10 h-44 w-44 rounded-full bg-brand-500/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-20 -start-12 h-40 w-40 rounded-full bg-brand-300/10 blur-3xl" />

      <div className="relative p-5 sm:p-6">
        {/* الرأس */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <LogoTile active={waiting} className="h-12 w-12 rounded-2xl bg-white/[0.06] ring-1 ring-white/15">
              <GoogleDriveLogo size={28} />
            </LogoTile>
            <div>
              <h3 className="font-display text-base font-extrabold text-brand-950">درايف الفريق</h3>
              <p className="mt-0.5 text-xs text-brand-950/55">محاضر الاجتماعات مرتبة بمكان واحد يشوفه الكل</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold ${
                connected ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-500" : "border-brand-100 bg-surface-muted text-brand-950/55"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400/80" : "bg-brand-950/30"}`} />
              {connected ? "مربوط" : "غير مربوط"}
            </span>
            {connected && status.isLeader && (
              <ThreeDotsMenu items={[{ label: "فك الربط", confirmLabel: "تأكيد فك الربط؟", icon: Unplug, tone: "danger", onClick: disconnect }]} />
            )}
          </div>
        </div>

        {!connected ? (
          <div className="mt-5 space-y-5">
            {/* خطوات الرحلة */}
            <ol className="grid gap-2.5 sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative rounded-2xl border border-brand-100/70 bg-paper/50 p-3.5">
                  <span className="absolute end-3 top-3 font-display text-xs font-extrabold text-brand-950/25">{i + 1}</span>
                  <s.icon size={18} className="text-brand-500" />
                  <p className="mt-2 text-sm font-extrabold text-brand-950">{s.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-brand-950/55">{s.desc}</p>
                </li>
              ))}
            </ol>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-start gap-2 text-xs leading-relaxed text-brand-950/55">
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-brand-500" />
                صلاحية محدودة: Wesync يشوف بس الملفات اللي ينشئها، وما يقدر يفتح بقية درايفكم.
              </p>
              {status.isLeader ? (
                <button
                  onClick={connect}
                  disabled={busy === "connect"}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-brand-500/25 transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transition-none"
                >
                  {busy === "connect" ? <Loader2 size={16} className="animate-spin" /> : <HardDrive size={16} />}
                  {waiting ? "ننتظر موافقتكم بقوقل…" : "اربطوا درايف Google"}
                </button>
              ) : (
                <p className="rounded-xl bg-surface-muted px-3.5 py-2 text-xs font-bold text-brand-950/60">قائد الفريق هو اللي يربط الدرايف، وتظهر لكم هنا بعدها.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-100/70 bg-paper/50 p-3.5">
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-brand-950/45">مربوط بحساب</p>
                <p dir="ltr" className="truncate text-start text-sm font-extrabold text-brand-950">{status.googleEmail}</p>
                {status.connectedByName && <p className="mt-0.5 text-xs text-brand-950/50">ربطه {status.connectedByName}</p>}
              </div>
              {status.folderLink && (
                <a
                  href={status.folderLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-brand-500/25 transition-transform hover:-translate-y-0.5 motion-reduce:transition-none"
                >
                  <ExternalLink size={15} />
                  افتحوا المجلد
                </a>
              )}
            </div>

            <p className="flex items-center gap-2 text-xs text-brand-950/55">
              <Users size={14} className="text-brand-500" />
              المحاضر تنرفع تلقائيًا لمجلد الفريق بصيغة Word، والمجلد مشترك مع الأعضاء.
            </p>

            {status.isLeader && (
              <div className="rounded-2xl border border-brand-100/70 p-3.5">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-extrabold text-brand-950/70">
                  <Mail size={13} className="text-brand-500" />
                  مشاركة المجلد
                </p>
                <p className="mb-2.5 text-xs leading-relaxed text-brand-950/50">يشارك مع كل أعضاء الفريق (تعديل)، ولو كتبتم إيميل الدكتورة تشوف المجلد قراءة فقط. العضو الجديد اضغطوا له «شاركوا الآن».</p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="email"
                    dir="ltr"
                    value={doctorEmail}
                    onChange={(e) => setDoctorEmail(e.target.value)}
                    placeholder="إيميل الدكتورة (اختياري)"
                    className="min-w-0 basis-full rounded-xl border border-brand-100 bg-paper/60 sm:basis-0 sm:flex-1 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-brand-300"
                  />
                  <button
                    onClick={share}
                    disabled={busy === "share"}
                    className="flex items-center gap-1.5 rounded-xl border border-brand-100 px-4 py-2.5 text-sm font-extrabold text-brand-700 transition-colors hover:bg-surface-muted disabled:opacity-50"
                  >
                    {busy === "share" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    شاركوا الآن
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {waiting && (
          <p className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-brand-500/10 px-3.5 py-2.5 text-sm text-brand-950/80">
            <Loader2 size={14} className="animate-spin" />
            أكملوا الموافقة بنافذة قوقل، وهنا يتحدّث الربط لحاله. لو ما انفتحت نافذة، اسمحوا بالنوافذ المنبثقة وجرّبوا مرة ثانية.
            <button onClick={cancelWaiting} className="font-bold text-brand-700 underline underline-offset-2">إلغاء</button>
          </p>
        )}
        {msg && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-600">{msg}</p>}
      </div>
    </Card>
  );
}
