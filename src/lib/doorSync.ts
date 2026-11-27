import { supabase } from "./supabaseClient";
import { DOOR_ORDER, type DoorId } from "./doors";

/* الأبواب بالقاعدة (PENDING_2026-11-18_doors_receipts.sql): team_doors(key, unlocked_at, seen_at) + unlock_door() + mark_door_seen().
   الفتح idempotent بالسيرفر (يسجّل التاريخ + حدث door_unlocked + إيصال). قبل تشغيل ملف SQL: نرجع null ونكمّل بالجهاز. */

export interface DoorRow {
  key: DoorId;
  unlockedAt: string;
  seenAt: string | null;
}

export async function fetchDoorRows(): Promise<DoorRow[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("team_doors").select("key, unlocked_at, seen_at");
  if (error) return null;
  return ((data ?? []) as { key: DoorId; unlocked_at: string; seen_at: string | null }[]).map((r) => ({ key: r.key, unlockedAt: r.unlocked_at, seenAt: r.seen_at }));
}

export async function unlockDoor(key: DoorId): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("unlock_door", { p_key: key });
  return !error && data === true;
}

export async function markDoorSeen(key: DoorId): Promise<void> {
  if (!supabase) return;
  await supabase.rpc("mark_door_seen", { p_key: key }).then(() => undefined, () => undefined);
}

/** من الصفوف + المفتوح الحين: وش لازم ينفتح بالسيرفر، ووش «جديد» (انفتح وما شافوا لحظته) */
export function reconcile(open: Set<DoorId>, rows: DoorRow[]): { toUnlock: DoorId[]; fresh: DoorId[] } {
  const have = new Map(rows.map((r) => [r.key, r]));
  const toUnlock = DOOR_ORDER.filter((d) => open.has(d) && !have.has(d));
  const fresh = DOOR_ORDER.filter((d) => open.has(d) && (!have.has(d) || !have.get(d)!.seenAt));
  return { toUnlock, fresh };
}
