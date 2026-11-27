import { useEffect, useState } from "react";
import { Bell, BookOpen, Coffee, GraduationCap, Image as ImageIcon, KeyRound, ScrollText, Stamp, type LucideIcon } from "lucide-react";
import { useAcademy } from "../../hooks/useAcademy";
import { itemLesson, officeItemIds, type OfficeItemId } from "../../data/wesyNeeds";
import { WesyFigure } from "../brand/Wesy";
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
import { seasonOf } from "../../lib/season";
import { wesyMood } from "../../lib/wesyMood";
import { useAcademicCalendar } from "../../hooks/useAcademicCalendar";
import type { NextStep } from "../../lib/nextSteps";
import { tr } from "../../lib/i18n";

/* مكتب ويسي (CeoHomeD / CeoHomeM): الرئيس التنفيذي (الرسمة الكرتونية البسيطة) واقف يسلّم ورا لابتوبه، وراه شباك فيه غروب الرياض وبرج المملكة،
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

const ITEM_ICON: Record<OfficeItemId, LucideIcon> = {
  photo: ImageIcon,
  bell: Bell,
  cup: Coffee,
  key: KeyRound,
  books: BookOpen,
  stamp: Stamp,
  papers: ScrollText,
  cap: GraduationCap,
};
const BOOKS = ["#E9651F", "#FFC777", "#7A2E1C", "#F2EBE3", "#B4430B", "#FFB547", "#3A1504"];

/** رف ويسي: كل ما ساعدوه بشي (درس من الأكاديمية) تنحط قطعة على الرف مكان كتاب.
    القطعة الجديدة تطلع بحركة وحدة بس (مرة)، والباقي ثابت. */
function Shelf({ earned, fresh }: { earned: Set<OfficeItemId>; fresh: OfficeItemId | null }) {
  const rows = [officeItemIds.slice(0, 3), officeItemIds.slice(3, 6), officeItemIds.slice(6)];
  return (
    <div className="wo-shelf" aria-hidden>
      {rows.map((row, r) => (
        <div key={r} className="wo-row">
          {row.map((id, i) => {
            if (!earned.has(id)) {
              return (
                <i key={id} style={{ background: BOOKS[(i + r * 2) % BOOKS.length], height: `${70 + ((i * 7 + r * 11) % 26)}%` }} />
              );
            }
            const Icon = ITEM_ICON[id];
            return (
              <b key={id} className={id === fresh ? "wo-item fresh" : "wo-item"}>
                <Icon size={18} strokeWidth={1.8} />
              </b>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const SEEN_ITEMS = "wesync.office.seen";
/** القطع اللي انضافت من آخر مرة شافوا المكتب — وحدة بس تتحرك */
function useOfficeItems() {
  const { signals, loaded, refresh } = useAcademy();
  useEffect(() => {
    if (!loaded) refresh();
  }, [loaded, refresh]);
  const earned = new Set(officeItemIds.filter((id) => signals[itemLesson(id)]));
  const [fresh] = useState<OfficeItemId | null>(() => {
    try {
      const seen = new Set(JSON.parse(localStorage.getItem(SEEN_ITEMS) ?? "[]") as string[]);
      return officeItemIds.find((id) => signals[itemLesson(id)] && !seen.has(id)) ?? null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(SEEN_ITEMS, JSON.stringify([...earned]));
    } catch {
      /* ما يهم */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, earned.size]);
  return { earned, fresh: loaded ? fresh : null };
}

/** صوت ويسي الصباحي (B05VoiceM): 7:30–11 الصبح، سطر قصير عن خطوة اليوم. الصوت ينتظر مفتاح خدمة تحويل النص لصوت،
    فالحين «اقرأوه بس». يطفى من × (ويتذكر بالجهاز). */
const MORNING_KEY = "wesync.morningVoice";
function MorningNote({ text }: { text: string }) {
  const [off, setOff] = useState(() => {
    try {
      return localStorage.getItem(MORNING_KEY) === "off";
    } catch {
      return false;
    }
  });
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  if (off || mins < 7 * 60 + 30 || mins >= 11 * 60) return null;
  return (
    <div className="wo-morning" role="note">
      <span className="wo-morning-k">{tr("صباحية ويسي · اقرأوه بس")}</span>
      <span className="wo-morning-t">{text}</span>
      <button
        type="button"
        aria-label={tr("أوقفوا صباحية ويسي")}
        onClick={() => {
          setOff(true);
          try {
            localStorage.setItem(MORNING_KEY, "off");
          } catch {
            /* ما يهم */
          }
        }}
      >
        ×
      </button>
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
  const office = useOfficeItems();
  const docName = docDisplayName(messages);
  const loading = mode === "supabase" && !!team && !doors.signals;
  const step = doors.signals ? journeyStep(doors.signals, doors.open) : null;
  const state = nextState({ loading, topic: project?.title ?? "", waitingDoc: waiting, step });
  const { events } = useAcademicCalendar();
  const season = seasonOf(events);
  const mood = wesyMood({ deadlines: events.filter((e) => e.kind === "deadline").map((e) => `${e.startsOn}T23:59:00+03:00`) });
  const base = wesyFor(state, docName);
  // الموسم يغلب حالة الكرت العادية (منتصف) — بس ما يغطي يوم أول ولا التحميل ولا الخلاص
  const w = season.kind !== "normal" && (state === "middle" || state === "waiting") ? { state: season.state ?? base.state, line: season.line ?? base.line } : base;
  const outfit = season.outfit ?? mood.outfit;

  return (
    <section className={season.dim ? "wo dim" : "wo"} aria-label={tr("مكتب ويسي")}>
      <div className="wo-scene" aria-hidden>
        <div className="wo-window">
          <Skyline />
        </div>
        <Shelf earned={office.earned} fresh={office.fresh} />
        <div className="wo-lamp" />
        <div className="wo-desk" />
        <div className="wo-wesy">
          <div className="wo-wesy-cut">
            <WesyFigure label={tr("ويسي، الرئيس التنفيذي")} playKey={`${w.state}-${outfit}`} />
          </div>
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
      {state === "middle" && <MorningNote text={tr("صباح الخير ☕ خطوة اليوم وحدة: {0}.", (urgent?.title ?? fallback?.title ?? tr("كمّلوا من «الجاي لكم»")))} />}
      {share && <ShareAchievement title={tr("خلّصنا البحث")} sub={tr("رحلة كاملة من الموضوع للتسليم")} step={10} onClose={() => setShare(false)} />}
    </section>
  );
}
