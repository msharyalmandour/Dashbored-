import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { GoogleDriveLogo, GoogleLogo } from "../components/ui/BrandLogos";
import { getDriveStatus, startMemberJoin, type DriveStatus } from "../lib/driveTeam";
import { isLinked, useDriveMembers } from "../lib/driveMembers";
import { tr } from "../lib/i18n";

/* «اربط درايفك بالفريق» (DriveInviteM): شاشة وحدة بتسجيل Google — نطلب drive.file بس،
   ونوعد إننا نوصل لمجلد البحث بس، ونقول كم واحد من الزملاء ربطوا. */
export default function DriveJoin() {
  const { currentUser } = useAuth();
  const { roster } = useTeamRoster();
  const { rows } = useDriveMembers();
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void getDriveStatus().then(setStatus);
  }, []);

  const leader = useMemo(() => roster.find((m) => m.role === "leader"), [roster]);
  const inviter = (status?.connectedByName || leader?.name || "").split(" ")[0];
  const mine = rows?.find((r) => r.kind === "member" && r.profile_id === currentUser?.id);
  const done = mine?.status === "connected";
  const others = (rows ?? []).filter((r) => r.kind === "member" && r.profile_id !== currentUser?.id && isLinked(r.status)).length;

  const join = async () => {
    setBusy(true);
    setErr(null);
    const r = await startMemberJoin();
    if (r.data?.url) {
      window.location.href = r.data.url;
      return;
    }
    setBusy(false);
    setErr(r.error === "not_connected" ? tr("القائد لسه ما ربط درايف الفريق. أول ما يربطه ترجعون هنا.") : tr("ما قدرنا نبدأ الربط. جرّبوا مرة ثانية."));
  };

  return (
    <div className="relative mx-auto flex min-h-[calc(100dvh-220px)] md:min-h-0 max-w-[440px] flex-col text-[#EAE3DC]">
      <span aria-hidden className="st-glow !top-[-80px]" />
      <div className="relative flex items-center justify-center gap-4 pt-8">
        <span className="lx-orb !h-16 !w-16" aria-hidden />
        <span className="h-[2px] w-10 bg-gradient-to-l from-[#FFC777] to-[#FF7A1A]" aria-hidden />
        <span className="dj-tile" aria-hidden>
          <GoogleDriveLogo size={34} />
        </span>
      </div>
      <div className="relative mt-6 text-center">
        {inviter && <div className="text-[13px] font-extrabold text-[#FFB444]">{tr("{0} يدعوك", inviter)}</div>}
        <h1 className="lx-h1 !text-[32px]">{tr("اربط درايفك بالفريق")}</h1>
        <p className="m-0 mt-2 text-[15px] leading-[1.8] text-[#E9D3B8]">
          {tr("عشان ملفاتك تنحفظ بمجلد الفريق، والدكتورة تشوفها.")}
          <br />
          {tr("ما نشوف ملفاتك الثانية.")}
        </p>
      </div>
      <ul className="dj-list relative m-0 mt-6 list-none p-0">
        {[tr("نوصل لمجلد البحث بس"), tr("تقدر تفك الربط بأي وقت"), others === 1 ? tr("واحد من زملائك ربط") : tr("{0} من زملائك ربطوا", others)].map((t) => (
          <li key={t}>
            <span className="st-tick !h-[22px] !w-[22px]" aria-hidden>
              <Check size={12} strokeWidth={3} />
            </span>
            {t}
          </li>
        ))}
      </ul>
      <span className="min-h-8 flex-1 md:flex-none" />
      {err && (
        <p className="m-0 mb-3 text-center text-[14px] text-[#FF8A7A]" role="alert">
          {err}
        </p>
      )}
      {done ? (
        <Link to="/drive" className="ph-show !mt-0">
          <Check size={17} strokeWidth={3} aria-hidden />
          {tr("درايفك مربوط · شوفوا المجلد")}
        </Link>
      ) : (
        <button type="button" className="ph-show !mt-0" disabled={busy || status?.connected === false} onClick={() => void join()}>
          <GoogleLogo size={18} />
          {busy ? tr("نفتح Google…") : tr("اربط بحساب Google")}
        </button>
      )}
      {status && !status.connected && <p className="m-0 mt-3 text-center text-[13px] text-[#ABA095]">{tr("القائد لسه ما ربط درايف الفريق.")}</p>}
    </div>
  );
}
