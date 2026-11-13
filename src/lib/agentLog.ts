import { isSupabaseConfigured, supabase } from "./supabaseClient";
import type { Receipt, ReceiptItem } from "./agentPlan";

/* سجل الوكيل (agent_actions): مين وافق، وش تغيّر، وكيف نتراجع (24 ساعة).
   قبل ما ينضاف الجدول بالقاعدة نحفظ بالجهاز (localStorage) عشان التراجع يشتغل على الأقل من نفس الجهاز. */

const LOCAL = (teamId: string) => `wesync.agent.receipts.${teamId}`;

function readLocal(teamId: string): Receipt[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL(teamId)) ?? "[]") as Receipt[];
  } catch {
    return [];
  }
}
function writeLocal(teamId: string, list: Receipt[]) {
  try {
    localStorage.setItem(LOCAL(teamId), JSON.stringify(list.slice(0, 30)));
  } catch {
    // ما يهم
  }
}

const missingTable = (msg?: string) => !!msg && /agent_actions|relation .* does not exist|schema cache|mark_agent_action_undone/i.test(msg);

export async function logAgentAction(input: { teamId: string; userId: string; userName: string; request: string; summary: string; items: ReceiptItem[] }): Promise<Receipt> {
  const local: Receipt = {
    id: `local-${Date.now()}`,
    request: input.request,
    summary: input.summary,
    items: input.items,
    createdAt: new Date().toISOString(),
    approvedByName: input.userName,
    undoneAt: null,
  };
  if (isSupabaseConfigured) {
    const { data, error } = await supabase!
      .from("agent_actions")
      .insert({ team_id: input.teamId, approved_by: input.userId, request: input.request, summary: input.summary, items: input.items })
      .select("id, created_at")
      .single();
    if (!error && data) return { ...local, id: (data as { id: string }).id, createdAt: (data as { created_at: string }).created_at };
    if (error && !missingTable(error.message)) console.warn("agent_actions insert failed", error.message);
  }
  writeLocal(input.teamId, [local, ...readLocal(input.teamId)]);
  return local;
}

export async function markUndone(teamId: string, id: string): Promise<boolean> {
  if (id.startsWith("local-")) {
    const list = readLocal(teamId);
    writeLocal(
      teamId,
      list.map((r) => (r.id === id ? { ...r, undoneAt: new Date().toISOString() } : r)),
    );
    return true;
  }
  if (!isSupabaseConfigured) return false;
  const { data, error } = await supabase!.rpc("mark_agent_action_undone", { p_id: id });
  return !error && data === true;
}

/** آخر الإيصالات (خلال 24 ساعة) — من القاعدة لو الجدول موجود، وإلا من الجهاز */
export async function recentReceipts(teamId: string, nameOf: (id: string | null) => string): Promise<Receipt[]> {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const local = readLocal(teamId).filter((r) => r.createdAt > since);
  if (!isSupabaseConfigured) return local;
  const { data, error } = await supabase!
    .from("agent_actions")
    .select("id, request, summary, items, created_at, approved_by, undone_at")
    .eq("team_id", teamId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) return local;
  const rows = (data ?? []) as { id: string; request: string; summary: string; items: ReceiptItem[]; created_at: string; approved_by: string | null; undone_at: string | null }[];
  return [
    ...rows.map((r) => ({ id: r.id, request: r.request, summary: r.summary, items: r.items ?? [], createdAt: r.created_at, approvedByName: nameOf(r.approved_by), undoneAt: r.undone_at })),
    ...local,
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
