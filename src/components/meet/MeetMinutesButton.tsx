import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTeamRoster } from "../../hooks/useTeamRoster";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import { loadDraft, saveDraft } from "../../lib/minutesLive";
import { draftFromMeeting, transcriptForAi, wordCount, type AiMinutes } from "../../lib/meetTranscript";
import { track } from "../../lib/analytics";
import { tr } from "../../lib/i18n";
import type { MeetEndInfo } from "./MeetRoom";

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** بعد الاجتماع: ويسي يكتب المحضر من النص ← «وضع الاجتماع» للمراجعة والحفظ (ولا شي ينحفظ بدون الفريق) */
export default function MeetMinutesButton({ info, title }: { info: MeetEndInfo; title: string }) {
  const { team } = useAuth();
  const { roster } = useTeamRoster();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const enough = wordCount(info.lines) >= 12;

  const manual = (
    <Link to="/meeting-minutes/live" className={enough ? "sup-btn-ghost" : "sup-btn-cream"} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
      {tr("اكتبوا المحضر بأنفسكم")}
    </Link>
  );
  if (!enough || !team) return manual;

  const write = async () => {
    setBusy(true);
    setNote("");
    let ai: AiMinutes | null = null;
    let reason = "";
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase!.functions.invoke("chat-intel", { body: { action: "meeting", text: transcriptForAi(info.lines) } });
        if (!error && data) {
          const d = data as Partial<AiMinutes> & { reason?: string };
          reason = d.reason ?? "";
          ai = { gist: d.gist ?? "", items: d.items ?? [] };
        }
      } catch {
        /* نرجع للكتابة اليدوية */
      }
    }
    if (!ai || (!ai.gist && !ai.items.length)) {
      setBusy(false);
      return setNote(
        reason === "read_only"
          ? tr("ويسي يكتب المحضر مع الاشتراك. تقدرون تكتبونه بأنفسكم، وتنزّلون النص تحت.")
          : reason === "ai_limit"
            ? tr("خلص حد ويسي لهالشهر. اكتبوا المحضر بأنفسكم، والنص تقدرون تنزّلونه تحت.")
            : tr("ويسي ما قدر يطلع محضر من هالنص. اكتبوه بأنفسكم، أو جرّبوا مرة ثانية."),
      );
    }
    const draft = draftFromMeeting(
      ai,
      {
        title,
        startedAt: info.startedAt ?? info.lines[0]?.at ?? info.endedAt,
        endedAt: info.endedAt,
        roster: roster.map((m) => ({ id: m.id, name: m.name })),
        present: info.people,
        supervisorName: tr("الدكتورة"),
        existing: loadDraft(team.id),
      },
      uid,
    );
    saveDraft(team.id, draft);
    track("meet_minutes_ai", { lines: info.lines.length, items: ai.items.length });
    nav("/meeting-minutes/live");
  };

  return (
    <>
      <button type="button" className="sup-btn-cream" style={{ width: "100%", minHeight: 48 }} disabled={busy} onClick={() => void write()}>
        {busy ? tr("ويسي يكتب المحضر…") : tr("ويسي يكتب المحضر من النص")}
      </button>
      {note && (
        <p className="mt-hint" role="status" style={{ color: "#E9D3B8" }}>
          {note}
        </p>
      )}
      {manual}
    </>
  );
}
