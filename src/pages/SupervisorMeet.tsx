import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MeetRoom from "../components/meet/MeetRoom";
import { joinAsGuest, meetStatus, type MeetStatus } from "../lib/meet";
import { loadTeams } from "../lib/supervisorLocal";
import { tr } from "../lib/i18n";

/** المشرف/ة يدخل اجتماع الفريق برابطه — بدون حساب */
export default function SupervisorMeet() {
  const { token = "" } = useParams<{ token: string }>();
  const nav = useNavigate();
  const [status, setStatus] = useState<MeetStatus | null>(null);
  const saved = loadTeams().find((t) => t.token === token);
  const [name] = useState(() => {
    try {
      return localStorage.getItem("wesync-supervisor-name") ?? "";
    } catch {
      return "";
    }
  });
  useEffect(() => {
    void meetStatus(token).then(setStatus);
  }, [token]);
  return (
    <MeetRoom
      title={saved?.teamName || tr("اجتماع الفريق")}
      me={name}
      guest
      getJoin={(n) => {
        try {
          localStorage.setItem("wesync-supervisor-name", n);
        } catch {
          /* بدون تخزين */
        }
        return joinAsGuest(token, n);
      }}
      status={status}
      onExit={() => nav(`/supervisor/${token}`)}
    />
  );
}
