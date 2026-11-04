import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, MessageCircle, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTeamRoster } from "../../hooks/useTeamRoster";
import { useEvidencePapers } from "../../hooks/useEvidencePapers";
import { useResearchProject } from "../../hooks/useResearchProject";
import { getMyEmailStatus, type EmailStatus } from "../../lib/supervisorEmail";
import { publicBase } from "../../lib/publicUrl";
import { tr } from "../../lib/i18n";

const DISMISS_KEY = (teamId: string) => `wesync.firstWeek.done.${teamId}`;
const FIRST_SEEN_KEY = (teamId: string) => `wesync.firstWeek.seen.${teamId}`;

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

/** «أول أسبوع»: خمس خطوات توصّل الفريق لأول نجاح حقيقي، محسوبة من بيانات الفريق نفسها (بدون جداول جديدة).
    القائد لو لحاله: خطوة الدعوة أول وبارزة مع رابط واتساب جاهز، وبعد يومين بدون أحد يطلع تذكير لطيف. */
export default function FirstWeekCard({ style }: { style?: CSSProperties }) {
  const { team, isLeader, mode } = useAuth();
  const { roster } = useTeamRoster();
  const { papers } = useEvidencePapers();
  const { project } = useResearchProject();
  const [email, setEmail] = useState<EmailStatus | null>(null);
  const [copied, setCopied] = useState<"team" | "sup" | null>(null);
  const [hidden, setHidden] = useState(() => (team ? read(DISMISS_KEY(team.id)) === "1" : false));

  useEffect(() => {
    if (mode === "supabase" && isLeader) getMyEmailStatus().then(setEmail);
  }, [mode, isLeader]);

  // أول مرة نشوف الفريق بهالجهاز — عشان «مرّ يومين وما انضم أحد»
  const firstSeen = useMemo(() => {
    if (!team) return Date.now();
    const v = Number(read(FIRST_SEEN_KEY(team.id)));
    if (v) return v;
    write(FIRST_SEEN_KEY(team.id), String(Date.now()));
    return Date.now();
  }, [team]);

  if (!team || hidden) return null;

  const teamLink = `${publicBase()}#/login?team=${team.id}`;
  const supLink = team.shareToken ? `${publicBase()}#/supervisor/${team.shareToken}` : "";
  const solo = roster.length <= 1;
  const waitedTwoDays = Date.now() - firstSeen > 2 * 864e5;
  const copy = async (what: "team" | "sup", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // المتصفح رفض النسخ
    }
  };
  const teamWa = `https://wa.me/?text=${encodeURIComponent(tr("انضموا لفريق بحثنا على Wesync عشان نشتغل على البحث مع بعض: {0}", teamLink))}`;
  const supWa = supLink ? `https://wa.me/?text=${encodeURIComponent(tr("السلام عليكم، هذا رابط متابعة بحثنا على Wesync (بدون حساب): {0}", supLink))}` : "";

  const steps = [
    { key: "invite", done: !solo, label: tr("ادعوا فريقكم"), hint: solo ? tr("البحث أسهل وأنتم مع بعض. أرسلوا الرابط بقروب الدفعة أو لكل واحد.") : tr("انضم {0} من فريقكم.", roster.length) },
    { key: "topic", done: !!project?.title?.trim(), label: tr("اكتبوا موضوعكم"), hint: tr("العنوان يكفي، يتعدّل بعدين."), to: "/proposal" },
    { key: "paper", done: papers.length > 0, label: tr("أضيفوا أول دراسة"), hint: tr("ارموها للوكيل من المشبك (PDF أو صور)، أو ابحثوا من «أبحث»."), to: "/evidence" },
    { key: "table", done: papers.some((p) => !!(p.country || p.aim || p.sample || p.dataCollection)), label: tr("عبّوا أول صف بجدول الأدبيات"), hint: tr("الدولة، الهدف، العينة، وطريقة جمع البيانات."), to: "/literature-review" },
    { key: "sup", done: !!email && email.state !== "none", label: tr("ادعوا المشرف/ة"), hint: tr("رابط واحد بدون حساب: تتابع وتعتمد وتجاوب.") },
  ];
  // القائد لحاله: الدعوة أول شي؛ غير كذا نرتّب: اللي ما خلص قبل
  const ordered = solo && isLeader ? steps : [...steps.filter((s) => !s.done), ...steps.filter((s) => s.done)];
  const doneCount = steps.filter((s) => s.done).length;
  const current = ordered.find((s) => !s.done);
  const allDone = doneCount === steps.length;

  return (
    <section className="hg-card relative mb-2.5 lg:mb-[18px]" style={style} aria-labelledby="fw-h">
      <div className="hg-hd">
        <span id="fw-h">{allDone ? tr("خلصتوا أول أسبوع") : tr("أول أسبوع")}</span>
        <span className="ms-auto text-[13px] font-bold text-[#ABA095]">
          <b className="text-[#F2EBE3]" dir="ltr">
            {doneCount}/{steps.length}
          </b>
        </span>
        {allDone && (
          <button
            onClick={() => {
              write(DISMISS_KEY(team.id), "1");
              setHidden(true);
            }}
            aria-label={tr("إخفاء")}
            className="grid h-9 w-9 place-items-center rounded-full text-[#ABA095] hover:text-[#F2EBE3]"
          >
            <X size={16} />
          </button>
        )}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]" aria-hidden>
        <div className="h-full rounded-full bg-gradient-to-l from-[#FFB547] to-[#FF6A00] transition-all duration-700" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>

      {solo && isLeader && waitedTwoDays && (
        <p className="m-0 mt-3 rounded-2xl bg-[rgba(255,180,68,.08)] px-3.5 py-2.5 text-[13px] leading-relaxed text-[#E9D3B8]">
          {tr("مرّ يومين وما انضم أحد. ذكّروهم برسالة، وأحيانًا الرابط يضيع بالقروب.")}
        </p>
      )}

      <ol className="m-0 mt-3 list-none space-y-1.5 p-0">
        {ordered.map((s) => {
          const isCurrent = s === current;
          return (
            <li key={s.key} className={`rounded-2xl px-3 py-2.5 ${isCurrent ? "bg-[rgba(255,150,50,.08)] shadow-[inset_0_0_0_1px_rgba(255,190,110,.32)]" : ""}`}>
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${s.done ? "bg-[#7FE0A6] text-[#0b2015]" : "shadow-[inset_0_0_0_1.5px_rgba(255,255,255,.25)]"}`}>
                  {s.done && <Check size={14} strokeWidth={3} />}
                </span>
                <div className="min-w-0 flex-1">
                  {s.to && !s.done ? (
                    <Link to={s.to} className="text-[15px] font-bold text-[#F2EBE3] hover:text-[#FFE1C2]">
                      {s.label} ←
                    </Link>
                  ) : (
                    <span className={`text-[15px] font-bold ${s.done ? "text-[#8F857C] line-through decoration-white/25" : "text-[#F2EBE3]"}`}>{s.label}</span>
                  )}
                  {isCurrent && <p className="m-0 mt-0.5 text-[13px] leading-relaxed text-[#ABA095]">{s.hint}</p>}
                  {isCurrent && s.key === "invite" && isLeader && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <a href={teamWa} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#F2EBE3] px-4 text-[14px] font-extrabold text-[#1A0B05]">
                        <MessageCircle size={16} />
                        {tr("أرسلوا الدعوة بواتساب")}
                      </a>
                      <button onClick={() => copy("team", teamLink)} className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[14px] font-bold text-[#F2EBE3] shadow-[inset_0_0_0_1px_rgba(255,240,225,.18)]">
                        {copied === "team" ? <Check size={15} /> : <Copy size={15} />}
                        {copied === "team" ? tr("انتسخ") : tr("انسخوا الرابط")}
                      </button>
                    </div>
                  )}
                  {isCurrent && s.key === "sup" && isLeader && supLink && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <a href={supWa} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#F2EBE3] px-4 text-[14px] font-extrabold text-[#1A0B05]">
                        <MessageCircle size={16} />
                        {tr("أرسلوا الرابط للمشرف/ة")}
                      </a>
                      <button onClick={() => copy("sup", supLink)} className="inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-[14px] font-bold text-[#F2EBE3] shadow-[inset_0_0_0_1px_rgba(255,240,225,.18)]">
                        {copied === "sup" ? <Check size={15} /> : <Copy size={15} />}
                        {copied === "sup" ? tr("انتسخ") : tr("انسخوا الرابط")}
                      </button>
                    </div>
                  )}
                  {isCurrent && (s.key === "invite" || s.key === "sup") && !isLeader && <p className="m-0 mt-1 text-[12px] text-[#ABA095]">{tr("القائد يرسل الرابط.")}</p>}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
