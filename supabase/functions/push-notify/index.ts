// إشعارات الجوال (Web Push) — مفاتيح VAPID تتولّد تلقائيًا أول مرة وتتخزّن بجدول push_config (service_role فقط):
//   key   : (عضو مسجّل دخول) يرجّع المفتاح العام للمتصفح عشان يسجّل الاشتراك
//   test  : (عضو مسجّل دخول) يرسل إشعار تجريبي لأجهزته
//   daily : (من pg_cron، بسر الجدولة) تذكير لكل عضو بمهامه القريبة والمتأخرة — مرة باليوم لكل عضو
// الاشتراكات الميتة (404/410) تنحذف تلقائيًا. بدون أي مفتاح يدخله أحد يدويًا.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-digest-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const site = () => (Deno.env.get("SITE_URL") ?? "https://wesyncapp.com").replace(/\/$/, "");

const riyadhDate = (offsetDays = 0) => new Date(Date.now() + 3 * 3600000 + offsetDays * 86400000).toISOString().slice(0, 10);

let keys: { publicKey: string; privateKey: string } | null = null;
async function getKeys(): Promise<{ publicKey: string; privateKey: string }> {
  if (keys) return keys;
  const { data } = await admin.from("push_config").select("public_key, private_key").eq("id", 1).maybeSingle();
  if (data) return (keys = { publicKey: data.public_key, privateKey: data.private_key });
  const fresh = webpush.generateVAPIDKeys();
  // لو دالتين تولّدان بنفس الوقت، الأولى تفوز ونقرأ مفاتيحها
  await admin.from("push_config").upsert({ id: 1, public_key: fresh.publicKey, private_key: fresh.privateKey }, { onConflict: "id", ignoreDuplicates: true });
  const { data: again } = await admin.from("push_config").select("public_key, private_key").eq("id", 1).single();
  return (keys = { publicKey: again!.public_key, privateKey: again!.private_key });
}

interface Sub {
  id: string;
  profile_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function sendTo(subs: Sub[], payload: { title: string; body: string; url: string; tag?: string }): Promise<number> {
  if (subs.length === 0) return 0;
  const k = await getKeys();
  webpush.setVapidDetails(`mailto:${Deno.env.get("PUSH_CONTACT") ?? "support@wesync.app"}`, k.publicKey, k.privateKey);
  let ok = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 86400 });
      ok++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
      else console.error("push failed", code ?? (err instanceof Error ? err.message : err));
    }
  }
  return ok;
}

async function secretOk(given: string | null): Promise<boolean> {
  if (!given) return false;
  const { data, error } = await admin.rpc("verify_digest_secret", { p_secret: given });
  if (error) console.error("verify_digest_secret failed", error.message);
  return data === true;
}

async function runDaily(): Promise<{ sent: number }> {
  const today = riyadhDate();
  const soon = riyadhDate(1);
  const { data: subs } = await admin.from("push_subscriptions").select("id, profile_id, endpoint, p256dh, auth").limit(5000);
  const byProfile = new Map<string, Sub[]>();
  for (const s of (subs ?? []) as Sub[]) byProfile.set(s.profile_id, [...(byProfile.get(s.profile_id) ?? []), s]);
  if (byProfile.size === 0) return { sent: 0 };

  const { data: tasks } = await admin
    .from("tasks")
    .select("title, due_date, assignee_id")
    .in("assignee_id", [...byProfile.keys()])
    .neq("status", "done")
    .not("due_date", "is", null)
    .lte("due_date", soon)
    .limit(2000);

  let sent = 0;
  for (const [profileId, list] of byProfile) {
    const mine = ((tasks ?? []) as { title: string; due_date: string; assignee_id: string }[]).filter((t) => t.assignee_id === profileId);
    if (mine.length === 0) continue;
    // إشعار واحد باليوم لكل عضو
    const { error: dup } = await admin.from("reminder_log").insert({ kind: "push-daily", ref_id: profileId, recipient: today });
    if (dup) continue;
    const late = mine.filter((t) => t.due_date < today).length;
    const soonCount = mine.length - late;
    const first = mine.sort((a, b) => a.due_date.localeCompare(b.due_date))[0].title;
    const parts = [late > 0 ? `${late} متأخرة` : "", soonCount > 0 ? `${soonCount} موعدها اليوم أو بكرة` : ""].filter(Boolean).join(" و");
    const n = await sendTo(list, { title: "مهامك", body: `${parts}. أقربها: ${first}`.slice(0, 160), url: `${site()}/#/tasks`, tag: "daily-tasks" });
    if (n === 0) await admin.from("reminder_log").delete().eq("kind", "push-daily").eq("ref_id", profileId).eq("recipient", today);
    sent += n;
  }
  return { sent };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* بدون جسم */
  }
  const action = String(body.action ?? "");
  try {
    if (action === "key" || action === "test") {
      const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      const { data: u } = await admin.auth.getUser(jwt);
      if (!u?.user) return json(401, { error: "unauthorized" });
      if (action === "key") return json(200, { publicKey: (await getKeys()).publicKey });
      const { data: subs } = await admin.from("push_subscriptions").select("id, profile_id, endpoint, p256dh, auth").eq("profile_id", u.user.id);
      const n = await sendTo((subs ?? []) as Sub[], { title: "Wesync", body: "الإشعارات شغّالة ✓ بتوصلك تذكيرات مهامك هنا.", url: `${site()}/#/tasks`, tag: "test" });
      return json(200, { sent: n });
    }
    if (!(await secretOk(req.headers.get("x-digest-secret")))) return json(401, { error: "unauthorized" });
    if (action === "daily") return json(200, await runDaily());
    return json(400, { error: "unknown_action" });
  } catch (err) {
    console.error("push-notify error:", err instanceof Error ? err.message : err);
    return json(500, { error: "server_error" });
  }
});
