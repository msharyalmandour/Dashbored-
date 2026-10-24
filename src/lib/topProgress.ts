import { useSyncExternalStore } from "react";

/* عدّاد بسيط لعمليات التحميل الشغالة — الشريط العلوي يظهر طول ما فيه عملية وحدة على الأقل */
let count = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export const topProgress = {
  start() {
    count += 1;
    emit();
  },
  done() {
    count = Math.max(0, count - 1);
    emit();
  },
  /** وميضة قصيرة (مثلًا عند التنقل بين الصفحات) */
  pulse(ms = 450) {
    this.start();
    setTimeout(() => this.done(), ms);
  },
};

const subscribe = (cb: () => void) => {
  subs.add(cb);
  return () => subs.delete(cb);
};

export function useTopProgressActive(): boolean {
  return useSyncExternalStore(subscribe, () => count > 0);
}
