import { Link } from "react-router-dom";
import {
  BookOpenCheck,
  CalendarHeart,
  ListChecks,
  Wand2,
  TrendingUp,
  Trophy,
} from "lucide-react";
import Card, { CardHeader } from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import { useAuth } from "../context/AuthContext";
import { calendarEvents, evidenceLibrary, projectMeta, tasks, teamMembers } from "../data/mockData";
import { formatDateLong, toISODate } from "../lib/date";
import { useFirstVisit } from "../hooks/useFirstVisit";
import { g, isFemaleUser } from "../lib/gender";
import { tr, trx } from "../lib/i18n";

export default function Story() {
  const { currentUser } = useAuth();
  const isFemale = isFemaleUser(currentUser);
  const { firstVisit, daysSince } = useFirstVisit();

  const reviewedCount = evidenceLibrary.filter((p) => p.reviewStatus === "reviewed").length;
  const doneTasksCount = tasks.filter((t) => t.status === "done").length;
  const topMember = [...teamMembers].sort((a, b) => b.progress - a.progress)[0];
  const earliestEvent = [...calendarEvents].sort((a, b) => a.date.localeCompare(b.date))[0];

  const firstVisitLabel = formatDateLong(toISODate(new Date(firstVisit)));

  const stats: {
    icon: typeof Wand2;
    label: string;
    value: string;
    sub: string;
    tone: "teal" | "cream" | "sky" | "amber" | "violet";
  }[] = [
    {
      icon: CalendarHeart,
      label: tr("أول يوم بدأتِ فيه"),
      value: firstVisitLabel,
      sub: tr("من يومها وأنتِ مستمرة — {0} يوم من الحضور", daysSince),
      tone: "teal",
    },
    {
      icon: TrendingUp,
      label: tr("نسبة تقدم بحثك الآن"),
      value: `${projectMeta.overallProgress}%`,
      sub: tr("قطعتوا مسافة حقيقية من الصفر"),
      tone: "cream",
    },
    {
      icon: BookOpenCheck,
      label: tr("دراسات راجعها الفريق"),
      value: tr("{0} من {1}", reviewedCount, evidenceLibrary.length),
      sub: tr("كل دراسة قرأتوها بنت فهمكم للموضوع"),
      tone: "sky",
    },
    {
      icon: ListChecks,
      label: tr("مهام أنجزها الفريق"),
      value: tr("{0} من {1}", doneTasksCount, tasks.length),
      sub: tr("خطوات صغيرة صارت إنجاز حقيقي"),
      tone: "amber",
    },
  ];

  return (
    <div className="space-y-6">
      <Card tone="violet" className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[var(--color-overlay-soft)]" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-sm shadow-brand-500/30">
            <Wand2 size={20} />
          </span>
          <div>
            <h1 className="font-display text-xl font-extrabold text-brand-950">{tr("قصة بحثك")}</h1>
            <p className="text-sm text-brand-950/55">{tr("Your Research Story — رحلتكم لحد الحين، بالأرقام")}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {stats.map((s) => (
          <Card key={s.label} tone={s.tone}>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-sm shadow-brand-500/30">
                <s.icon size={18} />
              </span>
              <p className="text-sm font-semibold text-brand-950/60">{s.label}</p>
            </div>
            <p className="mt-3 font-display text-2xl font-extrabold text-brand-950">{s.value}</p>
            <p className="mt-1 text-xs text-brand-950/45">{s.sub}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title={tr("أعلى إنجاز بالفريق هذا الفصل")} subtitle="Team Highlight" />
        <div className="flex items-center gap-3">
          <Avatar initials={topMember.initials} color={topMember.color} size="lg" />
          <div>
            <p className="font-display font-bold text-brand-950">{topMember.name}</p>
            <p className="text-sm text-brand-950/50">{trx("أنجزت {0} من {1} مهمة — {2}% تقدّم", topMember.tasksDone, topMember.tasksTotal, topMember.progress)}</p>
          </div>
          <Trophy size={22} className="ms-auto text-amber-accent-500" />
        </div>
      </Card>

      {earliestEvent && (
        <Card tone="cream">
          <CardHeader title={tr("أول لحظة في رحلتكم")} subtitle="First Logged Moment" />
          <p className="text-sm font-semibold text-brand-950">{earliestEvent.title}</p>
          <p className="mt-1 text-xs text-brand-950/45">{formatDateLong(earliestEvent.date)}</p>
        </Card>
      )}

      <Card tone="teal" className="text-center">
        <p className="font-display text-lg font-bold text-brand-950">{tr("كل سطر كتبتيه، وكل دراسة قرأتيها، وكل يوم كملتِ فيه — صار جزء من قصة بحثك.")}</p>
        <p className="mt-2 text-sm text-brand-950/55">{trx("{0}، القصة لسه ما خلصت 🌱", g(isFemale, tr("استمري"), tr("استمر")))}</p>
        <Link
          to="/"
          className="mt-4 inline-block rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
        >{tr("الرجوع للرئيسية")}</Link>
      </Card>
    </div>
  );
}
