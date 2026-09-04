import { useState } from "react";
import {
  Bell,
  Check,
  Clock,
  Copy,
  Gift,
  GraduationCap,
  Mail,
  MessageCircle,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import clsx from "clsx";
import Card, { CardHeader, type CardTone } from "../components/ui/Card";
import Avatar from "../components/ui/Avatar";
import ProgressBar from "../components/ui/ProgressBar";
import { useTeamRoster } from "../hooks/useTeamRoster";
import { useTasksData } from "../hooks/useTasksData";
import { useReferralStats } from "../hooks/useReferralStats";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { recentActivity, teamMembers } from "../data/mockData";
import type { Task, TeamMember } from "../data/types";
import { g, isFemaleUser } from "../lib/gender";

function daysAgo(iso: string): number {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/** أول ظهور لعضو بسجل النشاط هو الأحدث — السجل مرتّب زمنيًا من الأجدد للأقدم */
function lastActivityFor(memberId: string): string | null {
  return recentActivity.find((a) => a.memberId === memberId)?.timeAgo ?? null;
}

const tones: CardTone[] = ["teal", "sky", "cream", "violet", "rose"];

function InviteCard() {
  const { team } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!team) return null;
  const inviteLink = `${window.location.origin}${window.location.pathname}#/login?team=${team.id}`;

  const copy = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card tone="cream" className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-accent-100 text-amber-accent-700">
          <UserPlus size={18} />
        </span>
        <div>
          <p className="font-bold text-brand-950">دعوة بقية أعضاء الفريق</p>
          <p className="mt-0.5 text-sm text-brand-950/55">
            شاركوا هذا الرابط مع بقية الفريق — كل من يسجّل حساب عبره ينضم لنفس فريقكم تلقائيًا.
          </p>
        </div>
      </div>
      <button
        onClick={copy}
        className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-brand-200 bg-paper px-4 py-2.5 text-sm font-bold text-brand-700 hover:bg-brand-50"
      >
        {copied ? <Check size={15} className="text-brand-600" /> : <Copy size={15} />}
        {copied ? "تم النسخ" : "نسخ رابط الدعوة"}
      </button>
    </Card>
  );
}

function SupervisorLinkCard() {
  const { team } = useAuth();
  const [copied, setCopied] = useState(false);
  const [reminderCopied, setReminderCopied] = useState(false);

  if (!team?.shareToken) return null;
  const shareLink = `${window.location.origin}${window.location.pathname}#/supervisor/${team.shareToken}`;
  const waitingDays = team.supervisorNoteAt ? daysAgo(team.supervisorNoteAt) : null;

  const copy = async () => {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyReminder = async () => {
    const message = team.supervisorNote
      ? `مرحبًا دكتور/ة، ودّينا نطمّنكم على آخر تحديث لتقدم فريقنا البحثي — تقدرون تراجعونه وتتركون لنا ملاحظة جديدة من هنا:\n${shareLink}`
      : `مرحبًا دكتور/ة، جهّزنا رابط متابعة لتقدم فريقنا البحثي على CohortSync — نكون شاكرين لو تقدرون تطّلعون عليه وتتركون لنا ملاحظتكم:\n${shareLink}`;
    await navigator.clipboard.writeText(message);
    setReminderCopied(true);
    setTimeout(() => setReminderCopied(false), 2000);
  };

  return (
    <Card tone="sky" className="mb-4 flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-accent-100 text-sky-accent-700">
            <GraduationCap size={18} />
          </span>
          <div>
            <p className="font-bold text-brand-950">رابط المشرف الأكاديمي</p>
            <p className="mt-0.5 text-sm text-brand-950/55">
              شاركوه مع مشرفكم — يشوف تقدم فريقكم ومهامكم قراءة فقط، بدون تسجيل دخول.
            </p>
            {waitingDays !== null ? (
              <p className="mt-1.5 text-xs font-semibold text-sky-accent-700">
                آخر ملاحظة منه/منها قبل {waitingDays === 0 ? "أقل من يوم" : `${waitingDays} ${waitingDays === 1 ? "يوم" : "أيام"}`}
              </p>
            ) : (
              <p className="mt-1.5 text-xs font-semibold text-amber-accent-600">
                لسا ما وصلتكم ملاحظة من مشرفكم — ذكّروه بالرابط
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={copyReminder}
            className="flex items-center justify-center gap-2 rounded-xl border border-sky-accent-200 bg-white px-4 py-2.5 text-sm font-bold text-sky-accent-700 hover:bg-sky-accent-50"
          >
            {reminderCopied ? <Check size={15} /> : <Bell size={15} />}
            {reminderCopied ? "تم النسخ" : "نسخ رسالة تذكير"}
          </button>
          <button
            onClick={copy}
            className="flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-paper px-4 py-2.5 text-sm font-bold text-brand-700 hover:bg-brand-50"
          >
            {copied ? <Check size={15} className="text-brand-600" /> : <Copy size={15} />}
            {copied ? "تم النسخ" : "نسخ الرابط"}
          </button>
        </div>
      </div>
    </Card>
  );
}

function ReferralCard() {
  const { team } = useAuth();
  const { stats } = useReferralStats();
  const [copied, setCopied] = useState(false);

  if (!team?.referralCode) return null;
  const referralLink = `${window.location.origin}${window.location.pathname}#/login?ref=${team.referralCode}`;
  const waMessage = `جربوا CohortSync — منصة تنظّم بحث التخرج كامل بمكان واحد. سجّلوا من هذا الرابط وابدأوا تجربة ٧ أيام مجانية 🎁\n${referralLink}`;

  const copy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card tone="amber" className="mb-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-accent-500 text-white">
            <Gift size={18} />
          </span>
          <div>
            <p className="font-bold text-brand-950">ادعوا فريق ثاني واربحوا ١٥ يوم مجاني</p>
            <p className="mt-0.5 text-sm text-brand-950/55">
              شاركوا رابط الدعوة — أول ما يفعّلون اشتراكهم تاخذون ١٥ يوم إضافي
              تلقائيًا.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(waMessage)}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white hover:brightness-95"
          >
            <MessageCircle size={15} />
            واتساب
          </a>
          <button
            onClick={copy}
            className="flex items-center justify-center gap-2 rounded-xl border border-amber-accent-300 bg-white px-4 py-2.5 text-sm font-bold text-amber-accent-700 hover:bg-amber-accent-50"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "تم النسخ" : "نسخ الرابط"}
          </button>
        </div>
      </div>

      {stats && (
        <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl bg-white/60 p-3">
          <div className="text-center">
            <p className="font-display text-xl font-extrabold text-brand-950">{stats.referredCount}</p>
            <p className="text-[11px] font-semibold text-brand-950/50">فرق دعوتوها</p>
          </div>
          <div className="text-center">
            <p className="font-display text-xl font-extrabold text-brand-950">{stats.rewardedCount}</p>
            <p className="text-[11px] font-semibold text-brand-950/50">فعّلوا اشتراكهم</p>
          </div>
          <div className="text-center">
            <p className="font-display text-xl font-extrabold text-amber-accent-600">
              {stats.bonusDaysEarned}
            </p>
            <p className="text-[11px] font-semibold text-brand-950/50">يوم مجاني ربحتوه</p>
          </div>
        </div>
      )}
    </Card>
  );
}

