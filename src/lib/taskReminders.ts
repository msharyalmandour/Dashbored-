/** مهام «تذكير: …» (يضيفها الوكيل كمتابعة لمهمة ثانية) ما تنعرض كمهمة لحالها بصفحة «مهامي»:
    تنربط بالمهمة الأصلية من العنوان وتطلع شارة جرس عليها. العرض بس — البيانات نفسها ما تتغير ولا تنحذف. */

export interface ReminderLike {
  id: string;
  title: string;
  status: string;
  dueDate: string;
}

const PREFIX = /^\s*(تذكير|reminder)\s*[:：\-–]\s*/i;
const LEAD_VERB = /^(إنجاز|انجاز|إكمال|اكمال|إنهاء|انهاء|متابعة|finish|complete)\s+/i;

export const isReminderTitle = (title: string) => PREFIX.test(title);

const norm = (s: string) =>
  s
    .replace(PREFIX, "")
    .trim()
    .replace(LEAD_VERB, "")
    .replace(/[ً-ْ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export interface SplitReminders<T> {
  /** المهام اللي تنعرض بالقائمة (بدون التذكيرات اللي لقينا مهمتها الأصلية) */
  visible: T[];
  /** id المهمة الأصلية ← تذكيراتها */
  byTask: Map<string, T[]>;
  /** كل التذكيرات اللي انربطت */
  linked: T[];
}

/** يفصل التذكيرات عن المهام. التذكير اللي ما لقينا له مهمة أصلية يبقى بالقائمة عادي (ما نخفي شي ما نعرف وين نحطه). */
export function splitReminders<T extends ReminderLike>(tasks: T[]): SplitReminders<T> {
  const originals = tasks.filter((t) => !isReminderTitle(t.title));
  const byNorm = new Map<string, T>();
  for (const t of originals) if (!byNorm.has(norm(t.title))) byNorm.set(norm(t.title), t);

  const byTask = new Map<string, T[]>();
  const linked: T[] = [];
  for (const r of tasks) {
    if (!isReminderTitle(r.title)) continue;
    const key = norm(r.title);
    if (!key) continue;
    const target =
      byNorm.get(key) ??
      // تطابق جزئي: «تذكير: كتابة الخلفية» مع «كتابة الخلفية والمراجع» — نشترط ٦ حروف على الأقل عشان ما يلتقط كلمة عامة
      (key.length >= 6 ? originals.find((o) => norm(o.title).includes(key) || (norm(o.title).length >= 6 && key.includes(norm(o.title)))) : undefined);
    if (!target) continue;
    linked.push(r);
    byTask.set(target.id, [...(byTask.get(target.id) ?? []), r]);
  }
  const linkedIds = new Set(linked.map((r) => r.id));
  return { visible: tasks.filter((t) => !linkedIds.has(t.id)), byTask, linked };
}

/** أقرب تذكير جاي (ما خلص، وموعده اليوم أو بعده) — هو اللي نعرضه كشارة */
export function nextReminder<T extends ReminderLike>(reminders: T[] | undefined, today: string): T | undefined {
  return (reminders ?? [])
    .filter((r) => r.status !== "done" && r.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
}
