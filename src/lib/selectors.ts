import { researchPhases } from "../data/mockData";
import type { PhaseStatus } from "../data/types";

export interface MilestoneGroup {
  name: string;
  status: PhaseStatus;
  progress: number;
}

export function getMilestoneGroups(): MilestoneGroup[] {
  const order: string[] = [];
  const byGroup = new Map<string, typeof researchPhases>();

  for (const phase of researchPhases) {
    if (!byGroup.has(phase.milestoneGroup)) {
      byGroup.set(phase.milestoneGroup, []);
      order.push(phase.milestoneGroup);
    }
    byGroup.get(phase.milestoneGroup)!.push(phase);
  }

  return order.map((name) => {
    const phases = byGroup.get(name)!;
    const progress = Math.round(
      phases.reduce((sum, p) => sum + p.progress, 0) / phases.length,
    );
    let status: PhaseStatus = "upcoming";
    if (phases.every((p) => p.status === "done")) status = "done";
    else if (phases.some((p) => p.status === "active" || p.status === "done"))
      status = "active";
    return { name, status, progress };
  });
}
