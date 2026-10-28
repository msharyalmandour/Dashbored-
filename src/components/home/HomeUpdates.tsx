import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, X } from "lucide-react";
import { GoogleDriveLogo } from "../ui/BrandLogos";
import { useAuth } from "../../context/AuthContext";
import { useSupervisorMessages } from "../../hooks/useSupervisorMessages";
import { useResearchProject } from "../../hooks/useResearchProject";
import { getDriveStatus, peekDriveStatus, type DriveStatus } from "../../lib/driveTeam";
import { openAgent } from "../../lib/agentBus";
import { formatDateShort } from "../../lib/date";
import { tr } from "../../lib/i18n";

const ORB = "radial-gradient(circle at 50% 60%, #FFF0C2, #FFC85A 22%, #FF7A10 55%, #C2400A 82%, #5A1A04)";
const glass =
  "relative overflow-hidden rounded-[30px] p-6 shadow-[0_30px_80px_rgba(0,0,0,.45)] backdrop-blur-[24px] backdrop-saturate-[1.4] text-[#F4F0EC]";

/** «قبل دقائق / قبل ٣ ساعات / ٢٤ أكتوبر» */
function relTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const min = Math.round((Date.now() - t) / 60000);
  if (min < 60) return tr("قبل دقائق");
  const h = Math.round(min / 60);
  if (h < 24) return h === 1 ? tr("قبل ساعة") : h === 2 ? tr("قبل ساعتين") : h <= 10 ? tr("قبل {0} ساعات", h) : tr("قبل {0} ساعة", h);
  return formatDateShort(iso.slice(0, 10));
}

/** أول حرف من الاسم بدون «د.» */
const initial = (name: string) => name.replace(/^\s*(د\.|Dr\.?)\s*/i, "").trim().replace(/^ال(?=\S{2})/, "").charAt(0) || "؟";

interface Update {
  id: string;
  at: number;
  render: (style: CSSProperties) => ReactNode;
}

const driveSeenKey = (userId: string, email: string) => `wesync.homeUpdates.drive.${userId}.${email}`;

