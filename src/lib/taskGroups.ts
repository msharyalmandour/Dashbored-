import { tr } from "./i18n";

export interface GroupableTask {
  status: string;
  dueDate: string;
}

export interface TaskGroup<T> {
  key: "overdue" | "week" | "later" | "done";
  label: string;
  items: T[];
}

const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

/** ترتيب المهام بمجموعات واضحة: متأخرة ← هالأسبوع ← لاحقًا ← مكتملة (كل مجموعة بالأقرب موعد). today = YYYY-MM-DD بتوقيت الرياض */
export function groupTasks<T extends GroupableTask>(tasks: T[], today: string): TaskGroup<T>[] {
  const weekEnd = addDays(today, 7);
  const byDue = (a: T, b: T) => a.dueDate.localeCompare(b.dueDate);
  const open = tasks.filter((t) => t.status !== "done").sort(byDue);
  const groups: TaskGroup<T>[] = [
    { key: "overdue", label: tr("متأخرة"), items: open.filter((t) => t.dueDate < today) },
    { key: "week", label: tr("هالأسبوع"), items: open.filter((t) => t.dueDate >= today && t.dueDate <= weekEnd) },
    { key: "later", label: tr("لاحقًا"), items: open.filter((t) => t.dueDate > weekEnd) },
    { key: "done", label: tr("مكتملة"), items: tasks.filter((t) => t.status === "done").sort((a, b) => b.dueDate.localeCompare(a.dueDate)) },
  ];
  return groups.filter((g) => g.items.length > 0);
}
