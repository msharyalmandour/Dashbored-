// إيميلات المشرفة من الموقع. verify_jwt=false لأن المشرفة بدون حساب — كل إجراء يوثّق نفسه:
//  subscribe  : برمز رابط المشرفة (share_token) — يرسل إيميل تأكيد (تأكيد مزدوج، ما يُرسل أي شي قبله)
//  confirm / unsubscribe : برمز التأكيد اللي بالإيميل نفسه
//  notify     : عضو فريق مسجّل دخول (JWT) — يرسل إشعار «رد جديد» للمشرفة المؤكَّدة فقط، بحد زمني
// الإرسال عبر Resend. أسرار لازمة: RESEND_API_KEY، EMAIL_FROM (مثل «Wesync <noreply@نطاقكم>»)، وSITE_URL اختياري.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;
const MAX_REQUESTS_PER_DAY = 5;
const MIN_SECONDS_BETWEEN_REQUESTS = 60;
const NOTIFY_COOLDOWN_MINUTES = 10;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function layout(title: string, bodyHtml: string, ctaUrl?: string, ctaLabel?: string, footer?: string) {
  return `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#111;line-height:1.8">
<p style="font-size:12px;letter-spacing:.2em;color:#888;margin:0 0 12px">WESYNC ∞</p>
<h2 style="margin:0 0 12px;font-size:20px">${esc(title)}</h2>
${bodyHtml}
${ctaUrl ? `<p style="margin:24px 0"><a href="${esc(ctaUrl)}" style="background:#f59e0b;color:#111;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:12px;display:inline-block">${esc(ctaLabel ?? "افتحوا الرابط")}</a></p>` : ""}
${footer ? `<p style="font-size:12px;color:#888;border-top:1px solid #eee;padding-top:12px;margin-top:24px">${footer}</p>` : ""}
</div>`;
}

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<{ ok: boolean; reason?: string }> {
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  if (!key || !from) return { ok: false, reason: "email_not_configured" };
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  if (!r.ok) {
    console.error("resend failed", r.status, (await r.text()).slice(0, 300));
    return { ok: false, reason: "send_failed" };
  }
  return { ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "bad_json" });
  }
  const action = String(body.action ?? "");
  const site = (Deno.env.get("SITE_URL") ?? "https://dashbored-sigma.vercel.app").replace(/\/$/, "");
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // ---------- المشرفة تطلب الاشتراك ----------
  if (action === "subscribe") {
    const token = String(body.token ?? "");
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!UUID.test(token)) return json(400, { error: "invalid_token" });
    if (!EMAIL.test(email) || email.length > 254) return json(400, { error: "invalid_email" });

    const { data: team } = await admin.from("teams").select("id, name").eq("share_token", token).maybeSingle();
    if (!team) return json(404, { error: "invalid_token" });

    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await admin.from("supervisor_email_subscriptions").select("*").eq("team_id", team.id).maybeSingle();
    if (existing) {
      const sameDay = existing.requests_day === today;
      if (sameDay && existing.requests_today >= MAX_REQUESTS_PER_DAY) return json(429, { error: "rate_limited" });
      if (Date.now() - new Date(existing.requested_at).getTime() < MIN_SECONDS_BETWEEN_REQUESTS * 1000) return json(429, { error: "rate_limited" });
    }
    const confirmToken = crypto.randomUUID();
    const row = {
      team_id: team.id,
      email,
      confirm_token: confirmToken,
      confirmed_at: null,
      unsubscribed_at: null,
      requested_at: new Date().toISOString(),
      requests_day: today,
      requests_today: existing && existing.requests_day === today ? existing.requests_today + 1 : 1,
    };
    const { error: upErr } = await admin.from("supervisor_email_subscriptions").upsert(row, { onConflict: "team_id" });
    if (upErr) return json(500, { error: "db_error" });

    const link = `${site}/#/supervisor-email/confirm/${confirmToken}`;
    const sent = await sendEmail(
      email,
      "أكّدوا استلام إشعارات Wesync",
      layout(
        "تأكيد الإشعارات",
        `<p>فريق بحث «${esc(team.name)}» على Wesync يتواصل معكم عبر رابط المتابعة. طلب أحدهم (غالبًا أنتم) أن توصلكم رسالة إيميل عند كل رد جديد من الفريق.</p><p>إذا كان هذا بطلبكم، اضغطوا الزر لتأكيد الاشتراك. وإذا ما طلبتوه، تجاهلوا هذي الرسالة ولن يصلكم شي.</p>`,
        link,
        "أكّد الاشتراك",
      ),
      `أكّدوا الاشتراك بإشعارات Wesync لفريق «${team.name}»:\n${link}\n\nإذا ما طلبتوه تجاهلوا الرسالة.`,
    );
    if (!sent.ok) {
      // ما نخلّي طلبًا عالقًا بلا إيميل
      await admin.from("supervisor_email_subscriptions").delete().eq("team_id", team.id).is("confirmed_at", null);
      return json(sent.reason === "email_not_configured" ? 503 : 502, { error: sent.reason });
    }
    return json(200, { ok: true });
  }

  // ---------- تأكيد / إيقاف من رابط الإيميل ----------
  if (action === "confirm" || action === "unsubscribe") {
    const ct = String(body.confirmToken ?? "");
    if (!UUID.test(ct)) return json(400, { error: "invalid_token" });
    const patch = action === "confirm" ? { confirmed_at: new Date().toISOString(), unsubscribed_at: null } : { unsubscribed_at: new Date().toISOString() };
    const { data, error } = await admin.from("supervisor_email_subscriptions").update(patch).eq("confirm_token", ct).select("team_id").maybeSingle();
    if (error) return json(500, { error: "db_error" });
    if (!data) return json(404, { error: "invalid_token" });
    return json(200, { ok: true });
  }

  // ---------- عضو فريق يرد: إشعار للمشرفة المؤكَّدة ----------
  if (action === "notify") {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: userRes, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userRes?.user) return json(401, { error: "unauthorized" });
    const { data: profile } = await admin.from("profiles").select("team_id").eq("id", userRes.user.id).maybeSingle();
    if (!profile?.team_id) return json(403, { error: "no_team" });

    const { data: sub } = await admin.from("supervisor_email_subscriptions").select("*").eq("team_id", profile.team_id).maybeSingle();
    if (!sub || !sub.confirmed_at || sub.unsubscribed_at) return json(200, { sent: false, reason: "not_subscribed" });
    if (sub.last_notified_at && Date.now() - new Date(sub.last_notified_at).getTime() < NOTIFY_COOLDOWN_MINUTES * 60_000) {
      return json(200, { sent: false, reason: "cooldown" });
    }

    const { data: team } = await admin.from("teams").select("name, share_token").eq("id", profile.team_id).maybeSingle();
    const { data: lastMsg } = await admin
      .from("supervisor_messages")
      .select("body, sender_name")
      .eq("team_id", profile.team_id)
      .eq("sender", "team")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!team || !lastMsg) return json(200, { sent: false, reason: "no_message" });

    const excerpt = lastMsg.body.length > 400 ? `${lastMsg.body.slice(0, 400)}…` : lastMsg.body;
    const link = `${site}/#/supervisor/${team.share_token}`;
    const unsub = `${site}/#/supervisor-email/unsubscribe/${sub.confirm_token}`;
    const sent = await sendEmail(
      sub.email,
      `رد جديد من فريق «${team.name}»`,
      layout(
        `رد جديد من فريق «${team.name}»`,
        `<p style="background:#f6f6f6;border-radius:12px;padding:14px 16px;white-space:pre-wrap">${esc(excerpt)}</p><p style="font-size:13px;color:#555">— ${esc(lastMsg.sender_name || "الفريق")}</p>`,
        link,
        "افتحوا المحادثة وردّوا",
        `وصلتكم هذي الرسالة لأنكم فعّلتم الإشعارات. <a href="${esc(unsub)}">إيقاف الإشعارات</a>`,
      ),
      `رد جديد من فريق «${team.name}»:\n\n${excerpt}\n\nافتحوا المحادثة: ${link}\n\nلإيقاف الإشعارات: ${unsub}`,
    );
    if (!sent.ok) return json(200, { sent: false, reason: sent.reason });
    await admin.from("supervisor_email_subscriptions").update({ last_notified_at: new Date().toISOString() }).eq("team_id", profile.team_id);
    return json(200, { sent: true });
  }

  return json(400, { error: "unknown_action" });
});
