import { useMemo, useState, type FormEvent } from "react";
import { ArrowUp, Mic } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useEvidencePapers } from "../hooks/useEvidencePapers";
import { useSupervisorFeedback } from "../hooks/useSupervisorFeedback";
import { useUpcoming } from "../components/home/TeamMeetLux";
import { peekDriveStatus } from "../lib/driveTeam";
import { openAgent } from "../lib/agentBus";
import { GoogleCalendarLogo, GoogleDriveLogo } from "../components/ui/BrandLogos";
import { num } from "../components/v3/WriteHeader";
import { tr } from "../lib/i18n";
import "../styles/wesy-ai.css";

/** صفحة ويسي الذكي: ويسي بالنص، خانة كتابة كبيرة، وش يعرف عن بحثكم، واقتراحات اليوم.
 *  الكتابة هنا تفتح ويسي الجانبي والنص جاهز — ما يرسل شي لحاله (نفس قاعدة openAgent). */
export default function WesyAI() {
  const { currentUser } = useAuth();
  const [text, setText] = useState("");
  const { papers } = useEvidencePapers();
  const { items: feedback } = useSupervisorFeedback();
  const now = useMemo(() => new Date(), []);
  const { next } = useUpcoming(now);
  const drive = peekDriveStatus(currentUser?.id);
  const openNotes = feedback.filter((f) => f.status === "open").length;
  const firstName = (currentUser?.name ?? "").trim().split(" ")[0] ?? "";

  const ask = (q: string) => {
    openAgent(q);
    setText("");
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) ask(text.trim());
    else openAgent();
  };

  const today = [
    next ? { t: tr("جهّز أجندة اجتماعنا الجاي"), s: next.title } : null,
    openNotes ? { t: tr("ساعدني أعدّل على ملاحظات المشرف/ة"), s: tr("{0} ملاحظات مفتوحة", num(openNotes)) } : null,
    { t: tr("وش أهم خطوة نسويها اليوم؟"), s: tr("من مهامكم ومرحلة بحثكم") },
    { t: tr("لخّص لي آخر الدراسات اللي حفظناها"), s: papers.length ? tr("{0} دراسة بالمكتبة", num(papers.length)) : tr("مكتبة الأدلة") },
  ].filter(Boolean) as { t: string; s: string }[];

  const can = [
    { t: tr("ابحث لي عن دراسات عن موضوعنا"), s: tr("PubMed وGoogle Scholar وغيرها") },
    { t: tr("صغ لي فقرة بلغة أكاديمية من كلامي"), s: tr("أنتم تكتبون الفكرة، وأنا أرتبها") },
    { t: tr("اشرح لي نتيجة الإحصاء بالعربي"), s: tr("من ردود استبيانكم") },
    { t: tr("اكتب رسالة دعوة للاستبيان"), s: tr("جاهزة للواتساب") },
  ];

  return (
    <div className="wa">
      <div className="wa-halo" aria-hidden />
      <img className="wa-wesy" src="/lux/wz-wave.webp" alt="" width={220} height={518} decoding="async" />
      <h1 className="wa-title">{firstName ? tr("هلا {0}، وش نسوي اليوم؟", `⁨${firstName}⁩`) : tr("هلا، وش نسوي اليوم؟")}</h1>
      <p className="wa-sub">{tr("ويسي يعرف بحثكم كامل. اسألوه، أو خلّوه يسوي الشغل عنكم.")}</p>

      <form className="wa-box" onSubmit={submit}>
        <label htmlFor="wa-q" className="sr-only">
          {tr("اكتبوا طلبكم لويسي")}
        </label>
        <textarea
          id="wa-q"
          rows={2}
          dir="auto"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (text.trim()) ask(text.trim());
            }
          }}
          placeholder={tr("اكتبوا طلبكم… مثلًا: جهّز لي أجندة اجتماع الخميس")}
        />
        <div className="wa-row">
          <span className="wa-chip">{tr("ابحث في الدراسات")}</span>
          <span className="wa-chip">{tr("الوكيل: ينفّذ عنكم")}</span>
          <span className="flex-1" />
          <button type="button" className="wa-ic" aria-label={tr("تكلّموا مع ويسي")} onClick={() => openAgent()}>
            <Mic size={20} aria-hidden />
          </button>
          <button type="submit" className="wa-send" aria-label={tr("أرسل لويسي")}>
            <ArrowUp size={20} aria-hidden />
          </button>
        </div>
      </form>

      <div className="wa-ctx" aria-label={tr("وش يعرف ويسي عن بحثكم")}>
        <span className="wa-mut">{tr("يعرف عن:")}</span>
        <span className="wa-chip">
          <i className="wa-dot" aria-hidden />
          {tr("المقترح والمنهجية")}
        </span>
        <span className="wa-chip">
          <i className="wa-dot g" aria-hidden />
          {tr("{0} دراسة", num(papers.length))}
        </span>
        <span className="wa-chip">
          <i className="wa-dot c" aria-hidden />
          {tr("المحاضر والقرارات")}
        </span>
        <span className="wa-chip">
          <GoogleDriveLogo size={15} />
          {drive?.connected ? "Google Drive" : tr("Google Drive (مو مربوط)")}
        </span>
        <span className="wa-chip">
          <GoogleCalendarLogo size={14} />
          {tr("التقويم")}
        </span>
      </div>

      <div className="wa-cols">
        <section aria-labelledby="wa-today">
          <h2 id="wa-today" className="wa-h2">
            {tr("ويسي يقترح اليوم")}
          </h2>
          {today.slice(0, 3).map((x, i) => (
            <button key={x.t} type="button" className="wa-sugg" onClick={() => ask(x.t)}>
              <span className="wa-n">{num(i + 1)}</span>
              <span className="min-w-0 flex-1 text-start">
                <b>{x.t}</b>
                <small dir="auto">{x.s}</small>
              </span>
            </button>
          ))}
        </section>
        <section aria-labelledby="wa-can">
          <h2 id="wa-can" className="wa-h2">
            {tr("وش يقدر يسوي عنكم")}
          </h2>
          {can.map((x) => (
            <button key={x.t} type="button" className="wa-sugg" onClick={() => ask(x.t)}>
              <span className="wa-n">✦</span>
              <span className="min-w-0 flex-1 text-start">
                <b>{x.t}</b>
                <small>{x.s}</small>
              </span>
            </button>
          ))}
        </section>
      </div>
      <p className="wa-foot">{tr("ويسي يقترح، والقرار لكم. راجعوا المصادر دايمًا.")}</p>
    </div>
  );
}
