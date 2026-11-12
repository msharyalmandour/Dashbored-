import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import MeetRoom from "../components/meet/MeetRoom";
import { DEMO_TILES } from "../components/meet/demo";
import { useAuth } from "../context/AuthContext";
import { joinAsMember, meetStatus, type MeetStatus } from "../lib/meet";
import { tr } from "../lib/i18n";

/** اجتماع الفريق (فيديو) — غرفة ثابتة لكل فريق */
export default function Meet() {
  const { currentUser, team } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<MeetStatus | null>(null);
  const demo = import.meta.env.DEV && params.get("demo") === "1";
  useEffect(() => {
    void meetStatus().then(setStatus);
  }, []);
  return (
    <MeetRoom
      title={team?.name || tr("اجتماع الفريق")}
      me={currentUser?.name ?? ""}
      getJoin={() => joinAsMember()}
      status={status}
      onExit={() => nav(-1)}
      demo={demo ? DEMO_TILES : undefined}
      afterEnd={
        <Link to="/meeting-minutes/live" className="sup-btn-cream" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
          {tr("اكتبوا المحضر")}
        </Link>
      }
    />
  );
}
