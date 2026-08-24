import { Flame, Library, Rocket, Target, Trophy, type LucideIcon } from "lucide-react";
import type { EvidencePaper, ResearchStage, Task } from "../data/types";

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
}

export const achievements: Achievement[] = [
  { id: "first-task", title: "أول مهمة مكتملة", desc: "بداية موفقة 🎯", icon: Target },
  { id: "ten-evidence", title: "١٠ دراسات مراجَعة", desc: "مكتبة أدلة بتتكوّن 📚", icon: Library },
  { id: "stage-done", title: "مرحلة بحثية كاملة", desc: "خطوة كبيرة للأمام 🏁", icon: Rocket },
  { id: "no-overdue", title: "صفر مهام متأخرة", desc: "الفريق كله مواكب 🔥", icon: Flame },
  { id: "half-done", title: "تجاوزتم نص الطريق", desc: "الأصعب خلفكم الآن 🚀", icon: Trophy },
];

export function getUnlockedAchievementIds(ctx: {
  tasks: Task[];
  evidenceLibrary: EvidencePaper[];
  researchStages: ResearchStage[];
  overallProgress: number;
}): Set<string> {
  const unlocked = new Set<string>();
  if (ctx.tasks.some((t) => t.status === "done")) unlocked.add("first-task");
  if (ctx.evidenceLibrary.filter((p) => p.reviewStatus === "reviewed").length >= 10) {
    unlocked.add("ten-evidence");
  }
  if (ctx.researchStages.some((s) => s.status === "done")) unlocked.add("stage-done");
  if (ctx.tasks.length > 0 && ctx.tasks.every((t) => t.status !== "overdue")) {
    unlocked.add("no-overdue");
  }
  if (ctx.overallProgress >= 50) unlocked.add("half-done");
  return unlocked;
}
