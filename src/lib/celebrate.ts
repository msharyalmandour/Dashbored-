/** لحظات الاحتفال: أي مكان بالتطبيق ينادي celebrate، و<Celebrate/> بالـLayout يعرض القصاصات وكلمة ويسي. */
export type CelebrateKind = "task" | "section" | "stage";
export const CELEBRATE_EVENT = "wesync:celebrate";

export function celebrate(kind: CelebrateKind, text?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CELEBRATE_EVENT, { detail: { kind, text } }));
}
