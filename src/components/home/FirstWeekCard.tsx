import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BellRing, BookOpen, Check, Link2, MessageCircle, PenLine, Plus, ShieldCheck, Table2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTeamRoster } from "../../hooks/useTeamRoster";
import { useEvidencePapers } from "../../hooks/useEvidencePapers";
import { useResearchProject } from "../../hooks/useResearchProject";
import { getMyEmailStatus, type EmailStatus } from "../../lib/supervisorEmail";
import { publicBase } from "../../lib/publicUrl";
import Avatar from "../ui/Avatar";
import { tr } from "../../lib/i18n";

const LOCAL_DISMISS = (teamId: string) => `wesync.firstWeek.done.${teamId}`;

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    // ما يهم
  }
};

type StepKey = "invite" | "topic" | "paper" | "table" | "sup";
interface Step {
  key: StepKey;
  n: number;
  done: boolean;
  label: string;
  hint: string;
}

/** «أول أسبوع»: خمس خطوات توصّل الفريق لأول نجاح حقيقي، كل خطوة محسوبة من بيانات الفريق نفسها (مو من ضغطة).
    القائد لو لحاله: الدعوة هي الخطوة الحالية مع واتساب، وبعد ٤٨ ساعة من إنشاء الفريق بدون أحد يطلع تذكير لطيف. */
