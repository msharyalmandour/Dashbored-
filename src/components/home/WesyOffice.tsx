import { useState } from "react";
import Wesy from "../brand/Wesy";
import WLogo from "../brand/WLogo";
import NextCard from "./NextCard";
import ShareAchievement from "../ShareAchievement";
import { useDoors } from "../../hooks/useDoors";
import { useDocWaiting } from "../../hooks/useDocWaiting";
import { useResearchProject } from "../../hooks/useResearchProject";
import { useSupervisorMessages } from "../../hooks/useSupervisorMessages";
import { useAuth } from "../../context/AuthContext";
import { journeyStep } from "../../lib/doors";
import { docDisplayName } from "../../lib/docThread";
import { nextState, wesyFor } from "../../lib/nextState";
import type { NextStep } from "../../lib/nextSteps";
import { tr } from "../../lib/i18n";

/* مكتب ويسي (CeoHomeD / CeoHomeM): الرئيس التنفيذي جالس قدام لابتوبه، وراه شباك فيه غروب الرياض وبرج المملكة،
   مكتبة كتب بألوان الهوية (كمبيوتر بس)، هالة لمبة دافية، ومكتب خشب داكن عليه لوحة ذهبية.
   كرت «الجاي لكم» فوق المشهد بخلفية صلبة #100906 (يسار المشهد بالكمبيوتر، وتحته بالجوال).
   ويسي يتحرك مرة وحدة لما تنفتح الصفحة ويهدى (settleAfter)، وحالته حسب حالة الكرت. */

function Skyline() {
  return (
    <svg className="wo-sky" viewBox="0 0 400 260" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id="wo-dusk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2A0E05" />
          <stop offset=".55" stopColor="#B4430B" />
          <stop offset=".85" stopColor="#FF7A1A" />
          <stop offset="1" stopColor="#FFB547" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" fill="url(#wo-dusk)" />
      <circle cx="300" cy="215" r="34" fill="#FFC777" opacity=".55" />
      <g fill="#140805">
        <rect x="0" y="200" width="40" height="60" />
        <rect x="34" y="176" width="26" height="84" />
        <rect x="64" y="210" width="34" height="50" />
        {/* برج المملكة: قاعدة تضيق وقوس مفتوح فوق */}
        <path d="M150 260 L160 120 Q166 72 176 60 Q186 72 192 120 L202 260 Z M168 96 Q176 112 184 96 Q182 74 176 68 Q170 74 168 96 Z" fillRule="evenodd" />
        <rect x="214" y="190" width="30" height="70" />
        <rect x="248" y="168" width="22" height="92" />
        <rect x="276" y="206" width="44" height="54" />
        <rect x="326" y="186" width="26" height="74" />
        <rect x="356" y="214" width="44" height="46" />
      </g>
    </svg>
  );
}

function Shelf() {
  const books = ["#E9651F", "#FFC777", "#7A2E1C", "#F2EBE3", "#B4430B", "#FFB547", "#3A1504"];
  return (
    <div className="wo-shelf" aria-hidden>
      {[0, 1, 2].map((r) => (
        <div key={r} className="wo-row">
          {books.map((_, i) => (
            <i key={i} style={{ background: books[(i + r * 2) % books.length], height: `${70 + ((i * 7 + r * 11) % 26)}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function WesyOffice({ urgent, fallback }: { urgent?: NextStep; fallback?: NextStep }) {
  const { mode, team } = useAuth();
  const doors = useDoors();
  const waiting = useDocWaiting();
  const { project, updateProject } = useResearchProject();
  const { messages } = useSupervisorMessages();
  const [share, setShare] = useState(false);
  const docName = docDisplayName(messages);
  const loading = mode === "supabase" && !!team && !doors.signals;
  const step = doors.signals ? journeyStep(doors.signals, doors.open) : null;
  const state = nextState({ loading, topic: project?.title ?? "", waitingDoc: waiting, step });
  const w = wesyFor(state, docName);

  return (
    <section className="wo" aria-label={tr("مكتب ويسي")}>
      <div className="wo-scene" aria-hidden>
        <div className="wo-window">
          <Skyline />
        </div>
        <Shelf />
        <div className="wo-lamp" />
        <div className="wo-desk" />
        <div className="wo-wesy">
          <Wesy state={w.state} size={300} shadow={false} label={tr("ويسي، الرئيس التنفيذي")} />
          <div className="wo-laptop">
            <WLogo tone="bare" size={64} className="wo-w" />
          </div>
          <span className="wo-cup" />
        </div>
        <span className="wo-plaque">{tr("ويسي · الرئيس التنفيذي")}</span>
      </div>
      <p className="wo-bubble" role="status">
        {w.line}
      </p>
      <div className="wo-card">
        <NextCard
          state={state}
          signals={doors.signals}
          open={doors.open}
          urgent={urgent}
          fallback={fallback}
          docName={docName}
          onTopic={async (t) => {
            await updateProject({ title: t });
            return true;
          }}
          onAchieve={() => setShare(true)}
        />
      </div>
      {share && <ShareAchievement title={tr("خلّصنا البحث")} sub={tr("رحلة كاملة من الموضوع للتسليم")} step={10} onClose={() => setShare(false)} />}
    </section>
  );
}