/** «الجديد عندكم»: بطاقات تحديثات متحركة بالرئيسية (رسالة المشرف/ة الجديدة، ربط درايف الفريق) */
export default function HomeUpdates() {
  const { currentUser } = useAuth();
  const { messages, unread } = useSupervisorMessages();
  const { project } = useResearchProject();
  // آخر حالة معروفة بالجهاز تظهر فورًا — دالة الدرايف أحيانًا تتأخر ثواني فكانت البطاقة تطلع متأخر
  const [drive, setDrive] = useState<DriveStatus | null>(() => peekDriveStatus(currentUser?.id));
  const [driveHidden, setDriveHidden] = useState(() => {
    const d = peekDriveStatus(currentUser?.id);
    if (!currentUser || !d?.googleEmail) return false;
    try {
      return localStorage.getItem(driveSeenKey(currentUser.id, d.googleEmail)) === "1";
    } catch {
      return false;
    }
  });
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let alive = true;
    // فشل الفحص ما يمسح الحالة المعروفة
    getDriveStatus().then((s) => alive && !s.unreachable && setDrive(s));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUser || !drive?.connected || !drive.googleEmail) return;
    try {
      setDriveHidden(localStorage.getItem(driveSeenKey(currentUser.id, drive.googleEmail)) === "1");
    } catch {
      // بدون تخزين: تظهر
    }
  }, [currentUser, drive?.connected, drive?.googleEmail]);

  const dismissDrive = () => {
    setDriveHidden(true);
    if (!currentUser || !drive?.googleEmail) return;
    try {
      localStorage.setItem(driveSeenKey(currentUser.id, drive.googleEmail), "1");
    } catch {
      // بدون تخزين: تختفي لهالزيارة
    }
  };

  const updates: Update[] = [];

  // ١) رسالة جديدة من المشرف/ة — تظهر لين يفتحون المحادثة (تنقرا)
  const latest = [...messages].reverse().find((m) => m.sender === "supervisor") ?? null;
  if (latest && unread > 0) {
    const name = latest.senderName?.trim() || project?.supervisorName?.trim() || tr("المشرف/ة");
    updates.push({
      id: "supervisor",
      at: new Date(latest.createdAt).getTime() || Date.now(),
      render: (style) => (
        <article
          key="supervisor"
          style={style}
          className={`hu-in ${glass} min-w-0 flex-[1_1_520px] border border-[rgba(255,190,110,.4)] bg-[linear-gradient(135deg,rgba(255,120,30,.18),rgba(26,12,6,.85)_55%)] shadow-[0_30px_80px_rgba(0,0,0,.45),inset_0_1px_0_rgba(255,240,220,.18)]`}
        >
          <span aria-hidden className="hu-sweep pointer-events-none absolute inset-0" />
          <div className="relative flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="hu-breathe flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#FFE3A3,#FF8A1F)] font-kufi text-[22px] font-extrabold text-[#2A0E04] shadow-[0_0_30px_rgba(255,140,40,.5)]">
                {initial(name)}
              </div>
              <span aria-hidden className="absolute end-0 top-0 h-3.5 w-3.5">
                <span className="hu-ping absolute inset-0 rounded-full bg-[#FF6B00]" />
                <span className="absolute inset-0 rounded-full border-2 border-[#160A04] bg-[#FF6B00]" />
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-[17px] font-bold">{unread > 1 ? tr("{0} رسائل جديدة من المشرف/ة", unread) : tr("رسالة جديدة من المشرف/ة")}</h3>
                <span className="rounded-full bg-[rgba(255,180,68,.14)] px-2.5 py-0.5 text-xs text-[#FFD08A]">
                  {name}
                  {relTime(latest.createdAt) && ` · ${relTime(latest.createdAt)}`}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-base leading-[1.9] text-[#F1E6DC]">«{latest.body}»</p>
              <div className="mt-1 flex flex-wrap gap-2.5">
                <Link
                  to="/feedback"
                  className="rounded-full bg-gradient-to-l from-[#FFB444] to-[#FF6B00] px-[22px] py-2.5 text-sm font-bold text-[#1A0F00] transition hover:brightness-110"
                >
                  {tr("ردّوا عليها")}
                </Link>
                <button
                  type="button"
                  onClick={() => openAgent(tr("حوّل ملاحظة المشرف/ة هذي لمهام موزّعة على الفريق: «{0}»", latest.body))}
                  className="inline-flex items-center gap-2 rounded-full border border-white/[0.18] px-[18px] py-2.5 text-sm transition hover:border-[#FF8A24]/60"
                >
                  <span aria-hidden className="h-[18px] w-[18px] rounded-full" style={{ background: ORB }} />
                  {tr("حوّلها لمهام")}
                </button>
              </div>
            </div>
          </div>
        </article>
      ),
    });
  }

  // ٢) عضو ربط درايف الفريق — لكل الأعضاء لين يضغطون الزر أو ✕
  if (drive?.connected && !driveHidden) {
    const who = drive.connectedByName?.trim() || tr("قائد الفريق");
    const when = relTime(drive.connectedAt);
    updates.push({
      id: "drive",
      at: drive.connectedAt ? new Date(drive.connectedAt).getTime() : 0,
      render: (style) => (
        <article
          key="drive"
          style={style}
          className={`hu-in ${glass} min-w-0 flex-[1_1_380px] border border-[rgba(47,191,107,.35)] bg-[rgba(20,14,10,.85)]`}
        >
          <span aria-hidden className="pointer-events-none absolute -end-[60px] -top-[60px] h-[220px] w-[220px] rounded-full bg-[#2FBF6B] opacity-[.18] blur-[90px]" />
          <button
            type="button"
            onClick={dismissDrive}
            aria-label={tr("إخفاء")}
            className="absolute end-4 top-4 rounded-full p-1.5 text-[#B8ADA2] transition hover:bg-white/10 hover:text-[#F4F0EC]"
          >
            <X size={16} />
          </button>
          <div className="relative flex flex-col gap-4">
            <div className="flex items-center gap-3 pe-8">
              <div aria-hidden className="relative h-[58px] w-[110px] shrink-0">
                <div className="absolute start-0 top-1.5 flex h-[46px] w-[46px] items-center justify-center rounded-full border-2 border-[#FF8A20] bg-[rgba(255,107,0,.18)] font-extrabold text-[#FF8A20]">
                  {initial(who)}
                </div>
                <div className="hu-fly absolute start-[30px] top-4 flex h-[26px] w-[22px] items-center justify-center rounded-md bg-[linear-gradient(160deg,#FFE3A3,#FFB444)] text-[10px] font-extrabold text-[#1A0F00]">
                  W
                </div>
                <div className="absolute end-0 top-0.5 flex h-[54px] w-[54px] items-center justify-center rounded-[18px] border border-white/[0.14] bg-white/[0.07]">
                  <GoogleDriveLogo size={26} />
                </div>
                <span className="hu-pop absolute -end-1.5 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#2FBF6B] text-[11px] font-extrabold text-[#06210F] shadow-[0_0_12px_rgba(47,191,107,.7)]">
                  ✓
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[17px] font-bold">{tr("{0} ربط درايف الفريق", who)}</h3>
                {when && <p className="text-[13px] text-[#B8ADA2]">{when}</p>}
              </div>
            </div>
            <p className="text-[15px] leading-[1.9] text-[#E6DBD1]">{tr("المحاضر صارت تنحفظ تلقائيًا في مجلد مشترك بين الفريق والمشرف/ة. تقدرون تشوفونه الحين.")}</p>
            <Link
              to="/meeting-minutes"
              onClick={dismissDrive}
              className="flex items-center justify-between rounded-full border border-[rgba(47,191,107,.4)] bg-[rgba(47,191,107,.12)] px-5 py-[11px] font-semibold text-[#BFF0D2] transition hover:bg-[rgba(47,191,107,.2)]"
            >
              <span>{tr("شوفوا المحاضر")}</span>
              <ArrowLeft size={16} />
            </Link>
          </div>
        </article>
      ),
    });
  }

  if (updates.length === 0) return null;

  const sorted = updates.sort((a, b) => b.at - a.at);
  const visible = showAll ? sorted : sorted.slice(0, 2);

  return (
    <section aria-label={tr("الجديد عندكم")} className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-[#B8ADA2]">{tr("الجديد عندكم")}</h2>
        <p className="text-[13px] text-[#8F8378]">
          {updates.length === 1 ? tr("تحديث واحد") : tr("{0} تحديثات", updates.length)}
          {updates.length > 2 && (
            <>
              {" · "}
              <button type="button" onClick={() => setShowAll((v) => !v)} className="underline underline-offset-2 hover:text-[#F4F0EC]">
                {showAll ? tr("عرض أقل") : tr("عرض الكل")}
              </button>
            </>
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-stretch gap-5">{visible.map((u, i) => u.render({ ["--hu-delay" as string]: `${i * 0.25}s` }))}</div>
    </section>
  );
}
