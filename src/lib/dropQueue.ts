import type { DropSource } from "./drops";

/** ملفات انرمت من صفحة ثانية / من الكرة / من المشاركة — صفحة «ارموا» تاخذها أول ما تنفتح (أو فورًا لو مفتوحة) */
let pending: { files: File[]; text?: string; source: DropSource } | null = null;
export const PENDING_EVENT = "wesync:drop-pending";
export function queueDrop(files: File[], source: DropSource, text?: string) {
  pending = { files, source, text };
  window.dispatchEvent(new Event(PENDING_EVENT));
}
export function takePending() {
  const p = pending;
  pending = null;
  return p;
}
export const hasPending = () => !!pending;
