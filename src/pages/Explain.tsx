import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, Check, Download, Play, Search, ShieldCheck, Columns2, Users } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";
import { useTour } from "../context/TourContext";
import { useResearchStages } from "../hooks/useResearchStages";
import { getCurrentStage } from "../lib/progress";
import { startSeen } from "./Start";
import { useTeamStage } from "../lib/teamStage";
import { tr } from "../lib/i18n";

/* «وش هذا المكان؟» (ExplainD / ExplainM): دقيقة وحدة وتفهمون Wesync — 6 أماكن بالترتيب اللي تمشون فيه،
   والقاعدة الوحيدة: كل شي بدليل. تطلع لحالها أول زيارة، ورابطها بالقائمة. */

const ZONES = [
  { n: "01", icon: Search, title: tr("أبحث"), line: tr("تلقون دراسات وتحطونها بالمكتبة"), ex: tr("مثل: «احتراق ممرضين العناية»"), to: "/research-search", stages: ["topic", "literature-review"] },
  { n: "02", icon: Columns2, title: tr("أكتب"), line: tr("تكتبون المقترح قسم قسم، كل قسم له صاحب"), ex: tr("مثل: ريان يكتب الأدبيات"), to: "/proposal", stages: ["proposal", "research-gap", "research-questions", "methodology"] },
  { n: "03", icon: BarChart3, title: tr("أجمع وأحلّل"), line: tr("الاستبيان والبيانات والنتائج"), ex: tr("مثل: 120 رد من 3 مستشفيات"), to: "/collect", stages: ["data-collection", "analysis"] },
  { n: "04", icon: Users, title: tr("شغل الفريق"), line: tr("المهام والمحادثة، مين يسوي وش"), ex: tr("مثل: «عبّوا الجدول» لأحمد"), to: "/tasks", stages: [] },
  { n: "05", icon: ShieldCheck, title: tr("المشرف/ة"), line: tr("كلامها يصير مهام، وتعتمد المحاضر"), ex: tr("مثل: «عدّلوا البند 7»"), to: "/meeting-minutes", stages: [] },
  { n: "06", icon: Download, title: tr("ارموا أي شي"), line: tr("أي ملف أو صورة، نحطها بمكانها"), ex: tr("مثل: سكرين شوت من الواتساب"), to: "/drop", stages: [] },
];

const SEEN = (uid: string) => `wesync.explain.seen.${uid}`;
export function explainSeen(uid: string): boolean {
  try {
    return localStorage.getItem(SEEN(uid)) === "1";
  } catch {
    return true;
  }
}

