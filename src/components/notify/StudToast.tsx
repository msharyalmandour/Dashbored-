import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useSupervisorMessages } from "../../hooks/useSupervisorMessages";
import { docDisplayName } from "../../lib/docThread";
import { formatWeekday } from "../../lib/date";
import { DocAv } from "../chat/Groups";
import { tr } from "../../lib/i18n";

/* StudToast: لما الدكتورة تحط موعد، شريط فوق الصفحة اللي الطالب فيها: «نحضر ✓» (برتقالي) و«اقترحوا وقت».
   الحضور يحدّث شريحة الطالب بكرت الموعد عند الدكتورة. يختفي بعد الرد أو الإغلاق (ويُحفظ بالجهاز). */

const KEY = "wesync.studToast.done";
const doneIds = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};

export default function StudToast() {
  const { messages, rsvps, rsvp } = useSupervisorMessages();
  const nav = useNavigate();
  const [done, setDone] = useState<string[]>(doneIds);
  const m = [...messages].reverse().find((x) => x.sender === "supervisor" && x.kind === "meeting" && !rsvps[x.id] && !done.includes(x.id) && Date.now() - Date.parse(x.createdAt) < 7 * 864e5);
  if (!m) return null;
  const p = m.payload as { date?: string; time?: string; place?: string };
  const finish = () => {
    const next = [...done, m.id].slice(-40);
    setDone(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* بدون تخزين */
    }
  };
  const docName = docDisplayName(messages);
  return (
    <div className="st-wrap" role="region" aria-label={tr("موعد جديد من الدكتورة")}>
      <div className="st-toast">
        <DocAv name={docName} size={44} />
        <div className="st-m">
          <span>{tr("{0} حطت موعد اجتماع", docName)}</span>
          <b>{[p.date ? formatWeekday(p.date) : "", p.time ?? "", p.place ?? ""].filter(Boolean).join(" · ")}</b>
        </div>
        <button type="button" className="gr-rsvp" onClick={() => (finish(), nav("/chat?g=doc"))}>
          {tr("اقترحوا وقت")}
        </button>
        <button type="button" className="gr-rsvp go" onClick={() => void rsvp(m.id, "yes").then(finish)}>
          {tr("نحضر ✓")}
        </button>
        <button type="button" className="st-x" onClick={finish} aria-label={tr("إغلاق")}>
          <X size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
