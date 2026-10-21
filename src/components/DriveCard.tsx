import { useState } from "react";
import { Check, ExternalLink, HardDrive, Loader2, Mail, Unplug } from "lucide-react";
import Card from "./ui/Card";
import ThreeDotsMenu from "./ui/ThreeDotsMenu";
import { useToast } from "../context/ToastContext";
import { disconnectDrive, driveErrorMessage, shareDriveFolder, startDriveConnect, type DriveStatus } from "../lib/driveTeam";

const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;

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

  if (!status.configured) return null;

  const connect = async () => {
    setBusy("connect");
    setMsg(null);
    const r = await startDriveConnect();
    if (r.data?.url) {
      window.location.href = r.data.url;
      return;
    }
    setMsg(driveErrorMessage(r.error));
    setBusy(null);
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

  return (
    <Card tone="cream">
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-bold text-brand-950">
          <HardDrive size={18} className="text-brand-500" />
          درايف الفريق
        </h3>
        {status.connected && status.isLeader && (
          <ThreeDotsMenu items={[{ label: "فك الربط", confirmLabel: "تأكيد فك الربط؟", icon: Unplug, tone: "danger", onClick: disconnect }]} />
        )}
      </div>

      {!status.connected ? (
        <div className="mt-2 space-y-3 text-sm text-brand-950/70">
          <p>
            اربطوا درايف قائد الفريق مرة وحدة: نسوي مجلد «Wesync» بدرايفه ونشاركه مع كل الأعضاء، وكل محضر تحفظونه يتخزن فيه بصيغة Word. كلكم تشوفونه، ويقدر القائد يشاركه مع الدكتورة.
          </p>
          <p className="text-xs text-brand-950/50">نطلب صلاحية محدودة: Wesync يشوف بس الملفات اللي ينشئها، وما يقدر يفتح بقية درايفكم.</p>
          {status.isLeader ? (
            <button onClick={connect} disabled={busy === "connect"} className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50">
              {busy === "connect" ? <Loader2 size={16} className="animate-spin" /> : <HardDrive size={16} />}
              اربطوا درايف Google
            </button>
          ) : (
            <p className="rounded-xl bg-surface-muted px-3 py-2 text-xs font-semibold text-brand-950/60">قائد الفريق هو اللي يربط الدرايف. بعد ما يربطه يظهر المجلد هنا.</p>
          )}
        </div>
      ) : (
        <div className="mt-2 space-y-3 text-sm text-brand-950/70">
          <p>
            مربوط بحساب <span dir="ltr" className="font-semibold text-brand-950">{status.googleEmail}</span>
            {status.connectedByName && <> (ربطه {status.connectedByName})</>}. محاضركم تنرفع تلقائيًا لمجلد الفريق.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {status.folderLink && (
              <a href={status.folderLink} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600">
                <ExternalLink size={14} />
                افتحوا المجلد
              </a>
            )}
          </div>
          {status.isLeader && (
            <div className="rounded-xl border border-brand-100 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-brand-950/60">
                <Mail size={13} />
                مشاركة المجلد
              </p>
              <p className="mb-2 text-xs text-brand-950/50">يشارك مع كل أعضاء الفريق المسجلين (تعديل). وتقدرون تضيفون إيميل الدكتورة لعرض فقط.</p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="email"
                  dir="ltr"
                  value={doctorEmail}
                  onChange={(e) => setDoctorEmail(e.target.value)}
                  placeholder="إيميل الدكتورة (اختياري)"
                  className="min-w-0 flex-1 rounded-lg border border-brand-100 px-3 py-2 text-sm outline-none focus:border-brand-300"
                />
                <button onClick={share} disabled={busy === "share"} className="flex items-center gap-1.5 rounded-xl border border-brand-100 px-4 py-2 text-sm font-bold text-brand-700 hover:bg-surface-muted disabled:opacity-50">
                  {busy === "share" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  شاركوا الآن
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {msg && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">{msg}</p>}
    </Card>
  );
}
