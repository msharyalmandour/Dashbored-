// Supabase Edge Function — meet-token: دخول غرفة اجتماع الفريق (Wesync Meet على LiveKit).
//  join    : عضو الفريق (JWT) → توكن لغرفة فريقه
//  guest   : المشرف/ة برمز رابطه (بدون حساب) → توكن لنفس الغرفة
//  status  : مين بالاجتماع الحين (للشريط «الفريق في اجتماع») — بالـ JWT أو برمز الرابط
//  ring    : «ويسي يتصل» — عضو (JWT) يبدأ مكالمة للفريق: صف بـ meet_calls (شاشة مكالمة بالتطبيق) + إشعار للغايبين
//  cron    : (pg_cron كل 5 دقايق، بسر الجدولة) يتصل وقت اجتماعات التقويم، وبعد 5 دقايق يتصل بالجوال على الغايب
//            اللي فعّل «اتصل علي» (رقمه المؤكد بالواتساب) — Twilio + صوت ويسي من ElevenLabs
// أسرار اختيارية للجوال: TWILIO_ACCOUNT_SID، TWILIO_AUTH_TOKEN، TWILIO_FROM (بدونها: تطبيق + إشعار بس).
// المتغيرات (يحطها المالك بأسرار Supabase): LIVEKIT_URL، LIVEKIT_API_KEY، LIVEKIT_API_SECRET.
// verify_jwt=false لأن المشرف/ة ما عنده حساب — نتحقق بأنفسنا من الـ JWT أو الرمز.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { accessToken, cleanName, httpUrl, roomName } from "./lib.ts";
import { callScript, dueMeetings, PHONE_AFTER_MS, PHONE_MONTHLY_PER_TEAM, PHONE_UNTIL_MS, phoneTargets, ringPush, twiml } from "./calls.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const LK_URL = Deno.env.get("LIVEKIT_URL") ?? "";
const LK_KEY = Deno.env.get("LIVEKIT_API_KEY") ?? "";
const LK_SECRET = Deno.env.get("LIVEKIT_API_SECRET") ?? "";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-digest-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function member(req: Request): Promise<{ id: string; name: string; teamId: string; role: string } | null> {
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data?.user) return null;
  const { data: p } = await admin.from("profiles").select("name, team_id, role").eq("id", data.user.id).maybeSingle();
  if (!p?.team_id) return null;
  return { id: data.user.id, name: p.name, teamId: p.team_id, role: p.role };
}
async function teamByToken(token: unknown): Promise<{ id: string; name: string } | null> {
  if (typeof token !== "string" || !UUID.test(token)) return null;
  const { data } = await admin.from("teams").select("id, name").eq("share_token", token).maybeSingle();
  return data ?? null;
}

/** مين بالغرفة الحين (Twirp RoomService/ListParticipants بتوكن إداري قصير) */
async function participants(teamId: string): Promise<{ identity: string; name: string; role: string }[]> {
  const room = roomName(teamId);
  const t = await accessToken({ apiKey: LK_KEY, secret: LK_SECRET, identity: "wesync-server", grant: { room, roomAdmin: true }, ttlSec: 60 });
  const r = await fetch(`${httpUrl(LK_URL)}/twirp/livekit.RoomService/ListParticipants`, {
    method: "POST",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify({ room }),
  });
  if (!r.ok) return []; // الغرفة ما انفتحت بعد = ما أحد
  const d = (await r.json()) as { participants?: { identity: string; name?: string; metadata?: string }[] };
  return (d.participants ?? []).map((p) => {
    let role = "student";
    try {
      role = JSON.parse(p.metadata || "{}").role ?? role;
    } catch {
      /* بدون بيانات */
    }
    return { identity: p.identity, name: p.name ?? "", role };
  });
}

// ───────── «ويسي يتصل» ─────────
let vapid = false;
async function pushTo(profileIds: string[], msg: { title: string; body: string; url: string; tag: string }) {
  if (!profileIds.length) return 0;
  if (!vapid) {
    const { data } = await admin.from("push_config").select("public_key, private_key").eq("id", 1).maybeSingle();
    if (!data?.public_key) return 0;
    webpush.setVapidDetails(`mailto:${Deno.env.get("PUSH_CONTACT") ?? "support@wesync.app"}`, data.public_key, data.private_key);
    vapid = true;
  }
  const { data: subs } = await admin.from("push_subscriptions").select("id, profile_id, endpoint, p256dh, auth").in("profile_id", profileIds);
  let sent = 0;
  for (const s of (subs ?? []) as { id: string; endpoint: string; p256dh: string; auth: string }[]) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 600, urgency: "high" });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
    }
  }
  return sent;
}

