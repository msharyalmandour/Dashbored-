import { isSupabaseConfigured, supabase } from "./supabaseClient";

/** Wesync Meet: توكن الدخول من دالة meet-token (عضو بالـ JWT، أو المشرف/ة برمز رابطه) */

export interface MeetJoin {
  configured: boolean;
  url?: string;
  token?: string;
  room?: string;
  identity?: string;
  teamName?: string;
  error?: string;
}
export interface MeetStatus {
  configured: boolean;
  live: boolean;
  count: number;
  names: string[];
  supervisor?: boolean;
}

async function call<T>(body: Record<string, unknown>): Promise<T | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase!.functions.invoke("meet-token", { body });
    if (error) return null;
    return data as T;
  } catch {
    return null;
  }
}

export const joinAsMember = () => call<MeetJoin>({ action: "join" });
export const joinAsGuest = (shareToken: string, name: string) => call<MeetJoin>({ action: "guest", shareToken, name });
export const meetStatus = (shareToken?: string) => call<MeetStatus>(shareToken ? { action: "status", shareToken } : { action: "status" });

// ───────── رسائل البيانات داخل الغرفة ─────────
export type MeetData = { t: "chat"; id: string; text: string; at: number } | { t: "hand"; up: boolean };
const enc = new TextEncoder();
const dec = new TextDecoder();
export const encodeData = (d: MeetData) => enc.encode(JSON.stringify(d));
export function decodeData(bytes: Uint8Array): MeetData | null {
  try {
    const d = JSON.parse(dec.decode(bytes)) as MeetData;
    if (d?.t === "chat" && typeof d.text === "string") return { t: "chat", id: String(d.id ?? ""), text: d.text.slice(0, 2000), at: Number(d.at) || Date.now() };
    if (d?.t === "hand") return { t: "hand", up: !!d.up };
  } catch {
    /* رسالة مو لنا */
  }
  return null;
}

/** ترتيب الشبكة: كم عمود حسب العدد والعرض */
export function gridCols(n: number, wide: boolean): number {
  if (n <= 1) return 1;
  if (!wide) return n <= 2 ? 1 : 2;
  if (n <= 2) return 2;
  if (n <= 4) return 2;
  if (n <= 9) return 3;
  return 4;
}

export const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};