export default function FirstWeekCard({ style }: { style?: CSSProperties }) {
  const { team, currentUser, isLeader, mode, dismissFirstWeek } = useAuth();
  const { roster, loading: rosterLoading } = useTeamRoster();
  const { papers } = useEvidencePapers();
  const { project } = useResearchProject();
  const [email, setEmail] = useState<EmailStatus | null>(null);
  const [copied, setCopied] = useState<"team" | "sup" | null>(null);
  const [localHidden, setLocalHidden] = useState(() => (team ? read(LOCAL_DISMISS(team.id)) === "1" : false));

  useEffect(() => {
    if (mode === "supabase") getMyEmailStatus().then(setEmail);
  }, [mode]);

  if (!team || !currentUser || localHidden || team.firstWeekDismissedAt || rosterLoading) return null;

  const teamLink = `${publicBase()}#/login?team=${team.id}`;
  const supLink = team.shareToken ? `${publicBase()}#/supervisor/${team.shareToken}` : "";
  const solo = roster.length <= 1;
  const waitedTwoDays = !!team.createdAt && Date.now() - new Date(team.createdAt).getTime() > 48 * 3600e3;
  const nudge = solo && isLeader && waitedTwoDays;
  const copy = async (what: "team" | "sup", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // المتصفح رفض النسخ
    }
  };
  const teamWa = `https://wa.me/?text=${encodeURIComponent(
    nudge
      ? tr("تذكير: انضموا لفريق بحثنا على Wesync، الرابط هنا وكل اللي عليكم تفتحونه: {0}", teamLink)
      : tr("انضموا لفريق بحثنا على Wesync عشان نشتغل على البحث مع بعض: {0}", teamLink),
  )}`;
  const supWa = supLink ? `https://wa.me/?text=${encodeURIComponent(tr("السلام عليكم، هذا رابط متابعة بحثنا على Wesync (بدون حساب): {0}", supLink))}` : "";

  const steps: Step[] = [
    { key: "invite", n: 1, done: !solo, label: tr("ادعوا فريقكم"), hint: tr("رابط واحد، وكل من يفتحه يدخل فريقكم على طول.") },
    { key: "topic", n: 2, done: !!project?.title?.trim(), label: tr("اكتبوا موضوعكم"), hint: tr("سطر واحد يكفي الحين، تقدرون تعدّلونه بعدين.") },
    { key: "paper", n: 3, done: papers.length > 0, label: tr("أضيفوا أول دراسة"), hint: tr("دوّروا دراسة وحدة عن موضوعكم وحطوها بالمكتبة. وحدة وكافي.") },
    { key: "table", n: 4, done: papers.some((p) => !!(p.country || p.aim || p.sample || p.dataCollection)), label: tr("عبّوا أول صف بجدول الأدبيات"), hint: tr("من الدراسة اللي أضفتوها: الهدف، العينة، والنتيجة.") },
    { key: "sup", n: 5, done: !!email && email.state !== "none", label: tr("ادعوا المشرف/ة"), hint: tr("رابط واحد بدون حساب: تشوف تقدّمكم وتعلّق.") },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  // القائد لحاله: الدعوة هي الحالية؛ غير كذا أول خطوة ما خلصت بالترتيب
  const current = solo && isLeader ? steps[0] : steps.find((s) => !s.done);
  const upcoming = steps.filter((s) => !s.done && s !== current);
  const finished = steps.filter((s) => s.done && s !== current);

  const hide = async () => {
    const { error } = await dismissFirstWeek();
    // قبل تشغيل ملف SQL: نخفيه بهالجهاز بس
    if (error) {
      write(LOCAL_DISMISS(team.id), "1");
      setLocalHidden(true);
    }
  };

  if (allDone) {
    return (
      <section className="fw-card hg-card relative mb-2.5 lg:mb-0" style={style} aria-labelledby="fw-h">
        <div className="flex gap-2" aria-hidden>
          {steps.map((s) => (
            <span key={s.key} className="fw-dot done">
              <Check size={14} strokeWidth={3} />
            </span>
          ))}
        </div>
        <h2 id="fw-h" className="m-0 mt-4 text-[26px] font-extrabold leading-snug text-[#F2EBE3]">
          {tr("خلصتوا أول أسبوع")}
        </h2>
        <p className="m-0 mt-2 text-[15px] leading-relaxed text-[#E9D3B8]">{tr("الفريق كامل، والموضوع مكتوب، وأول دراسة بالجدول، والمشرف/ة معكم. من هنا يبدأ الشغل الحقيقي.")}</p>
        <button type="button" className="tc-ghost mt-3 !px-0 text-[#ABA095]" onClick={hide}>
          {tr("أخفوا الكرت")}
        </button>
      </section>
    );
  }

  const linkBtn = (to: string, label: string, icon: ReactNode) => (
    <Link to={to} className="tc-primary fw-orange w-full">
      {icon}
      {label}
    </Link>
  );

  const action = (s: Step): ReactNode => {
    if (s.key === "invite") {
      if (!isLeader) return <p className="m-0 text-[13px] text-[#ABA095]">{tr("القائد يرسل رابط الفريق.")}</p>;
      return (
        <div className="flex flex-col gap-2">
          {solo && (
            <div className="flex items-center gap-3">
              <span className="flex items-center" aria-hidden>
                <Avatar initials="" name={currentUser.name} avatar={currentUser.avatar} px={36} />
                {[0, 1, 2].map((i) => (
                  <span key={i} className="tc-slot !h-9 !w-9 !-ms-1.5">
                    <Plus size={14} />
                  </span>
                ))}
              </span>
              <span className="text-[13px] font-bold text-[#ABA095]">{tr("أنت لحالك للحين")}</span>
            </div>
          )}
          <a href={teamWa} target="_blank" rel="noreferrer" className="tc-cream w-full">
            <MessageCircle size={18} aria-hidden />
            {nudge ? tr("ذكّروهم بواتساب") : tr("أرسلوا الدعوة بواتساب")}
          </a>
          <button type="button" className="tc-ghost self-center text-[#FFC777]" onClick={() => copy("team", teamLink)}>
            {copied === "team" ? <Check size={16} aria-hidden /> : <Link2 size={16} aria-hidden />}
            {copied === "team" ? tr("انتسخ") : tr("انسخوا الرابط")}
          </button>
        </div>
      );
    }
    if (s.key === "topic") return linkBtn("/proposal", tr("اكتبوا الموضوع"), <PenLine size={18} aria-hidden />);
    if (s.key === "paper") return linkBtn("/evidence", tr("أضيفوا أول دراسة"), <BookOpen size={18} aria-hidden />);
    if (s.key === "table") return linkBtn("/literature-review", tr("افتحوا الجدول"), <Table2 size={18} aria-hidden />);
    if (!isLeader || !supLink) return <p className="m-0 text-[13px] text-[#ABA095]">{tr("القائد يرسل الرابط للمشرف/ة.")}</p>;
    return (
      <div className="flex flex-col gap-2">
        <a href={supWa} target="_blank" rel="noreferrer" className="tc-cream w-full">
          <MessageCircle size={18} aria-hidden />
          {tr("أرسلوا الرابط للمشرف/ة")}
        </a>
        <button type="button" className="tc-ghost self-center text-[#FFC777]" onClick={() => copy("sup", supLink)}>
          {copied === "sup" ? <Check size={16} aria-hidden /> : <Link2 size={16} aria-hidden />}
          {copied === "sup" ? tr("انتسخ") : tr("انسخوا الرابط")}
        </button>
        <p className="m-0 flex items-start gap-1.5 text-[13px] leading-relaxed text-[#ABA095]">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#FFC777]" aria-hidden />
          {tr("تشوف بس، وتعلّق وتعتمد. ما تقدر تعدّل على شغلكم.")}
        </p>
      </div>
    );
  };

  return (
    <section className="fw-card hg-card relative mb-2.5 lg:mb-0" style={style} aria-labelledby="fw-h">
      <div className="flex items-center justify-between">
        <h2 id="fw-h" className="m-0 text-[20px] font-extrabold text-[#F2EBE3]">
          {tr("أول أسبوع")}
        </h2>
        <span className="text-[15px] font-extrabold" dir="ltr">
          <span className="text-[#FFC777]">{doneCount}</span>
          <span className="text-[#ABA095]">/{steps.length}</span>
        </span>
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]"
        role="progressbar"
        aria-valuenow={doneCount}
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-label={tr("تقدّم أول أسبوع")}
      >
        <div className="fw-bar h-full rounded-full" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>

      {nudge && (
        <p className="fw-nudge" role="status">
          <BellRing size={17} className="mt-0.5 shrink-0 text-[#FFC777]" aria-hidden />
          {tr("مرّ يومين وما انضم أحد. ذكّروهم برسالة، وأحيانًا الرابط يضيع بالقروب.")}
        </p>
      )}

      <ol className="m-0 mt-3 flex list-none flex-col gap-1 p-0">
        {current && (
          <li className="fw-current">
            <div className="flex items-center gap-3">
              <span className="fw-num-on" aria-hidden>
                {current.n}
              </span>
              <span className="text-[18px] font-extrabold text-[#F2EBE3]">{current.label}</span>
              {current.done && <span className="sr-only">{tr("(خلصت)")}</span>}
            </div>
            <p className="m-0 text-[15px] leading-[1.7] text-[#E9D3B8]">{current.hint}</p>
            {action(current)}
          </li>
        )}
        {upcoming.map((s) => (
          <li key={s.key} className="fw-row">
            <span className="fw-num" aria-hidden>
              {s.n}
            </span>
            <span className="text-[15px] text-[#F2EBE3]">{s.label}</span>
          </li>
        ))}
        {finished.map((s) => (
          <li key={s.key} className="fw-row">
            <span className="fw-dot done" aria-hidden>
              <Check size={14} strokeWidth={2.6} />
            </span>
            <span className="text-[15px] text-[#ABA095] line-through decoration-[rgba(171,160,149,.7)]">
              {s.label}
              <span className="sr-only">{tr("(خلصت)")}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