async function teamMembers(teamId: string) {
  const { data } = await admin.from("profiles").select("id, name, role, gender").eq("team_id", teamId);
  return ((data ?? []) as { id: string; name: string | null; role: string; gender: string | null }[]).map((m) => ({ id: m.id, name: String(m.name ?? "").trim(), female: m.gender === "female" }));
}

/** يبدأ مكالمة للفريق (أو يرجّع المكالمة اللي بدأت قبل أقل من 10 دقايق) ويرسل إشعار للي مو بالغرفة */
async function startCall(teamId: string, opts: { by?: string | null; byName?: string; source: "join" | "manual" | "schedule"; eventId?: string; title?: string }) {
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { data: recent } = await admin.from("meet_calls").select("id, created_at").eq("team_id", teamId).gte("created_at", since).order("created_at", { ascending: false }).limit(1).maybeSingle();
  // «اتصلوا مرة ثانية» يدويًا مسموح بعد دقيقتين
  if (recent && !(opts.source === "manual" && Date.now() - Date.parse(recent.created_at) > 2 * 60_000)) return { callId: recent.id as string, rang: 0, reused: true };
  const { data: call, error } = await admin.from("meet_calls").insert({ team_id: teamId, started_by: opts.by ?? null, source: opts.source, calendar_event_id: opts.eventId ?? null }).select("id").single();
  if (error || !call) return { callId: null, rang: 0, reused: false };
  const inRoom = new Set((await participants(teamId)).map((p) => p.identity));
  const members = await teamMembers(teamId);
  const absent = members.filter((m) => m.id !== opts.by && !inRoom.has(m.id)).map((m) => m.id);
  const female = !!opts.by && (await admin.from("profiles").select("gender").eq("id", opts.by).maybeSingle()).data?.gender === "female";
  const msg = ringPush(opts.byName ?? "", opts.title, female);
  const rang = await pushTo(absent, { ...msg, url: `/#/meet?call=${call.id}`, tag: `meet-${call.id}` });
  return { callId: call.id as string, rang, reused: false };
}

