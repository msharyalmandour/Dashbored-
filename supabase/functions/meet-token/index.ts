// Supabase Edge Function — meet-token: دخول غرفة اجتماع الفريق (Wesync Meet على LiveKit).
//  join    : عضو الفريق (JWT) → توكن لغرفة فريقه
//  guest   : المشرف/ة برمز رابطه (بدون حساب) → توكن لنفس الغرفة
//  status  : مين بالاجتماع الحين (للشريط «الفريق في اجتماع») — بالـ JWT أو برمز الرابط
// المتغيرات (يحطها المالك بأسرار Supabase): LIVEKIT_URL، LIVEKIT_API_KEY، LIVEKIT_API_SECRET.
// verify_jwt=false لأن المشرف/ة ما عنده حساب — نتحقق بأنفسنا من الـ JWT أو الرمز.
import { createClient } from "npm:@supabase/supabase-js@2";
import { accessToken, cleanName, httpUrl, roomName } from "./lib.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const LK_URL = Deno.env.get("LIVEKIT_URL") ?? "";
const LK_KEY = Deno.env.get("LIVEKIT_API_KEY") ?? "";
const LK_SECRET = Deno.env.get("LIVEKIT_API_SECRET") ?? "";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
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
  if (action !== "join") return json(400, { error: "bad_action" });
  const token = await accessToken({
    apiKey: LK_KEY, secret: LK_SECRET, identity: me.id, name: me.name, metadata: { role: me.role === "leader" ? "leader" : "student" },
    grant: { room: roomName(me.teamId), roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true, canUpdateOwnMetadata: true },
  });
  return json(200, { configured: true, url: LK_URL, token, room: roomName(me.teamId), identity: me.id });
});
