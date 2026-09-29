import { Link } from "react-router-dom";
import {
  BookOpenCheck,
  CalendarHeart,
  ListChecks,
  Sparkles,
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
    icon: typeof Sparkles;
    label: string;
    value: string;
    sub: string;
    tone: "teal" | "cream" | "sky" | "amber" | "violet";
  }[] = [
    {
      icon: CalendarHeart,
      label: "أول يوم بدأتِ فيه",
      value: firstVisitLabel,
      sub: `من يومها وأنتِ مستمرة — ${daysSince} يوم من الحضور`,
      tone: "teal",
    },
    {
      icon: TrendingUp,
      label: "نسبة تقدم بحثك الآن",
      value: `${projectMeta.overallProgress}%`,
      sub: "قطعتوا مسافة حقيقية من الصفر",
      tone: "cream",
    },
    {
      icon: BookOpenCheck,
      label: "دراسات راجعها الفريق",
      value: `${reviewedCount} من ${evidenceLibrary.length}`,
      sub: "كل دراسة قرأتوها بنت فهمكم للموضوع",
      tone: "sky",
    },
    {
      icon: ListChecks,
      label: "مهام أنجزها الفريق",
      value: `${doneTasksCount} من ${tasks.length}`,
      sub: "خطوات صغيرة صارت إنجاز حقيقي",
      tone: "amber",
    },
  ];

  return (
    <div className="space-y-6">
      <Card tone="violet" className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-[var(--color-overlay-soft)]" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-sm shadow-brand-500/30">
            <Sparkles size={20} />
          </span>
          <div>
            <h1 className="font-display text-xl font-extrabold text-brand-950">قصة بحثك</h1>
            <p className="text-sm text-brand-950/55">Your Research Story — رحلتكم لحد الحين، بالأرقام</p>
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
        <CardHeader title="أعلى إنجاز بالفريق هذا الفصل" subtitle="Team Highlight" />
        <div className="flex items-center gap-3">
          <Avatar initials={topMember.initials} color={topMember.color} size="lg" />
          <div>
            <p className="font-display font-bold text-brand-950">{topMember.name}</p>
            <p className="text-sm text-brand-950/50">
              أنجزت {topMember.tasksDone} من {topMember.tasksTotal} مهمة — {topMember.progress}% تقدّم
            </p>
          </div>
          <Trophy size={22} className="ms-auto text-amber-accent-500" />
        </div>
      </Card>

      {earliestEvent && (
        <Card tone="cream">
          <CardHeader title="أول لحظة في رحلتكم" subtitle="First Logged Moment" />
          <p className="text-sm font-semibold text-brand-950">{earliestEvent.title}</p>
          <p className="mt-1 text-xs text-brand-950/45">{formatDateLong(earliestEvent.date)}</p>
        </Card>
      )}

      <Card tone="teal" className="text-center">
        <p className="font-display text-lg font-bold text-brand-950">
          كل سطر كتبتيه، وكل دراسة قرأتيها، وكل يوم كملتِ فيه — صار جزء من قصة بحثك.
        </p>
        <p className="mt-2 text-sm text-brand-950/55">
          {g(isFemale, "استمري", "استمر")}، القصة لسه ما خلصت 🌱
        </p>
        <Link
          to="/"
          className="mt-4 inline-block rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-600"
        >
          الرجوع للرئيسية
        </Link>
      </Card>
    </div>
  );
}
