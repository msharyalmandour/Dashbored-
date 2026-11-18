/* أنواع brand/wesy-real.js (ويسي) — الملف نفسه منسوخ بدون تعديل */
export type WesyState =
  | "idle" | "greet" | "listening" | "thinking" | "typing" | "working" | "success" | "error" | "sleep"
  | "laugh" | "wink" | "yawn" | "deadline" | "celebrate" | "wait";
export type WesyOutfit = "normal" | "morning" | "deadline" | "national" | "ramadan" | "grad";
export interface WesyOptions {
  state?: WesyState;
  shemagh?: string;
  shadow?: boolean;
  outfit?: WesyOutfit;
  stage?: number;
  formal?: boolean;
  glasses?: boolean;
  follow?: boolean;
  confetti?: boolean;
  settleAfter?: number;
  crop?: "head";
  vb?: string;
}
export interface WesyInstance {
  o: WesyOptions;
  raf: number;
  paused: boolean;
  set(state: WesyState): WesyInstance;
  tap(): WesyInstance;
  level(v: number): WesyInstance;
  wake(): WesyInstance;
  excited(v: boolean): WesyInstance;
  raise(): WesyInstance;
  destroy(): void;
}
declare global {
  interface Window {
    WesyReal: new (host: HTMLElement, o?: WesyOptions) => WesyInstance;
  }
}
