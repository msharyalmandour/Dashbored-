// إيميلات المشرفة من الموقع. verify_jwt=false لأن المشرفة بدون حساب — كل إجراء يوثّق نفسه:
//  subscribe  : برمز رابط المشرفة (share_token) — يرسل إيميل تأكيد (تأكيد مزدوج، ما يُرسل أي شي قبله)
//  invite     : القائد (JWT) يكتب إيميل المشرف/ة — يتفعّل على طول ويوصلها ترحيب فيه وش ينتظرها + رابط إيقاف
//  confirm / unsubscribe : برمز التأكيد اللي بالإيميل نفسه
//  notify     : عضو فريق مسجّل دخول (JWT) — يرسل إشعار «رد جديد» للمشرفة المؤكَّدة فقط، بحد زمني
//  set_digest : برمز رابط المشرفة — تختار «فوري» أو «ملخص أسبوعي بس»
//  weekly     : (من pg_cron بسر الجدولة) ملخص الأحد: وش ينتظرها بأزرار، وش خلّص الفريق، والجاي
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

/* قالب الإيميل الفخم (Obsidian × Ember): خلفية سوداء، كرت داكن، شريط برتقالي فوق، وزر برتقالي.
   جداول + ستايل داخلي عشان يطلع صح في Gmail وOutlook وApple Mail. <!--WS_FOOTER--> مكان سطر الإيقاف. */
const FONT = "Tajawal,'Segoe UI',Tahoma,Arial,sans-serif";
const EMAIL_BOX = "background:#1B1310;border:1px solid #2E2019;border-radius:14px;padding:12px 16px";

