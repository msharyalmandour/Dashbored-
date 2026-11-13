import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { GoogleDriveLogo } from "./ui/BrandLogos";
import { getDriveStatus, type DriveStatus } from "../lib/driveTeam";
import { isLinked, useDriveMembers } from "../lib/driveMembers";
import { tr } from "../lib/i18n";

/** شريط ذهبي بالرئيسية والاجتماعات لين يرتبط الفريق كله بالدرايف (5 من 5) */
export default function DriveStrip({ className = "" }: { className?: string }) {
  const { roster } = useTeamRoster();
  const { rows, notReady } = useDriveMembers();
  const [status, setStatus] = useState<DriveStatus | null>(null);
  useEffect(() => {
    void getDriveStatus().then(setStatus);
  }, []);

  const info = useMemo(() => {
    if (!status?.configured || notReady || !rows) return null;
    if (!status.connected) return { linked: 0, total: roster.length + 1, missing: [] as string[] };
    const sup = rows.find((r) => r.kind === "supervisor");
    const people = [
      ...roster.map((m) => ({ name: m.name.split(" ")[0], linked: isLinked(rows.find((r) => r.kind === "member" && r.profile_id === m.id)?.status ?? "missing_email") })),
      { name: tr("المشرف/ة"), linked: !!sup && isLinked(sup.status) },
    ];
    return { linked: people.filter((p) => p.linked).length, total: people.length, missing: people.filter((p) => !p.linked).map((p) => p.name) };
  }, [status, rows, notReady, roster]);

  if (!info || info.linked >= info.total) return null;
  return (
    <Link to="/drive" className={`dv-strip lx-in ${className}`}>
      <GoogleDriveLogo size={22} />
      <span className="min-w-0 flex-1 leading-[1.45]">
        <b className="block text-[15px]">{status?.connected ? tr("الدرايف: {0} من {1} مربوطين", info.linked, info.total) : tr("درايف الفريق مو مربوط")}</b>
        <span className="block truncate text-[13px] text-[#E9D3B8]">{status?.connected ? tr("باقي: {0}", info.missing.join(tr("، "))) : tr("اربطوه عشان كل ملف ينحفظ بمجلد الفريق")}</span>
      </span>
      <span className="text-[13px] font-extrabold text-[#FFC777]">{tr("كمّلوا الربط")}</span>
      <ChevronLeft size={16} className="text-[#FFC777] ltr:rotate-180" aria-hidden />
    </Link>
  );
}