export default function Explain() {
  const { currentUser, team } = useAuth();
  const { startTour } = useTour();
  const navigate = useNavigate();
  const { stages } = useResearchStages();
  const { stage } = useTeamStage(team?.id);
  const current = getCurrentStage(stages)?.stageKey;
  const hereIdx = Math.max(0, ZONES.findIndex((z) => current && z.stages.includes(current)));

  useEffect(() => {
    if (!currentUser) return;
    try {
      localStorage.setItem(SEEN(currentUser.id), "1");
    } catch {
      // ما يهم
    }
  }, [currentUser]);

  // «وش أسوي الحين؟»: فريق ما قال وين وصل → «بدأتوا قبل؟»، وإلا الرئيسية (فيها الخطوة الجاية)
  const whatNow = () => navigate(team && !stage && !startSeen(team.id) ? "/start" : "/");

  return (
    <div className="relative text-[#EAE3DC]">
      {/* الديسكتوب */}
      <div className="hidden md:block">
        <section className="ex-hero lx-in">
          <span aria-hidden className="ex-hero-glow" />
          <div className="relative max-w-[860px]">
            <div className="text-[13px] font-extrabold text-[#FFB444]">{tr("دقيقة وحدة وتفهمون كل شي")}</div>
            <h1 className="lx-h1 !text-[60px]">{tr("Wesync هو مكان بحثكم كله")}</h1>
            <p className="m-0 mt-3 text-[18px] leading-[1.85] text-[#E9D3B8]">
              {tr("بدل الواتساب والدرايف والوورد المتفرقة: بحث واحد، فريق واحد، ومشرف/ة تشوف كل شي.")} <b className="font-extrabold text-[#F2EBE3]">{tr("أنتم تشتغلون، واحنا نرتب.")}</b>
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button type="button" className="lx-go" onClick={startTour}>
                <Play size={16} aria-hidden />
                {tr("ورّيني جولة 60 ثانية")}
              </button>
              <button type="button" className="lx-ghost" onClick={whatNow}>
                {tr("وش أسوي الحين؟")}
              </button>
            </div>
          </div>
        </section>
        <div className="mb-3.5 mt-6 flex items-center gap-3">
          <span className="text-[13px] font-extrabold text-[#FFB444]">{tr("6 أماكن بس · بالترتيب اللي تمشون فيه")}</span>
          <span className="h-px flex-1 bg-[rgba(255,199,119,.22)]" aria-hidden />
        </div>
        <div className="grid grid-cols-3 gap-[18px]">
          {ZONES.map((z, i) => (
            <Link key={z.n} to={z.to} className={clsx("ex-zone lx-in", i === hereIdx && "here")} style={{ animationDelay: `${0.06 * i}s` }}>
              <span className="flex items-center justify-between">
                <span className="lx-ic lg" aria-hidden>
                  <z.icon size={19} />
                </span>
                <span className="ex-n" dir="ltr">
                  {z.n}
                </span>
              </span>
              <b className="mt-3 block text-[24px] leading-[1.3] text-[#F2EBE3]">{z.title}</b>
              <span className="mt-1 block text-[15px] text-[#E9D3B8]">{z.line}</span>
              <span className="mt-2 block text-[13px] text-[#ABA095]">{z.ex}</span>
            </Link>
          ))}
        </div>
        <section className="ex-rule lx-in mt-[18px]">
          <span className="hd-gold !h-11 !w-11" aria-hidden>
            <Check size={20} strokeWidth={3} />
          </span>
          <div className="min-w-0 flex-1 leading-[1.6]">
            <b className="block text-[18px] text-[#F2EBE3]">{tr("القاعدة الوحيدة: كل شي بدليل")}</b>
            <span className="text-[14px] text-[#E9D3B8]">{tr("المهمة تخلص لما يبان شغلها. الدراسة بالمكتبة، القسم مكتوب، المحضر معتمد. كذا الدكتورة تثق بالتقدّم.")}</span>
          </div>
        </section>
      </div>

      {/* الجوال (ExplainM) */}
      <div className="flex flex-col md:hidden">
        <span aria-hidden className="st-glow !top-[-60px]" />
        <div className="relative pt-12 text-center">
          <div className="text-[13px] font-extrabold text-[#FFB444]">{tr("دقيقة وحدة")}</div>
          <h1 className="lx-h1 !text-[34px]">{tr("مكان بحثكم كله")}</h1>
          <p className="m-0 mt-1 text-[15px] text-[#E9D3B8]">{tr("أنتم تشتغلون، واحنا نرتب.")}</p>
        </div>
        <div className="relative mt-5 flex flex-col gap-3">
          {ZONES.map((z, i) => (
            <Link key={z.n} to={z.to} className="ex-mrow lx-in" style={{ animationDelay: `${0.06 * i}s` }}>
              <span className="lx-ic lg" aria-hidden>
                <z.icon size={18} />
              </span>
              <span className="min-w-0 flex-1 leading-[1.45]">
                <b className="block text-[17px] text-[#F2EBE3]">{z.title}</b>
                <span className="block text-[13px] text-[#E9D3B8]">{z.line}</span>
              </span>
              <span className="text-[14px] font-extrabold text-[#C9A273]" dir="ltr">
                {z.n}
              </span>
            </Link>
          ))}
        </div>
        <div className="ex-rule mt-4 !px-4 !py-3">
          <span className="hd-gold" aria-hidden>
            <Check size={16} strokeWidth={3} />
          </span>
          <b className="flex-1 text-[14px] text-[#F2EBE3]">{tr("القاعدة الوحيدة: كل شي بدليل")}</b>
        </div>
        <button type="button" className="st-go mt-6 w-full" onClick={startTour}>
          {tr("ورّيني جولة 60 ثانية")}
        </button>
        <button type="button" className="mx-auto mt-1 min-h-[44px] text-[14px] text-[#ABA095]" onClick={whatNow}>
          {tr("وش أسوي الحين؟")}
        </button>
      </div>
    </div>
  );
}