/** صوت ويسي للمكالمة (ElevenLabs) ← رابط مؤقت يشغّله Twilio. لو ما زبط نرجع null ويقرأ Twilio النص */
async function wesyAudio(teamId: string, key: string, text: string): Promise<string | null> {
  const k = Deno.env.get("ELEVENLABS_API_KEY");
  if (!k) return null;
  try {
    const voice = Deno.env.get("ELEVENLABS_VOICE_ID") ?? "21m00Tcm4TlvDq8ikWAM";
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_22050_32`, {
      method: "POST",
      headers: { "xi-api-key": k, "Content-Type": "application/json" },
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
    });
    if (!r.ok) return null;
    const path = `${teamId}/calls/${key}.mp3`;
    const up = await admin.storage.from("drops").upload(path, new Uint8Array(await r.arrayBuffer()), { contentType: "audio/mpeg", upsert: true });
    if (up.error) return null;
    const { data } = await admin.storage.from("drops").createSignedUrl(path, 900);
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
}

async function phoneCall(to: string, xmlBody: string): Promise<boolean> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const tok = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_FROM");
  if (!sid || !tok || !from) return false;
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${sid}:${tok}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: from, Twiml: xmlBody, Timeout: "25" }),
  });
  if (!r.ok) console.error("meet-token twilio:", r.status, (await r.text().catch(() => "")).slice(0, 200));
  return r.ok;
}

const monthStart = () => {
  const d = new Date(Date.now() + 3 * 3600_000);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - 3 * 3600_000).toISOString();
};

/** الجدولة: مكالمات التقويم + اتصال الجوال للغايب */
async function cron() {
  let scheduled = 0;
  let phoned = 0;
  // 1) اجتماعات التقويم اللي وقتها الحين
  const today = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
  const { data: evs } = await admin.from("calendar_events").select("id, team_id, title, event_date, event_time, event_type").eq("event_date", today).eq("event_type", "meeting");
  for (const e of dueMeetings((evs ?? []) as { id: string; team_id: string; title: string; event_date: string; event_time: string; event_type: string }[])) {
    const { data: done } = await admin.from("meet_calls").select("id").eq("calendar_event_id", e.id).limit(1).maybeSingle();
    if (done) continue;
    const r = await startCall(e.team_id, { source: "schedule", eventId: e.id, title: e.title });
    if (r.callId && !r.reused) scheduled++;
  }
  // 2) الجوال: مكالمات عمرها 5–20 دقيقة والاجتماع شغّال
  if (!Deno.env.get("TWILIO_ACCOUNT_SID")) return { scheduled, phoned, phone: "not_configured" };
  const from = new Date(Date.now() - PHONE_UNTIL_MS).toISOString();
  const to = new Date(Date.now() - PHONE_AFTER_MS).toISOString();
  const { data: calls } = await admin.from("meet_calls").select("id, team_id").gte("created_at", from).lte("created_at", to);
  for (const c of (calls ?? []) as { id: string; team_id: string }[]) {
    const { data: canWrite } = await admin.rpc("team_can_write", { tid: c.team_id });
    if (canWrite === false) continue;
    const room = await participants(c.team_id);
    if (!room.length) continue; // الاجتماع خلص أو ما بدأ
    const members = await teamMembers(c.team_id);
    const ids = members.map((m) => m.id);
    const { count: used } = await admin.from("reminder_log").select("id", { count: "exact", head: true }).eq("kind", "meet-phone").in("recipient", ids).gte("created_at", monthStart());
    if ((used ?? 0) >= PHONE_MONTHLY_PER_TEAM) continue;
    const [{ data: links }, { data: answers }, { data: logs }] = await Promise.all([
      admin.from("whatsapp_links").select("profile_id, phone, call_me, linked_at").eq("team_id", c.team_id),
      admin.from("meet_call_answers").select("profile_id, answer").eq("call_id", c.id),
      admin.from("reminder_log").select("recipient").eq("kind", "meet-phone").eq("ref_id", c.id),
    ]);
    const inRoom = new Set(room.map((p) => p.identity));
    const targets = phoneTargets(members, (links ?? []) as never[], inRoom, (answers ?? []) as never[], new Set(((logs ?? []) as { recipient: string }[]).map((l) => l.recipient)));
    const waiting = room.filter((p) => p.role !== "supervisor").map((p) => p.name);
    for (const t of targets.slice(0, Math.max(0, PHONE_MONTHLY_PER_TEAM - (used ?? 0)))) {
      // نسجّل قبل الاتصال: لو تكررت الجدولة ما نتصل مرتين
      const { error } = await admin.from("reminder_log").insert({ kind: "meet-phone", ref_id: c.id, recipient: t.id });
      if (error) continue;
      const text = callScript(t.name, waiting, t.female);
      const audio = await wesyAudio(c.team_id, `${c.id}-${t.id}`, text);
      if (await phoneCall(t.phone, twiml(audio, text))) phoned++;
    }
  }
  return { scheduled, phoned };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method" });
  if (!LK_URL || !LK_KEY || !LK_SECRET) return json(200, { configured: false });
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "bad_json" });
  }
  const action = String(body.action ?? "join");

  if (action === "cron") {
    const given = req.headers.get("x-digest-secret") ?? "";
    const { data: ok } = await admin.rpc("verify_digest_secret", { p_secret: given });
    if (ok !== true) return json(401, { error: "unauthorized" });
    return json(200, await cron());
  }

  if (action === "guest" || (action === "status" && body.shareToken)) {
    const team = await teamByToken(body.shareToken);
    if (!team) return json(403, { error: "bad_token" });
    if (action === "status") {
      const ps = await participants(team.id);
      return json(200, { configured: true, live: ps.length > 0, count: ps.length, names: ps.map((p) => p.name).slice(0, 8) });
    }
    const name = cleanName(body.name, "المشرف/ة");
    const identity = `sup-${crypto.randomUUID().slice(0, 8)}`;
    const token = await accessToken({
      apiKey: LK_KEY, secret: LK_SECRET, identity, name, metadata: { role: "supervisor" },
      grant: { room: roomName(team.id), roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true },
    });
    return json(200, { configured: true, url: LK_URL, token, room: roomName(team.id), identity, teamName: team.name });
  }

  const me = await member(req);
  if (!me) return json(401, { error: "unauthorized" });
  if (action === "status") {
    const ps = await participants(me.teamId);
    return json(200, { configured: true, live: ps.length > 0, count: ps.length, names: ps.map((p) => p.name).slice(0, 8), supervisor: ps.some((p) => p.role === "supervisor") });
  }
  if (action === "ring") {
    const r = await startCall(me.teamId, { by: me.id, byName: me.name, source: body.source === "manual" ? "manual" : "join" });
    return json(200, { configured: true, ...r });
  }
  if (action !== "join") return json(400, { error: "bad_action" });
  const token = await accessToken({
    apiKey: LK_KEY, secret: LK_SECRET, identity: me.id, name: me.name, metadata: { role: me.role === "leader" ? "leader" : "student" },
    grant: { room: roomName(me.teamId), roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true, canUpdateOwnMetadata: true },
  });
  return json(200, { configured: true, url: LK_URL, token, room: roomName(me.teamId), identity: me.id });
});
