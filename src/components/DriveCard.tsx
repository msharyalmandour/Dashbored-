import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Check, ExternalLink, RefreshCw, HardDrive, Loader2, Mail, ShieldCheck, Unplug, Users } from "lucide-react";
import { pillField } from "./ui/researchUi";
import { GoogleDriveLogo, LogoTile } from "./ui/BrandLogos";
import ThreeDotsMenu from "./ui/ThreeDotsMenu";
import { useToast } from "../context/ToastContext";
import { disconnectDrive, driveErrorMessage, shareDriveFolder, startDriveConnect, type DriveStatus } from "../lib/driveTeam";

const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;

const STEPS = [
  { title: "اربطوا مرة وحدة", desc: "قائد الفريق يسجّل بحساب Google حقه" },
  { title: "مجلد مشترك", desc: "ينفتح باسم فريقكم ويتشارك مع الأعضاء" },
  { title: "محاضركم تنرفع", desc: "كل محضر Word ينحفظ فيه تلقائيًا" },
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
  const connectedRef = useRef(status.connected);
  connectedRef.current = status.connected;

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
      const closed = !popup.current || popup.current.closed;
      if (Date.now() - started > 5 * 60_000 || (closed && Date.now() - started > 6000)) {
        // قفلوا نافذة قوقل (أو فشل الربط فيها) قبل ما يكتمل: لا نظل «ننتظر» بلا نهاية
        setWaiting(false);
        setBusy(null);
        onChanged();
        // النافذة تسكّر نفسها بعد نجاح الربط: نعطي الفحص فرصة يرجع «مربوط» قبل ما نقول إنه فشل
        if (closed) {
          setTimeout(() => {
            if (!connectedRef.current) setMsg("انقفلت نافذة قوقل قبل ما يكتمل الربط. اضغطوا الزر وجرّبوا مرة ثانية، وكمّلوا الموافقة لين تشوفون «انربط».");
          }, 4000);
        }
        return;
      }
      onChanged();
    }, 3000);
    return () => clearInterval(t);
  }, [waiting, status.connected, onChanged]);

  // تعذّر فحص الحالة — ما نخفي البطاقة بصمت
  if (status.unreachable) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/[0.04] p-4">
        <p className="flex items-center gap-2 text-sm text-[#E6DBD1]">
          <HardDrive size={16} className="text-[#FFB444]" />
          تعذّر فحص ربط الدرايف الحين{status.errorCode && status.errorCode !== "failed" ? ` (${status.errorCode})` : ""}.
        </p>
        <button onClick={onChanged} className="flex items-center gap-1.5 rounded-full border border-[#FF8A24]/50 px-4 py-2 text-sm font-bold text-[#FFB444] hover:bg-[#FF6B00]/10">
          <RefreshCw size={14} />
          أعيدوا المحاولة
        </button>
      </div>
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
        desc: failed ? `تعذّرت المشاركة مع: ${r.data.failed.join("، ")}. غالبًا الإيميل ما عليه حساب Google.` : `شاركنا المجلد مع ${r.data.shared} ${r.data.shared === 1 ? "شخص" : "أشخاص"}. توصلهم دعوة بالإيميل.`,
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
    <div className="space-y-5 text-[#F4F0EC]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <LogoTile active={waiting} className="h-12 w-12 rounded-2xl bg-white/[0.06] ring-1 ring-white/15">
            <GoogleDriveLogo size={28} />
          </LogoTile>
          <p className="text-sm text-[#B8ADA2]">محاضر الاجتماعات مرتبة بمكان واحد يشوفه الكل</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-bold",
              connected ? "border-[#7fd6a0]/40 bg-[#7fd6a0]/10 text-[#7fd6a0]" : "border-white/15 bg-white/[0.04] text-[#B8ADA2]",
            )}
          >
            <span className={clsx("h-1.5 w-1.5 rounded-full", connected ? "bg-[#7fd6a0] shadow-[0_0_8px] shadow-[#7fd6a0]/80" : "bg-white/30")} />
            {connected ? "مربوط" : "غير مربوط"}
          </span>
          {connected && status.isLeader && (
            <ThreeDotsMenu items={[{ label: "فك الربط", confirmLabel: "تأكيد فك الربط؟", icon: Unplug, tone: "danger", onClick: disconnect }]} />
          )}
        </div>
      </div>

      {!connected ? (
        <div className="space-y-5">
          <ol className="space-y-0">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative flex gap-3.5 pb-4 last:pb-0">
                {i < STEPS.length - 1 && <span aria-hidden className="absolute start-[17px] top-9 h-[calc(100%-2.25rem)] w-px bg-white/15" />}
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#FF8A24]/60 text-sm font-bold text-[#FFB444]">{i + 1}</span>
                <span className="pt-0.5">
                  <span className="block text-sm font-bold">{s.title}</span>
                  <span className="block text-xs leading-relaxed text-[#B8ADA2]">{s.desc}</span>
                </span>
              </li>
            ))}
          </ol>

          <p className="flex items-start gap-2 rounded-2xl bg-white/[0.04] p-3.5 text-xs leading-relaxed text-[#B8ADA2]">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#FFB444]" />
            صلاحية محدودة: Wesync يشوف بس الملفات اللي ينشئها، وما يقدر يفتح بقية درايفكم. ورمز الربط يتخزن مشفّر بالخادم، مو بمتصفحكم.
          </p>

          {status.isLeader ? (
            <button
              onClick={connect}
              disabled={busy === "connect"}
              className="flex w-full items-center justify-center gap-2.5 rounded-full bg-[#F6F1EC] px-6 py-3.5 text-sm font-bold text-[#1A0F00] shadow-[0_12px_32px_rgba(0,0,0,.35)] transition hover:brightness-95 disabled:opacity-60"
            >
              {busy === "connect" ? <Loader2 size={16} className="animate-spin" /> : <GoogleDriveLogo size={20} />}
              {waiting ? "ننتظر موافقتكم بقوقل…" : "اربطوا Google Drive"}
            </button>
          ) : (
            <p className="rounded-2xl bg-white/[0.04] px-4 py-3 text-xs font-bold text-[#B8ADA2]">قائد الفريق هو اللي يربط الدرايف، وتظهر لكم هنا بعدها.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/[0.04] p-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-[#B8ADA2]">مربوط بحساب</p>
              <p dir="ltr" className="truncate text-start text-sm font-bold">{status.googleEmail}</p>
              {status.connectedByName && <p className="mt-0.5 text-xs text-[#B8ADA2]">ربطه {status.connectedByName}</p>}
            </div>
            {status.folderLink && (
              <a
                href={status.folderLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-full bg-gradient-to-l from-[#FFB444] to-[#FF6B00] px-5 py-2.5 text-sm font-bold text-[#1A0F00] shadow-[0_8px_28px_-8px_#FF6B00] transition hover:brightness-110"
              >
                <ExternalLink size={15} />
                افتحوا المجلد
              </a>
            )}
          </div>

          <p className="flex items-center gap-2 text-xs text-[#B8ADA2]">
            <Users size={14} className="text-[#FFB444]" />
            المحاضر تنرفع تلقائيًا لمجلد الفريق بصيغة Word، والمجلد مشترك مع الأعضاء.
          </p>
          {!status.isLeader && (
            <p className="text-xs leading-relaxed text-[#B8ADA2]/80">
              ما وصلك إيميل الدعوة؟ لازم إيميلك في Wesync يكون عليه حساب Google —{" "}
              <a href="https://accounts.google.com/signup" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-[#F4F0EC]">
                سوّ حساب بنفس إيميلك
              </a>{" "}
              وبلّغ القائد يضغط «شاركوا الآن». والمحاضر كلها موجودة هنا بعد وتنزل Word.
            </p>
          )}

          {status.isLeader && (
            <div className="rounded-2xl border border-white/10 p-4">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-bold">
                <Mail size={13} className="text-[#FFB444]" />
                مشاركة المجلد
              </p>
              <p className="mb-3 text-xs leading-relaxed text-[#B8ADA2]">يشارك مع كل أعضاء الفريق (تعديل)، ولو كتبتم إيميل الدكتورة تشوف المجلد قراءة فقط. العضو الجديد اضغطوا له «شاركوا الآن».</p>
              <div className="flex flex-wrap gap-2">
                <input type="email" dir="ltr" value={doctorEmail} onChange={(e) => setDoctorEmail(e.target.value)} placeholder="إيميل الدكتورة (اختياري)" className={clsx(pillField, "min-w-0 basis-full sm:flex-1 sm:basis-0")} />
                <button
                  onClick={share}
                  disabled={busy === "share"}
                  className="flex items-center gap-1.5 rounded-full border border-[#FF8A24]/50 px-5 py-2.5 text-sm font-bold text-[#FFB444] transition hover:bg-[#FF6B00]/10 disabled:opacity-50"
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
        <p className="flex flex-wrap items-center gap-2 rounded-2xl bg-[#FF6B00]/10 px-4 py-3 text-sm">
          <Loader2 size={14} className="animate-spin" />
          أكملوا الموافقة بنافذة قوقل، وهنا يتحدّث الربط لحاله. لو ما انفتحت نافذة، اسمحوا بالنوافذ المنبثقة وجرّبوا مرة ثانية.
          <button onClick={cancelWaiting} className="font-bold text-[#FFB444] underline underline-offset-2">إلغاء</button>
        </p>
      )}
      {msg && <p role="alert" className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-300">{msg}</p>}
    </div>
  );
}
