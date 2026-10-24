import { useSyncExternalStore } from "react";

/* احتفال إنهاء مرحلة: يُطلق من أي مكان تنتقلون فيه للمرحلة الجاية */
export interface StageCelebration {
  order: number;
  title: string;
  nextTitle?: string;
  nextTo: string;
}

let current: StageCelebration | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export const stageCelebration = {
  show(c: StageCelebration) {
    current = c;
    emit();
  },
  hide() {
    current = null;
    emit();
  },
};

const subscribe = (cb: () => void) => {
  subs.add(cb);
  return () => subs.delete(cb);
};
export function useStageCelebration(): StageCelebration | null {
  return useSyncExternalStore(subscribe, () => current);
}