function WorkloadBalance({ roster, tasks }: { roster: TeamMember[]; tasks: Task[] }) {
  const [reportCopied, setReportCopied] = useState(false);

  const rows = roster
    .map((member) => {
      const memberTasks = tasks.filter((t) => t.assigneeId === member.id);
      const open = memberTasks.filter((t) => t.status !== "done").length;
      const overdue = memberTasks.filter((t) => t.status === "overdue").length;
      const done = memberTasks.filter((t) => t.status === "done").length;
      return { member, open, overdue, done, total: memberTasks.length };
    })
    .sort((a, b) => b.open - a.open);

  const maxOpen = Math.max(1, ...rows.map((r) => r.open));
  const mostLoaded = rows[0];
  const leastLoaded = rows[rows.length - 1];
  const imbalanced = rows.length > 1 && mostLoaded.open - leastLoaded.open >= 3;

  const copyReport = async () => {
    const today = new Date().toLocaleDateString("ar-SA-u-nu-latn", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const lines = [
      `تقرير مساهمة الفريق — ${today}`,
      "",
      ...rows.map(
        ({ member, total, done, overdue }) =>
          `${member.name}: ${done} من ${total} مهمة مكتملة${overdue > 0 ? ` — ${overdue} متأخرة` : ""}`,
      ),
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    setReportCopied(true);
    setTimeout(() => setReportCopied(false), 2000);
  };

  return (
    <Card className="mt-4">
      <CardHeader
        title="موازنة حمل الفريق"
        subtitle="Workload Balance"
        action={
          <button
            onClick={copyReport}
            className="flex items-center gap-1.5 rounded-lg border border-brand-200 px-2.5 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-50"
          >
            {reportCopied ? <Check size={13} /> : <Copy size={13} />}
            {reportCopied ? "تم النسخ" : "نسخ تقرير المساهمة"}
          </button>
        }
      />
      <ul className="space-y-3">
        {rows.map(({ member, open, overdue }, i) => (
          <li key={member.id} className="flex items-center gap-3">
            <Avatar initials={member.initials} color={member.color} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-semibold text-brand-950">
                  {member.name.split(" ")[0]}
                </span>
                <span className="shrink-0 text-xs font-bold text-brand-950/50">
                  {open} مفتوحة
                  {overdue > 0 && <span className="text-rose-500"> · {overdue} متأخرة</span>}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                <div
                  className={clsx(
                    "h-full rounded-full",
                    overdue > 0
                      ? "bg-rose-400"
                      : i === 0 && open > 0
                        ? "bg-amber-accent-400"
                        : "bg-brand-400",
                  )}
                  style={{ width: `${open === 0 ? 0 : Math.max(6, (open / maxOpen) * 100)}%` }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
      {imbalanced && (
        <p className="mt-4 rounded-xl bg-amber-accent-50 px-3 py-2 text-xs font-semibold text-amber-accent-700">
          الحمل متفاوت شوي — {mostLoaded.member.name.split(" ")[0]}{" "}
          {g(isFemaleUser(mostLoaded.member), "عندها", "عنده")} {mostLoaded.open} مهام مفتوحة،
          بينما {leastLoaded.member.name.split(" ")[0]}{" "}
          {g(isFemaleUser(leastLoaded.member), "عندها", "عنده")} {leastLoaded.open} بس — ممكن
          توزيع أعدل.
        </p>
      )}
    </Card>
  );
}

function ActivityLog() {
  const memberById = (id: string) => teamMembers.find((m) => m.id === id);

  return (
    <Card className="mt-4">
      <CardHeader title="سجل نشاط الفريق" subtitle="Activity Log" />
      <ul className="divide-y divide-brand-50">
        {recentActivity.map((activity) => {
          const member = memberById(activity.memberId);
          if (!member) return null;
          return (
            <li key={activity.id} className="flex items-start gap-3 py-3">
              <Avatar initials={member.initials} color={member.color} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-brand-950">
                  <span className="font-semibold">{member.name.split(" ")[0]}</span>{" "}
                  {activity.action}{" "}
                  <span className="font-semibold text-brand-700">"{activity.target}"</span>
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-brand-950/40">
                  <Clock size={12} />
                  {activity.timeAgo}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export default function Team() {
  const { roster } = useTeamRoster();
  const { tasks } = useTasksData();
  const { isLeader, mode } = useAuth();

  return (
    <div>
      {isLeader && mode === "supabase" && (
        <>
          <InviteCard />
          <SupervisorLinkCard />
          <ReferralCard />
        </>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {roster.map((member, i) => {
        const memberTasks = tasks.filter((t) => t.assigneeId === member.id);
        const overdue = memberTasks.filter((t) => t.status === "overdue").length;
        const tasksTotal = isSupabaseConfigured ? memberTasks.length : member.tasksTotal;
        const tasksDone = isSupabaseConfigured
          ? memberTasks.filter((t) => t.status === "done").length
          : member.tasksDone;
        const progress = isSupabaseConfigured
          ? tasksTotal > 0
            ? Math.round((tasksDone / tasksTotal) * 100)
            : 0
          : member.progress;

        return (
          <Card key={member.id} tone={tones[i % tones.length]} className="flex flex-col">
            <div className="flex items-center gap-3">
              <Avatar initials={member.initials} color={member.color} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-brand-950">{member.name}</p>
                <p className="flex items-center gap-1 text-sm text-brand-950/50">
                  {member.role === "leader" && (
                    <ShieldCheck size={14} className="text-amber-accent-500" />
                  )}
                  {member.title}
                </p>
              </div>
            </div>

            <a
              href={`mailto:${member.email}`}
              className="mt-3 flex items-center gap-1.5 text-sm text-brand-950/45 hover:text-brand-600"
            >
              <Mail size={14} />
              {member.email}
            </a>

            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-brand-950/35">
              <Clock size={12} />
              {lastActivityFor(member.id) ? `آخر نشاط ${lastActivityFor(member.id)}` : "لسا ما بدأ نشاط"}
            </p>

            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs font-semibold text-brand-950/50">
                <span>نسبة الإنجاز</span>
                <span className="text-brand-600">{progress}%</span>
              </div>
              <ProgressBar value={progress} color={member.color} />
            </div>

            <div className="mt-4 grid grid-cols-3 divide-x divide-x-reverse divide-brand-50 rounded-xl bg-surface-muted py-3 text-center">
              <div>
                <p className="text-base font-extrabold text-brand-950">{tasksTotal}</p>
                <p className="text-[11px] text-brand-950/45">إجمالي المهام</p>
              </div>
              <div>
                <p className="text-base font-extrabold text-brand-600">{tasksDone}</p>
                <p className="text-[11px] text-brand-950/45">مكتملة</p>
              </div>
              <div>
                <p className="text-base font-extrabold text-rose-500">{overdue}</p>
                <p className="text-[11px] text-brand-950/45">متأخرة</p>
              </div>
            </div>
          </Card>
        );
      })}
      </div>

      <WorkloadBalance roster={roster} tasks={tasks} />
      <ActivityLog />
    </div>
  );
}
