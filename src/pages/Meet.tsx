import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PhoneCall } from "lucide-react";
import MeetRoom from "../components/meet/MeetRoom";
import MeetMinutesButton from "../components/meet/MeetMinutesButton";
import { DEMO_TILES } from "../components/meet/demo";
import { useAuth } from "../context/AuthContext";
import { useMeetCall } from "../hooks/useMeetCall";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { joinAsMember, meetStatus, type MeetStatus } from "../lib/meet";
import { tr } from "../lib/i18n";

/** اجتماع الفريق (فيديو) — غرفة ثابتة لكل فريق، و«ويسي يتصل» على اللي مو موجود */
export default function Meet() {
  const { currentUser, team } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<MeetStatus | null>(null);
  const [callTeam, setCallTeam] = useState<boolean | null>(null);
  const [rangNote, setRangNote] = useState("");
  const mc = useMeetCall();
  const { roster } = useTeamRoster();
  const demo = import.meta.env.DEV && params.get("demo") === "1";
  const callParam = params.get("call");
  useEffect(() => {
    void meetStatus().then(setStatus);
  }, []);
  useEffect(() => {
    if (!rangNote) return;
    const t = setTimeout(() => setRangNote(""), 6000);
    return () => clearTimeout(t);
  }, [rangNote]);

  // الافتراضي: لو ما أحد داخل، ويسي يتصل على الفريق لما تدخل
  const wantCall = callTeam ?? !status?.live;
  const first = (id: string) => roster.find((m) => m.id === id)?.name.split(/\s+/)[0] ?? "";

  const onJoined = async () => {
    const active = callParam ?? (mc.call && Date.now() - Date.parse(mc.call.createdAt) < 20 * 60_000 ? mc.call.id : null);
    if (active) return void mc.answer("join", "", active);
    if (!wantCall) return;
    const r = await mc.ring("join");
    if (r?.callId) {
      void mc.answer("join", "", r.callId);
      setRangNote(r.rang ? tr("ويسي اتصل على الفريق 📞 ({0} إشعار)", r.rang) : tr("ويسي اتصل على الفريق 📞"));
    }
  };
  const ringAgain = async () => {
    const r = await mc.ring("manual");
    setRangNote(r?.callId ? (r.reused ? tr("ويسي اتصل عليهم قبل شوي — جرّبوا بعد دقيقتين") : tr("ويسي اتصل على اللي مو موجودين 📞")) : tr("ما قدر ويسي يتصل الحين"));
  };

  const others = mc.answers.filter((a) => a.profileId !== mc.me && first(a.profileId));
  const apologies = mc.answers.filter((a) => a.answer === "cant").map((a) => ({ name: roster.find((m) => m.id === a.profileId)?.name ?? "", reason: a.reason })).filter((a) => a.name);

  return (
    <MeetRoom
      title={team?.name || tr("اجتماع الفريق")}
      me={currentUser?.name ?? ""}
      getJoin={() => joinAsMember()}
      status={status}
      onExit={() => nav(-1)}
      demo={demo ? DEMO_TILES : undefined}
      onJoined={() => void onJoined()}
      preJoinExtra={
        !callParam && (
          <label className="mt-hint" style={{ display: "flex", alignItems: "center", gap: 10, minHeight: 44, marginTop: 10, cursor: "pointer", color: "#E9D3B8", fontSize: 14 }}>
            <input type="checkbox" checked={wantCall} onChange={(e) => setCallTeam(e.target.checked)} style={{ width: 20, height: 20, accentColor: "#FFC777" }} />
            {tr("ويسي يتصل على الفريق لما تدخل 📞")}
          </label>
        )
      }
      roomExtra={
        (others.length > 0 || rangNote) && (
          <div className="mt-answers" role="status">
            {rangNote && <span className="join">{rangNote}</span>}
            {others.map((a) => (
              <span key={a.profileId} className={a.answer}>
                {a.answer === "join" ? tr("{0} ✓", first(a.profileId)) : a.answer === "later" ? tr("{0}: «بعد 5 دقايق»", first(a.profileId)) : a.reason ? tr("{0}: «ما أقدر · {1}»", first(a.profileId), a.reason) : tr("{0}: «ما أقدر»", first(a.profileId))}
              </span>
            ))}
          </div>
        )
      }
      barExtra={
        !demo && (
          <button type="button" className="mt-btn" aria-label={tr("ويسي يتصل على اللي مو موجودين")} title={tr("ويسي يتصل على اللي مو موجودين")} onClick={() => void ringAgain()}>
            <PhoneCall size={20} aria-hidden />
          </button>
        )
      }
      afterEnd={(info) => <MeetMinutesButton info={info} apologies={apologies} title={team?.name ? tr("اجتماع {0}", team.name) : tr("اجتماع الفريق")} />}
    />
  );
}
