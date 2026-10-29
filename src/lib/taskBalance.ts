/** «وزّعها بالتساوي»: اقتراح نقل مهام مفتوحة من الأكثر حملًا للأقل، لين الفرق بين أي اثنين ما يتعدى مهمة وحدة.
    ما ينقل المتأخرة ولا اللي «قيد التنفيذ» (صاحبها بادي فيها)، ويبدأ بالأبعد موعدًا. عرض بس — التطبيق بعد موافقة القائد. */
export interface BalanceTask {
  id: string;
  title: string;
  assigneeId: string;
  dueDate: string;
  status: string;
}

export interface BalanceMove<T extends BalanceTask = BalanceTask> {
  task: T;
  from: string;
  to: string;
}

export function evenPlan<T extends BalanceTask>(open: T[], memberIds: string[], today: string): BalanceMove<T>[] {
  if (memberIds.length < 2) return [];
  const load = new Map<string, T[]>(memberIds.map((id) => [id, open.filter((t) => t.assigneeId === id)]));
  const moves: BalanceMove<T>[] = [];
  const movable = (t: T) => t.status !== "in-progress" && t.status !== "done" && t.status !== "overdue" && t.dueDate >= today;
  for (let guard = 0; guard < open.length; guard++) {
    const sorted = [...load.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    const [mostId, mostTasks] = sorted[0];
    const [leastId, leastTasks] = sorted[sorted.length - 1];
    if (mostTasks.length - leastTasks.length < 2) break;
    const pick = mostTasks.filter(movable).sort((a, b) => b.dueDate.localeCompare(a.dueDate))[0];
    if (!pick) {
      // ما عنده شي ينقال: نوقفه عن الحسبة ونكمل مع الباقين
      load.delete(mostId);
      if (load.size < 2) break;
      continue;
    }
    load.set(mostId, mostTasks.filter((t) => t !== pick));
    load.set(leastId, [...leastTasks, pick]);
    moves.push({ task: pick, from: mostId, to: leastId });
  }
  return moves;
}
