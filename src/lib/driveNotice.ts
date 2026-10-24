import { useSyncExternalStore } from "react";

/* إشعار «انحفظ في درايف»: يبدأ لما يبدأ الرفع، ويتحول لنجاح/فشل بنتيجته الحقيقية — الواجهة بس تعرض */
export interface DriveNotice {
  id: number;
  phase: "uploading" | "done" | "failed";
  link?: string;
  message?: string;
}

let current: DriveNotice | null = null;
let seq = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export const driveNotice = {
  start(): number {
    seq += 1;
    current = { id: seq, phase: "uploading" };
    emit();
    return seq;
  },
  done(id: number, link?: string) {
    if (current?.id !== id) return;
    current = { id, phase: "done", link };
    emit();
  },
  fail(id: number, message?: string) {
    if (current?.id !== id) return;
    current = { id, phase: "failed", message };
    emit();
  },
  clear(id: number) {
    if (current?.id !== id) return;
    current = null;
    emit();
  },
};

const subscribe = (cb: () => void) => {
  subs.add(cb);
  return () => subs.delete(cb);
};

export function useDriveNotice(): DriveNotice | null {
  return useSyncExternalStore(subscribe, () => current);
}
