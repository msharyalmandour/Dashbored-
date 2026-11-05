import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Award, Check, Clock, Play, RotateCcw } from "lucide-react";
import { academyLevel, chapters, type Lesson } from "../data/academy";
import { useAcademy } from "../hooks/useAcademy";
import { useStartLesson } from "../components/AcademyCoach";
import { useAuth } from "../context/AuthContext";
import { useTour } from "../context/TourContext";
import { tr } from "../lib/i18n";

const rise = (i: number) => ({ ["--v3-i" as string]: i });

function Ring({ done, total }: { done: number; total: number }) {
  const size = 104;
  const sw = 9;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={tr("{0} من {1} دروس", done, total)}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id="ac-ring" x1="0" x2="1">
            <stop offset="0" stopColor="#FF6A00" />
            <stop offset="1" stopColor="#FFC777" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,240,225,.1)" strokeWidth={sw} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#ac-ring)" strokeWidth={sw} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: "stroke-dashoffset .5s ease" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <b className="block text-[26px] font-extrabold leading-none text-[#F2EBE3]" dir="ltr">
            {done}/{total}
          </b>
          <span className="text-xs text-[#ABA095]">{tr("دروس")}</span>
        </div>
      </div>
    </div>
  );
}

/** «تعلّموا Wesync»: دروس قصيرة تسوونها بأيديكم على شغلكم الحقيقي، وكل درس يكتمل لحاله من بياناتكم */
export default function Learn() {
  const { currentUser } = useAuth();
  const { signals, loaded, refresh, done, total, next, isLeader, counts } = useAcademy();
  const start = useStartLesson();
  const { startTour } = useTour();

  useEffect(() => {
    refresh(true);
  }, [refresh]);

  const level = academyLevel(done, total);
  const allDone = loaded && done >= total;
  const first = (currentUser?.name ?? "").trim().split(/\s+/)[0];

  const row = (l: Lesson, i: number) => {
    const ok = signals[l.id];
    const leaderTask = l.leaderOnly && !isLeader && !ok;
    return (
      <li key={l.id} className={`ac-row${ok ? " ok" : ""}`}>
        <span className="ac-num" aria-hidden>
          {ok ? <Check size={16} strokeWidth={3} /> : <span dir="ltr">{i + 1}</span>}
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[15px] font-bold text-[#F2EBE3]">
            {l.title}
            {ok && <span className="sr-only"> · {tr("مكتمل")}</span>}
          </p>
          <p className="m-0 mt-0.5 text-[13px] leading-relaxed text-[#ABA095]">{leaderTask ? tr("هذي يسويها قائد الفريق، ما تنحسب عليكم.") : l.why}</p>
        </div>
        {!loaded ? (
          <span className="wsa-skel h-9 w-16 rounded-full" aria-hidden />
        ) : ok ? (
          <button type="button" className="ac-mini" onClick={() => start(l.id)} aria-label={tr("راجعوا الدرس: {0}", l.title)}>
            <RotateCcw size={15} aria-hidden />
            <span className="hidden sm:inline">{tr("راجعوه")}</span>
          </button>
        ) : leaderTask ? (
          <span className="ac-tag">{tr("مهمة القائد")}</span>
        ) : (
          <button type="button" className="ac-mini go" onClick={() => start(l.id)} aria-label={tr("ابدأوا الدرس: {0}", l.title)}>
            <Play size={14} aria-hidden />
            {tr("ابدأ")}
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="mx-auto max-w-3xl">
      <header className="hg-card flex flex-col items-start gap-5 sm:flex-row sm:items-center" style={rise(0)}>
        <Ring done={loaded ? done : 0} total={total} />
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[13px] font-bold text-[#FFC777]">{loaded ? level.name : tr("نحسب تقدّمكم…")}</p>
          <h1 className="m-0 mt-1 text-[28px] font-extrabold leading-tight text-[#F2EBE3]">{tr("تعلّموا Wesync")}</h1>
          <p className="m-0 mt-2 text-[15px] leading-relaxed text-[#E9D3B8]">
            {first ? tr("{0}، كل درس دقيقة أو دقيقتين تسوونه بأيديكم على بحثكم الحقيقي، ويكتمل لحاله أول ما تسوونه.", first) : tr("كل درس دقيقة أو دقيقتين تسوونه بأيديكم على بحثكم الحقيقي، ويكتمل لحاله أول ما تسوونه.")}
          </p>
          {loaded && level.next !== null && !allDone && <p className="m-0 mt-2 text-[13px] text-[#ABA095]">{tr("باقي {0} للمستوى الجاي.", level.next - done)}</p>}
        </div>
      </header>

      {allDone ? (
        <section className="hg-card ac-cert mt-4" style={rise(1)} aria-labelledby="ac-cert-h">
          <Award size={34} className="text-[#FFC777]" aria-hidden />
          <h2 id="ac-cert-h" className="m-0 mt-3 text-[24px] font-extrabold text-[#F2EBE3]">
            {tr("صرتوا خبراء Wesync")}
          </h2>
          <p className="m-0 mt-2 text-[15px] leading-relaxed text-[#E9D3B8]">{tr("تعرفون كل شي يحتاجه فريقكم: المحادثة، الدراسات، المهام، المقترح، والمشرف/ة. علّموا اللي ما خلص من فريقكم.")}</p>
          <Link to="/" className="tc-cream mt-4">
            {tr("رجوع للرئيسية")}
          </Link>
        </section>
      ) : (
        next && (
          <section className="hg-card mt-4" style={rise(1)} aria-labelledby="ac-next-h">
            <p className="m-0 text-[13px] font-bold text-[#ABA095]">{done === 0 ? tr("ابدأوا من هنا") : tr("كمّلوا من هنا")}</p>
            <h2 id="ac-next-h" className="m-0 mt-1 text-[22px] font-extrabold text-[#F2EBE3]">
              {next.title}
            </h2>
            <p className="m-0 mt-1.5 text-[15px] leading-relaxed text-[#E9D3B8]">{next.why}</p>
            <p className="m-0 mt-2 flex items-center gap-1.5 text-[13px] text-[#ABA095]">
              <Clock size={14} aria-hidden />
              {tr("{0} دقيقة تقريبًا", next.minutes)}
            </p>
            <button type="button" className="tc-primary mt-4 w-full sm:w-auto" onClick={() => start(next.id)}>
              <Play size={17} aria-hidden />
              {tr("ابدأوا الدرس")}
            </button>
          </section>
        )
      )}

      {chapters.map((ch, ci) => {
        const mine = ch.lessons.filter(counts);
        const chDone = mine.filter((l) => signals[l.id]).length;
        return (
          <section key={ch.id} className="hg-card mt-4" style={rise(ci + 2)} aria-labelledby={`ac-ch-${ch.id}`}>
            <div className="flex items-baseline gap-2">
              <h2 id={`ac-ch-${ch.id}`} className="m-0 text-[18px] font-extrabold text-[#F2EBE3]">
                {ch.title}
              </h2>
              <span className="ms-auto text-[13px] text-[#ABA095]" dir="ltr">
                {loaded ? `${chDone}/${mine.length}` : ""}
              </span>
            </div>
            <p className="m-0 mt-0.5 text-[13px] text-[#ABA095]">{ch.sub}</p>
            <ol className="m-0 mt-3 list-none p-0">{ch.lessons.map(row)}</ol>
          </section>
        );
      })}

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 pb-4">
        <button type="button" className="tc-ghost text-[#ABA095]" onClick={startTour}>
          {tr("الجولة السريعة بالصور")}
        </button>
        <Link to="/guide" className="tc-ghost text-[#ABA095]">
          {tr("دليل الطالب")}
        </Link>
      </div>
    </div>
  );
}