function layout(title: string, bodyHtml: string, ctaUrl?: string, ctaLabel?: string, footer?: string) {
  return `<div dir="rtl" lang="ar" style="margin:0;padding:0;background:#080808">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#080808" style="background:#080808">
<tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#120D0A;border:1px solid #2A1C14;border-radius:24px;overflow:hidden">
<tr><td height="4" bgcolor="#FF6A00" style="height:4px;line-height:4px;font-size:0;background:#FF6A00;background-image:linear-gradient(90deg,#FF6A00,#FF8A24,#FFB547)">&nbsp;</td></tr>
<tr><td style="padding:26px 28px 6px;font-family:${FONT};direction:rtl;text-align:right">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="34" height="34" align="center" valign="middle" bgcolor="#FF6A00" style="width:34px;height:34px;border-radius:17px;background:#FF6A00;background-image:radial-gradient(circle at 50% 38%,#FFF0C2,#FFB547 30%,#FF6A00 65%,#C2400A);color:#1A0802;font-size:18px;font-weight:800;line-height:34px">∞</td>
<td style="padding-right:10px;font-family:${FONT};font-size:17px;font-weight:800;color:#F7EFE6;letter-spacing:.3px">Wesync</td>
</tr></table>
</td></tr>
<tr><td style="padding:14px 28px 4px;font-family:${FONT};direction:rtl;text-align:right">
<h1 style="margin:0;font-family:${FONT};font-size:24px;line-height:1.4;font-weight:800;color:#F7EFE6">${esc(title)}</h1>
</td></tr>
<tr><td style="padding:10px 28px 4px;font-family:${FONT};direction:rtl;text-align:right;font-size:15px;line-height:1.85;color:#E6DBD1">
${bodyHtml}
</td></tr>
${
  ctaUrl
    ? `<tr><td style="padding:18px 28px 6px;direction:rtl;text-align:right">
<a href="${esc(ctaUrl)}" style="display:inline-block;background:#FF6A00;background-image:linear-gradient(90deg,#FF6A00,#FF9A3C);color:#1A0802;font-family:${FONT};font-size:15px;font-weight:800;text-decoration:none;padding:13px 26px;border-radius:999px">${esc(ctaLabel ?? "افتحوا الرابط")} ←</a>
</td></tr>`
    : ""
}
<tr><td style="padding:22px 28px 26px;direction:rtl;text-align:right">
<div style="border-top:1px solid #2A1C14;padding-top:14px;font-family:${FONT};font-size:12px;line-height:1.8;color:#8F857C">
${footer ? `<p style="margin:0 0 6px">${footer}</p>` : ""}<!--WS_FOOTER--><p style="margin:0">Wesync · بحثكم يخلص بوقته، مو بآخر ليلة</p>
</div>
</td></tr>
</table>
</td></tr>
</table>
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
    // إيميل عضو بالفريق نفسه (غالبًا طالب يجرّب رابط المشرفة) — الإشعارات لازم تروح للمشرفة مو للفريق
    const { data: members } = await admin.from("profiles").select("email").eq("team_id", team.id);
    if ((members ?? []).some((m: { email: string | null }) => (m.email ?? "").trim().toLowerCase() === email)) return json(400, { error: "member_email" });

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

  // ---------- القائد يدعو المشرف/ة بالإيميل: يتفعّل على طول (بدون خطوة تأكيد) ----------
  // أول إيميل ترحيب فيه وش ينتظرها الحين، وكل إيميل فيه «إيقاف الإيميلات» بضغطة. محمي بحد يومي + القائد بس.
  if (action === "invite") {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: userRes, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userRes?.user) return json(401, { error: "unauthorized" });
    const { data: me } = await admin.from("profiles").select("team_id, role, name").eq("id", userRes.user.id).maybeSingle();
    if (!me?.team_id) return json(403, { error: "no_team" });
    if (me.role !== "leader") return json(403, { error: "not_leader" });
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!EMAIL.test(email) || email.length > 254) return json(400, { error: "invalid_email" });

    const { data: team } = await admin.from("teams").select("id, name, share_token").eq("id", me.team_id).maybeSingle();
    if (!team?.share_token) return json(404, { error: "invalid_token" });
    const { data: members } = await admin.from("profiles").select("email").eq("team_id", team.id);
    if ((members ?? []).some((m: { email: string | null }) => (m.email ?? "").trim().toLowerCase() === email)) return json(400, { error: "member_email" });

    const today = new Date().toISOString().slice(0, 10);
    const { data: existing } = await admin.from("supervisor_email_subscriptions").select("*").eq("team_id", team.id).maybeSingle();
    if (existing) {
      const sameDay = existing.requests_day === today;
      if (sameDay && existing.requests_today >= MAX_REQUESTS_PER_DAY) return json(429, { error: "rate_limited" });
      if (Date.now() - new Date(existing.requested_at).getTime() < MIN_SECONDS_BETWEEN_REQUESTS * 1000) return json(429, { error: "rate_limited" });
    }
    const sameEmail = existing && String(existing.email).toLowerCase() === email;
    const now = new Date().toISOString();
    const row = {
      team_id: team.id,
      email,
      // نفس الإيميل: نحافظ على رابط الإيقاف القديم؛ إيميل جديد: رابط جديد
      confirm_token: sameEmail ? existing.confirm_token : crypto.randomUUID(),
      confirmed_at: now,
      unsubscribed_at: null,
      requested_at: now,
      requests_day: today,
      requests_today: existing && existing.requests_day === today ? existing.requests_today + 1 : 1,
    };
    const { error: upErr } = await admin.from("supervisor_email_subscriptions").upsert(row, { onConflict: "team_id" });
    if (upErr) return json(500, { error: "db_error" });

    // وش ينتظرها الحين (عشان أول إيميل يكون مفيد مو مجرد ترحيب)
    const { data: proj } = await admin.from("research_projects").select("title").eq("team_id", team.id).order("created_at").limit(1).maybeSingle();
    // المحاضر اللي عدّت ٤٨ ساعة تنحسب معتمدة تلقائيًا، فما نعدّها
    const { count: pendingMinutes } = await admin.from("minutes_approvals").select("minutes_id", { count: "exact", head: true }).eq("team_id", team.id).eq("status", "pending").gte("requested_at", new Date(Date.now() - 48 * 3600e3).toISOString());
    const { count: openDecisions } = await admin.from("decision_requests").select("id", { count: "exact", head: true }).eq("team_id", team.id).eq("status", "open");
    const { count: pendingBookings } = await admin.from("meeting_bookings").select("id", { count: "exact", head: true }).eq("team_id", team.id).eq("status", "pending");
    const waiting = [
      pendingMinutes ? `${pendingMinutes} محضر اجتماع بانتظار اعتمادكم` : "",
      openDecisions ? `${openDecisions} سؤال بانتظار قراركم` : "",
      pendingBookings ? `${pendingBookings} اقتراح موعد` : "",
    ].filter(Boolean);

    const link = `${site}/#/supervisor/${team.share_token}`;
    const unsub = `${site}/#/supervisor-email/unsubscribe/${row.confirm_token}`;
    const leader = String(me.name ?? "").trim() || "قائد الفريق";
    const topic = String(proj?.title ?? "").trim();
    const title = `فريق «${team.name}» يتابع بحثه معكم على Wesync`;
    const inner =
      `<p>أضافكم ${esc(leader)} كمشرف/ة للفريق${topic ? ` على بحث <b>${esc(topic)}</b>` : ""}.</p>` +
      `<p>من الحين توصلكم هنا: محاضر الاجتماعات للاعتماد، أسئلة الفريق، واقتراحات المواعيد. وكل شي تردّون عليه بضغطة من رابطكم، بدون حساب ولا كلمة مرور.</p>` +
      (waiting.length ? `<p style="${EMAIL_BOX}"><b>ينتظركم الحين:</b><br>${waiting.map(esc).join("<br>")}</p>` : "") +
      `<p style="font-size:13px;color:#ABA095">تقدرون من صفحتكم تختارون «ملخص الأحد بس» بدل الإيميلات أول بأول.</p>`;
    const sent = await sendEmail(
      email,
      title,
      layout(title, inner, link, "افتحوا صفحة المتابعة", `وصلكم هذا الإيميل لأن قائد الفريق أضافكم كمشرف/ة. ما تبونه؟ <a href="${esc(unsub)}" style="color:#FFC777">إيقاف الإيميلات</a>`),
      `${title}\n\nأضافكم ${leader} كمشرف/ة للفريق. توصلكم المحاضر والأسئلة والمواعيد، وتردّون بضغطة من رابطكم:\n${link}${waiting.length ? `\n\nينتظركم الحين:\n${waiting.join("\n")}` : ""}\n\nإيقاف الإيميلات: ${unsub}`,
    );
    if (!sent.ok) {
      // ما وصلها شي: نرجّع الوضع زي ما كان
      if (existing) await admin.from("supervisor_email_subscriptions").upsert(existing, { onConflict: "team_id" });
      else await admin.from("supervisor_email_subscriptions").delete().eq("team_id", team.id);
      return json(sent.reason === "email_not_configured" ? 503 : 502, { error: sent.reason });
    }
    await admin.from("supervisor_email_subscriptions").update({ last_notified_at: now }).eq("team_id", team.id);
    return json(200, { ok: true, active: true });
  }

  // ---------- عضو الفريق: لمين رايحة إشعارات المشرفة؟ (ينبّه لو الإيميل المسجّل حق عضو بالفريق) ----------
  if (action === "team_status") {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: userRes, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userRes?.user) return json(401, { error: "unauthorized" });
    const { data: profile } = await admin.from("profiles").select("team_id").eq("id", userRes.user.id).maybeSingle();
    if (!profile?.team_id) return json(403, { error: "no_team" });
    const { data: sub } = await admin.from("supervisor_email_subscriptions").select("email, confirmed_at, unsubscribed_at").eq("team_id", profile.team_id).maybeSingle();
    if (!sub) return json(200, { state: "none", emailMasked: "", isTeamMember: false });
    const { data: members } = await admin.from("profiles").select("email").eq("team_id", profile.team_id);
    const isTeamMember = (members ?? []).some((m: { email: string | null }) => (m.email ?? "").trim().toLowerCase() === String(sub.email).toLowerCase());
    const [user, domain] = String(sub.email).split("@");
    const state = sub.unsubscribed_at ? "off" : sub.confirmed_at ? "active" : "pending";
    return json(200, { state, emailMasked: `${user.slice(0, 2)}***@${domain ?? ""}`, isTeamMember });
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
    // اختارت الملخص الأسبوعي بس: الرد يطلع لها بالأحد
    if (sub.digest === "weekly") return json(200, { sent: false, reason: "weekly_digest" });
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
        `<p style="${EMAIL_BOX};white-space:pre-wrap">${esc(excerpt)}</p><p style="font-size:13px;color:#ABA095">— ${esc(lastMsg.sender_name || "الفريق")}</p>`,
        link,
        "افتحوا المحادثة وردّوا",
        `وصلتكم لأنكم مشرف/ة الفريق على Wesync. <a href="${esc(unsub)}" style="color:#FFC777">إيقاف الإشعارات</a>`,
      ),
      `رد جديد من فريق «${team.name}»:\n\n${excerpt}\n\nافتحوا المحادثة: ${link}\n\nلإيقاف الإشعارات: ${unsub}`,
    );
    if (!sent.ok) return json(200, { sent: false, reason: sent.reason });
    await admin.from("supervisor_email_subscriptions").update({ last_notified_at: new Date().toISOString() }).eq("team_id", profile.team_id);
    return json(200, { sent: true });
  }

  // ---------- عضو فريق يطلب شي من المشرفة: محضر للاعتماد / طلب قرار / اقتراح موعد ----------
  if (action === "notify_event") {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: userRes, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userRes?.user) return json(401, { error: "unauthorized" });
    const { data: profile } = await admin.from("profiles").select("team_id").eq("id", userRes.user.id).maybeSingle();
    if (!profile?.team_id) return json(403, { error: "no_team" });
    const kind = String(body.kind ?? "");
    const refId = String(body.refId ?? "");
    if (!["minutes", "decision", "booking"].includes(kind) || !UUID.test(refId)) return json(400, { error: "bad_request" });

    const { data: sub } = await admin.from("supervisor_email_subscriptions").select("*").eq("team_id", profile.team_id).maybeSingle();
    if (!sub || !sub.confirmed_at || sub.unsubscribed_at) return json(200, { sent: false, reason: "not_subscribed" });
    if (sub.digest === "weekly") return json(200, { sent: false, reason: "weekly_digest" });
    // دقيقتين بين إيميلات الطلبات حتى ما نغرق المشرفة (كلها تنعرض لها بصفحتها بأي حال)
    if (sub.last_notified_at && Date.now() - new Date(sub.last_notified_at).getTime() < 2 * 60_000) return json(200, { sent: false, reason: "cooldown" });

    const { data: team } = await admin.from("teams").select("name, share_token").eq("id", profile.team_id).maybeSingle();
    if (!team) return json(200, { sent: false, reason: "no_team" });

    let title = "";
    let inner = "";
    let plain = "";
    if (kind === "minutes") {
      const { data: m } = await admin.from("meeting_minutes").select("meeting_date, discussion, decisions, research_project_id").eq("id", refId).maybeSingle();
      const { data: proj } = m ? await admin.from("research_projects").select("team_id").eq("id", m.research_project_id).maybeSingle() : { data: null };
      if (!m || proj?.team_id !== profile.team_id) return json(404, { error: "not_found" });
      const ex = m.discussion.length > 350 ? `${m.discussion.slice(0, 350)}…` : m.discussion;
      title = `محضر اجتماع بانتظار اعتمادكم — فريق «${team.name}»`;
      inner = `<p>أرسل الفريق محضر اجتماع <b>${esc(String(m.meeting_date))}</b> للاعتماد.</p><p style="${EMAIL_BOX};white-space:pre-wrap">${esc(ex)}</p><p style="font-size:13px;color:#ABA095">تعتمدونه أو تطلبون تعديلًا بضغطة، بدون تسجيل دخول. ولو ما وصل رد خلال 48 ساعة يُحسب معتمدًا.</p>`;
      plain = `أرسل فريق «${team.name}» محضر اجتماع ${m.meeting_date} للاعتماد:\n\n${ex}`;
    } else if (kind === "decision") {
      const { data: d } = await admin.from("decision_requests").select("question, options").eq("id", refId).eq("team_id", profile.team_id).maybeSingle();
      if (!d) return json(404, { error: "not_found" });
      title = `سؤال بانتظار قراركم — فريق «${team.name}»`;
      inner = `<p><b>${esc(d.question)}</b></p><p style="font-size:13px;color:#ABA095">الخيارات: ${d.options.map((o: string) => esc(o)).join(" · ")}</p><p style="font-size:13px;color:#ABA095">تجاوبون بضغطة وحدة من رابطكم.</p>`;
      plain = `سؤال بانتظار قراركم من فريق «${team.name}»:\n${d.question}\nالخيارات: ${d.options.join(" · ")}`;
    } else {
      const { data: b } = await admin.from("meeting_bookings").select("booking_date, booking_time, note, status").eq("id", refId).eq("team_id", profile.team_id).maybeSingle();
      if (!b || b.status !== "pending") return json(200, { sent: false, reason: "not_pending" });
      title = `اقتراح موعد اجتماع — فريق «${team.name}»`;
      inner = `<p>اقترح الفريق اجتماعًا يوم <b>${esc(String(b.booking_date))}</b> الساعة <b>${esc(b.booking_time)}</b>.</p>${b.note ? `<p style="${EMAIL_BOX};white-space:pre-wrap">${esc(b.note)}</p>` : ""}<p style="font-size:13px;color:#ABA095">تؤكدونه أو تعتذرون بضغطة وحدة.</p>`;
      plain = `اقترح فريق «${team.name}» اجتماعًا يوم ${b.booking_date} الساعة ${b.booking_time}.`;
    }

    // يفتح صفحتها على الطلب نفسه، والاعتماد بضغطة وحدة هناك (ما نعتمد من رابط الإيميل مباشرة عشان فاحصات الروابط ما تعتمد بدالها)
    const link = `${site}/#/supervisor/${team.share_token}?open=${kind}:${refId}`;
    const unsub = `${site}/#/supervisor-email/unsubscribe/${sub.confirm_token}`;
    const sent = await sendEmail(
      sub.email,
      title,
      layout(title, inner, link, "افتحوا وردّوا بضغطة", `وصلتكم لأنكم مشرف/ة الفريق على Wesync. <a href="${esc(unsub)}" style="color:#FFC777">إيقاف الإشعارات</a>`),
      `${plain}\n\nافتحوا: ${link}\n\nلإيقاف الإشعارات: ${unsub}`,
    );
    if (!sent.ok) return json(200, { sent: false, reason: sent.reason });
    await admin.from("supervisor_email_subscriptions").update({ last_notified_at: new Date().toISOString() }).eq("team_id", profile.team_id);
    return json(200, { sent: true });
  }

  // ---------- المشرفة تشوف اختيارها الحالي ----------
  if (action === "digest_status") {
    const token = String(body.token ?? "");
    if (!UUID.test(token)) return json(400, { error: "invalid_token" });
    const { data: team } = await admin.from("teams").select("id").eq("share_token", token).maybeSingle();
    if (!team) return json(404, { error: "invalid_token" });
    const { data: sub } = await admin.from("supervisor_email_subscriptions").select("*").eq("team_id", team.id).maybeSingle();
    return json(200, { digest: sub?.digest === "weekly" ? "weekly" : "instant" });
  }

  // ---------- المشرفة تختار: كل شي فوري، أو ملخص أسبوعي بس ----------
  if (action === "set_digest") {
    const token = String(body.token ?? "");
    const mode = String(body.mode ?? "");
    if (!UUID.test(token) || !["instant", "weekly"].includes(mode)) return json(400, { error: "bad_request" });
    const { data: team } = await admin.from("teams").select("id").eq("share_token", token).maybeSingle();
    if (!team) return json(404, { error: "invalid_token" });
    const { error } = await admin.from("supervisor_email_subscriptions").update({ digest: mode }).eq("team_id", team.id);
    if (error) return json(500, { error: "db_error" });
    return json(200, { ok: true });
  }

  // ---------- ملخص الأحد للمشرفات (pg_cron) ----------
  if (action === "weekly") {
    const given = req.headers.get("x-digest-secret");
    const { data: okSecret } = given ? await admin.rpc("verify_digest_secret", { p_secret: given }) : { data: false };
    if (okSecret !== true) return json(401, { error: "unauthorized" });
    const { data: subs } = await admin.from("supervisor_email_subscriptions").select("*").not("confirmed_at", "is", null).is("unsubscribed_at", null).limit(500);
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const today = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
    const nextWeek = new Date(Date.now() + 3 * 3600e3 + 7 * 864e5).toISOString().slice(0, 10);
    let sent = 0;
    for (const sub of subs ?? []) {
      const { error: dup } = await admin.from("reminder_log").insert({ kind: "sup-weekly", ref_id: sub.team_id, recipient: today });
      if (dup) continue;
      const { data: team } = await admin.from("teams").select("name, share_token").eq("id", sub.team_id).maybeSingle();
      if (!team) continue;
      const base = `${site}/#/supervisor/${team.share_token}`;
      const { data: proj } = await admin.from("research_projects").select("id").eq("team_id", sub.team_id).order("created_at").limit(1).maybeSingle();
      const [apprs, decs, books, done, due, papers, msgs] = await Promise.all([
        admin.from("minutes_approvals").select("minutes_id, requested_at").eq("team_id", sub.team_id).eq("status", "pending"),
        admin.from("decision_requests").select("id, question").eq("team_id", sub.team_id).eq("status", "open"),
        admin.from("meeting_bookings").select("id, booking_date, booking_time").eq("team_id", sub.team_id).eq("status", "pending"),
        admin.from("tasks").select("title").eq("team_id", sub.team_id).eq("status", "done").gte("completed_at", weekAgo).limit(50),
        admin.from("tasks").select("title, due_date").eq("team_id", sub.team_id).neq("status", "done").gte("due_date", today).lte("due_date", nextWeek).order("due_date").limit(6),
        proj ? admin.from("evidence_papers").select("title").eq("research_project_id", proj.id).gte("created_at", weekAgo).limit(20) : Promise.resolve({ data: [] }),
        admin.from("supervisor_messages").select("id").eq("team_id", sub.team_id).eq("sender", "team").is("read_at", null),
      ]);
      const waiting: string[] = [];
      for (const a of apprs.data ?? []) waiting.push(`<li style="margin:0 0 8px">محضر اجتماع بانتظار اعتمادكم — <a href="${esc(`${base}?open=minutes:${a.minutes_id}`)}" style="color:#FFC777;font-weight:700">افتحوه واعتمدوه</a></li>`);
      for (const d of decs.data ?? []) waiting.push(`<li style="margin:0 0 8px">${esc(d.question)} — <a href="${esc(`${base}?open=decision:${d.id}`)}" style="color:#FFC777;font-weight:700">جاوبوا بضغطة</a></li>`);
      for (const b of books.data ?? []) waiting.push(`<li style="margin:0 0 8px">اقتراح موعد ${esc(String(b.booking_date))} الساعة ${esc(b.booking_time)} — <a href="${esc(`${base}?open=booking:${b.id}`)}" style="color:#FFC777;font-weight:700">أكّدوه أو اعتذروا</a></li>`);
      if ((msgs.data ?? []).length > 0) waiting.push(`<li style="margin:0 0 8px">${(msgs.data ?? []).length} رسالة من الفريق ما انقرت — <a href="${esc(`${base}?open=thread:0`)}" style="color:#FFC777;font-weight:700">اقروها</a></li>`);
      const doneN = (done.data ?? []).length;
      const papersN = (papers.data ?? []).length;
      // أسبوع بدون شي ينتظرها وبدون شغل: ما نزعجها
      if (waiting.length === 0 && doneN === 0 && papersN === 0) continue;
      const box = (h: string, inner: string) => `<p style="margin:18px 0 6px;font-size:13px;font-weight:800;color:#FFC777">${h}</p><div style="${EMAIL_BOX}">${inner}</div>`;
      const inner = [
        waiting.length ? box("ينتظركم", `<ul style="margin:0;padding:0 18px 0 0">${waiting.join("")}</ul>`) : `<p>ما فيه شي ينتظركم هالأسبوع ✓</p>`,
        box("هالأسبوع", `<p style="margin:0">خلّص الفريق <b>${doneN}</b> مهمة${papersN ? ` وأضاف <b>${papersN}</b> دراسة` : ""}.</p>${doneN ? `<p style="margin:6px 0 0;font-size:13px;color:#ABA095">${(done.data ?? []).slice(0, 5).map((t: { title: string }) => esc(t.title)).join(" · ")}</p>` : ""}`),
        (due.data ?? []).length ? box("الجاي", `<p style="margin:0;font-size:14px">${(due.data ?? []).map((t: { title: string; due_date: string }) => `${esc(t.title)} <span style="color:#ABA095">(${esc(t.due_date)})</span>`).join("<br>")}</p>`) : "",
      ].join("");
      const title = `ملخص الأسبوع — فريق «${team.name}»`;
      const unsub = `${site}/#/supervisor-email/unsubscribe/${sub.confirm_token}`;
      const r = await sendEmail(
        sub.email,
        title,
        layout(title, inner, base, "افتحوا صفحة الفريق", `ملخص كل أحد. <a href="${esc(unsub)}" style="color:#FFC777">إيقاف الإيميلات</a>`),
        `${title}\n\nينتظركم: ${waiting.length}\nخلّص الفريق ${doneN} مهمة.\n\n${base}\n\nإيقاف: ${unsub}`,
      );
      if (r.ok) sent++;
      else await admin.from("reminder_log").delete().eq("kind", "sup-weekly").eq("ref_id", sub.team_id).eq("recipient", today);
    }
    return json(200, { sent });
  }

  return json(400, { error: "unknown_action" });
});
