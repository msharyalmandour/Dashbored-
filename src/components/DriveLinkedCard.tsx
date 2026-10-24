import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, X } from "lucide-react";
import { GoogleDriveLogo } from "./ui/BrandLogos";
import { useAuth } from "../context/AuthContext";
import { getDriveStatus, type DriveStatus } from "../lib/driveTeam";
import { tr } from "../lib/i18n";

const seenKey = (userId: string) => `wesync.driveLinked.seen.${userId}`;

/** بطاقة هادئة للأعضاء (مرة وحدة): القائد ربط درايف الفريق، وين يلقون المجلد، ووش يسوون لو ما وصلتهم الدعوة */
export default function DriveLinkedCard() {
  const { currentUser, isLeader, mode } = useAuth();
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [hidden, setHidden] = useState(() => {
    try {
      return !currentUser || localStorage.getItem(seenKey(currentUser.id)) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (mode !== "supabase" || isLeader || hidden) return;
    let alive = true;
    getDriveStatus().then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, [mode, isLeader, hidden]);

  if (hidden || isLeader || !status?.connected || !currentUser) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(seenKey(currentUser.id), "1");
    } catch {
      // بدون تخزين: تختفي لهالزيارة بس
    }
  };

  return (
    <section className="relative flex flex-col gap-4 rounded-[28px] border border-[rgba(255,107,0,.3)] bg-[rgba(24,16,8,.88)] p-5 text-[#F4F0EC] sm:flex-row sm:items-center sm:p-6">
      <button
        onClick={dismiss}
        aria-label={tr("إخفاء")}
        className="absolute end-3 top-3 rounded-full p-1.5 text-[#B8ADA2] transition hover:bg-white/10 hover:text-[#F4F0EC]"
      >
        <X size={16} />
      </button>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] ring-1 ring-white/15">
        <GoogleDriveLogo size={26} />
      </span>
      <div className="min-w-0 flex-1 space-y-1 pe-6">
        <p className="font-kufi text-base font-bold">{status.connectedByName ? tr("{0} ربط درايف الفريق", status.connectedByName.trim()) : tr("درايف الفريق انربط")}</p>
        <p className="text-sm leading-relaxed text-[#B8ADA2]">{tr("محاضر الاجتماعات تنحفظ في مجلد الفريق تلقائيًا. وكلها موجودة هنا بعد في ")}<Link to="/meeting-minutes" className="font-semibold text-[#FFB444] hover:underline">{tr("الاجتماعات")}</Link>{tr(" وتقدرون تنزلونها Word.")}</p>
        <p className="text-xs text-[#B8ADA2]/80">{tr("ما وصلك إيميل الدعوة؟ لازم إيميلك في Wesync يكون عليه حساب Google — ")}<a href="https://accounts.google.com/signup" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-[#F4F0EC]">{tr("سوّ حساب بنفس إيميلك")}</a>{tr(" وبلّغ القائد يضغط «شاركوا الآن».")}</p>
      </div>
      {status.folderLink && (
        <a
          href={status.folderLink}
          target="_blank"
          rel="noreferrer"
          className="flex shrink-0 items-center justify-center gap-2 self-start rounded-full bg-gradient-to-l from-[#FFB444] to-[#FF6B00] px-5 py-2.5 text-sm font-bold text-[#1A0F00] transition hover:brightness-110 sm:self-center"
        >
          <ExternalLink size={15} />{tr("افتحوا المجلد")}</a>
      )}
    </section>
  );
}
