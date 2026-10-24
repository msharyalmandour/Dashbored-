/** قياس مساهمة الأعضاء من المهام فقط: نقاط حسب أولوية المهمة المكتملة، ونسبة الالتزام بالموعد.
    ما يقيس كل الجهد (القراءة، الاجتماعات، الكتابة) — يُعرض كمؤشر نقاش مو كدرجة تقييم. */

export interface ContribTask {
  assigneeId: string;
  status: string;
  priority: string;
  dueDate: string;
  /** وقت الإكمال (timestamptz من القاعدة) */
  completedAt?: string | null;
}

export interface MemberContribution {
  memberId: string;
  assigned: number;
  done: number;
  doneLast14: number;
  /** من المكتملة بتاريخ إكمال معروف: كم نسبة اللي خلصت بموعدها — null لو ما فيه بيانات */
  onTimeRate: number | null;
  overdue: number;
  points: number;
  /** حصته من نقاط الفريق الكلية (٠–١٠٠) */
  share: number;
}

export interface ContributionSummary {
  rows: MemberContribution[];
  totalPoints: number;
  /** عضو واحد يحمل أكثر من نصف الإنجاز (٣ أعضاء فأكثر) */
  dominantId: string | null;
  /** أعضاء بدون أي مهمة مكتملة بينما الفريق أنجز */
  idleIds: string[];
}

const WEIGHT: Record<string, number> = { high: 3, medium: 2, low: 1 };
export const weightOf = (priority: string) => WEIGHT[priority] ?? 2;

/** تاريخ الرياض (UTC+3) من وقت ISO */
export function riyadhDay(iso: string): string {
  return new Date(new Date(iso).getTime() + 3 * 3600000).toISOString().slice(0, 10);
}

export function computeContribution(memberIds: string[], tasks: ContribTask[], today: string): ContributionSummary {
  const cutoff = new Date(`${today}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - 14);
  const since = cutoff.toISOString().slice(0, 10);

  const base = memberIds.map((memberId) => {
    const mine = tasks.filter((t) => t.assigneeId === memberId);
    const done = mine.filter((t) => t.status === "done");
    const dated = done.filter((t) => t.completedAt && t.dueDate);
    const onTime = dated.filter((t) => riyadhDay(t.completedAt!) <= t.dueDate).length;
    return {
      memberId,
      assigned: mine.length,
      done: done.length,
      doneLast14: done.filter((t) => t.completedAt && riyadhDay(t.completedAt) >= since).length,
      onTimeRate: dated.length ? Math.round((onTime / dated.length) * 100) : null,
      overdue: mine.filter((t) => t.status !== "done" && (t.status === "overdue" || (!!t.dueDate && t.dueDate < today))).length,
      points: done.reduce((s, t) => s + weightOf(t.priority), 0),
    };
  });

  const totalPoints = base.reduce((s, r) => s + r.points, 0);
  const rows: MemberContribution[] = base.map((r) => ({ ...r, share: totalPoints ? Math.round((r.points / totalPoints) * 100) : 0 }));

  const dominant = rows.length >= 3 && totalPoints >= 6 ? rows.find((r) => r.share > 50) : undefined;
  const idleIds = totalPoints >= 6 ? rows.filter((r) => r.points === 0).map((r) => r.memberId) : [];
  return { rows, totalPoints, dominantId: dominant?.memberId ?? null, idleIds };
}

/** نبض فريق للمشرف/ة من بيانات اللقطة العامة (بدون حساب): أقرب موعد، أطول تأخير، أعضاء بدون مهام */
export interface PulseTask {
  status: string;
  dueDate: string | null;
  assigneeName: string | null;
}

export interface TeamPulse {
  nextDue: { date: string; daysLeft: number } | null;
  worstLateDays: number;
  unassignedMembers: string[];
}

const dayDiff = (a: string, b: string) => Math.round((new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime()) / 86400000);

export function teamPulse(tasks: PulseTask[], memberNames: string[], today: string): TeamPulse {
  const open = tasks.filter((t) => t.status !== "done" && t.dueDate);
  const future = open.filter((t) => t.dueDate! >= today).sort((a, b) => a.dueDate!.localeCompare(b.dueDate!));
  const late = open.filter((t) => t.dueDate! < today);
  const withTasks = new Set(tasks.map((t) => t.assigneeName).filter(Boolean));
  return {
    nextDue: future[0] ? { date: future[0].dueDate!, daysLeft: dayDiff(future[0].dueDate!, today) } : null,
    worstLateDays: late.reduce((m, t) => Math.max(m, dayDiff(today, t.dueDate!)), 0),
    unassignedMembers: memberNames.filter((n) => n && !withTasks.has(n)),
  };
}
