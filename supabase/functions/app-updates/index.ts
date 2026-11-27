// «فيه تحديث جديد»: أي صف جديد بجدول app_updates (sent_at فاضي) ينرسل مرة وحدة:
//   - رسالة من ويسي (kind=event, meta.type=app_update) بمحادثة كل فريق — تطلع بطاقة بالمحادثة (UpdateCard)
//   - إيميل لكل عضو مفعّل تذكيرات الإيميل (profiles.email_reminders ≠ false)
// pg_cron (app-updates-announce) يناديها كل ١٠ دقايق لو فيه صف ما انرسل — فإضافة الصف = الإرسال تلقائي.
// التوثيق بنفس سر الجدولة (x-digest-secret) اللي تستخدمه team-digest. كل إرسال ينسجّل في reminder_log فما يتكرر،
// واللي فشل يتعاد بالدورة الجاية. أسرار: RESEND_API_KEY، EMAIL_FROM (وSITE_URL اختياري).
import { createClient } from "npm:@supabase/supabase-js@2";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const site = () => (Deno.env.get("SITE_URL") ?? "https://wesyncapp.com").replace(/\/$/, "");
const FONT = "Tajawal,'Segoe UI',Tahoma,Arial,sans-serif";
const STOP_HINT = "توقفون الإيميلات من صفحة الفريق ← «التنبيهات» ← «تذكيرات الإيميل».";

/** نفس قالب إيميلات Wesync (Obsidian × Ember) بنسخة مختصرة */
function layout(title: string, bodyHtml: string): string {
  return `<div dir="rtl" lang="ar" style="margin:0;padding:0;background:#080808">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#080808" style="background:#080808"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#120D0A;border:1px solid #2A1C14;border-radius:24px;overflow:hidden">
<tr><td height="4" bgcolor="#FF6A00" style="height:4px;line-height:4px;font-size:0;background:#FF6A00;background-image:linear-gradient(90deg,#FF6A00,#FF8A24,#FFB547)">&nbsp;</td></tr>
<tr><td style="padding:26px 28px 6px;font-family:${FONT};direction:rtl;text-align:right">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="34" height="34" valign="middle"><img src="https://wesyncapp.com/icons/email-mark.png" width="34" height="34" alt="Wesync" style="display:block;width:34px;height:34px;border:0;border-radius:8px"></td>
<td style="padding-right:10px;font-family:${FONT};font-size:17px;font-weight:800;color:#F7EFE6">Wesync</td></tr></table></td></tr>
<tr><td style="padding:14px 28px 4px;font-family:${FONT};direction:rtl;text-align:right"><h1 style="margin:0;font-family:${FONT};font-size:24px;line-height:1.4;font-weight:800;color:#F7EFE6">${esc(title)}</h1></td></tr>
<tr><td style="padding:10px 28px 4px;font-family:${FONT};direction:rtl;text-align:right;font-size:15px;line-height:1.85;color:#E6DBD1">${bodyHtml}</td></tr>
<tr><td style="padding:18px 28px 6px;direction:rtl;text-align:right"><a href="${site()}/#/" style="display:inline-block;background:#FF6A00;background-image:linear-gradient(90deg,#FF6A00,#FF9A3C);color:#1A0802;font-family:${FONT};font-size:15px;font-weight:800;text-decoration:none;padding:13px 26px;border-radius:999px">افتحوا Wesync ←</a></td></tr>
<tr><td style="padding:22px 28px 26px;direction:rtl;text-align:right"><div style="border-top:1px solid #2A1C14;padding-top:14px;font-family:${FONT};font-size:12px;line-height:1.8;color:#8F857C"><p style="margin:0 0 6px">${STOP_HINT}</p><p style="margin:0">Wesync · بحثكم يخلص بوقته، مو بآخر ليلة</p></div></td></tr>
</table></td></tr></table></div>`;
}

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  if (!key || !from) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  if (!r.ok) console.error("resend failed", r.status, (await r.text()).slice(0, 300));
  return r.ok;
}

const claim = async (kind: string, refId: string, key: string) => !(await admin.from("reminder_log").insert({ kind, ref_id: refId, recipient: key })).error;
const release = async (kind: string, refId: string, key: string) => void (await admin.from("reminder_log").delete().eq("kind", kind).eq("ref_id", refId).eq("recipient", key));

async function secretOk(given: string | null): Promise<boolean> {
  if (!given) return false;
  const env = Deno.env.get("DIGEST_SECRET");
  if (env && given === env) return true;
  const { data } = await admin.rpc("verify_digest_secret", { p_secret: given });
  return data === true;
}

async function run() {
  const { data: pending } = await admin.from("app_updates").select("id, title, lines, closing").is("sent_at", null).order("created_at").limit(5);
  const rows = (pending ?? []) as { id: string; title: string; lines: string[]; closing: string | null }[];
  let chats = 0;
  let emails = 0;
  if (!rows.length) return { updates: 0, chats, emails };
  const { data: profiles } = await admin.from("profiles").select("id, email, team_id, email_reminders").not("team_id", "is", null).limit(5000);
  const people = (profiles ?? []) as { id: string; email: string | null; team_id: string; email_reminders: boolean | null }[];
  const teamIds = [...new Set(people.map((p) => p.team_id))];
  const emailOn = !!Deno.env.get("RESEND_API_KEY") && !!Deno.env.get("EMAIL_FROM");

  for (const u of rows) {
    const lines = (u.lines ?? []).filter(Boolean);
    let failed = false;
    const chatBody = [u.title, ...lines.map((l) => `- ${l}`), u.closing ?? ""].filter(Boolean).join("\n");
    for (const teamId of teamIds) {
      if (!(await claim("app-update-chat", u.id, teamId))) continue;
      const { error } = await admin.from("team_messages").insert({ team_id: teamId, author_id: null, kind: "event", body: chatBody, meta: { type: "app_update", update_id: u.id } });
      if (error) {
        console.error("chat insert failed", error.message);
        await release("app-update-chat", u.id, teamId);
        failed = true;
      } else chats++;
    }
    if (emailOn) {
      const body =
        `<ul style="margin:0;padding-right:20px;padding-left:0">${lines.map((l) => `<li style="margin:0 0 6px">${esc(l)}</li>`).join("")}</ul>` +
        (u.closing ? `<p style="margin:14px 0 0;color:#ABA095">${esc(u.closing)}</p>` : "");
      const html = layout(u.title, body);
      for (const m of people) {
        if (!m.email || m.email_reminders === false) continue;
        if (!(await claim("app-update-email", u.id, m.id))) continue;
        if (await sendEmail(m.email, u.title, html, [u.title, ...lines, u.closing ?? ""].join("\n"))) emails++;
        else {
          await release("app-update-email", u.id, m.id);
          failed = true;
        }
      }
    } else failed = true; // الإيميل مو مضبوط: نخلي الصف ينتظر بدل ما يضيع
    if (!failed) await admin.from("app_updates").update({ sent_at: new Date().toISOString() }).eq("id", u.id);
  }
  return { updates: rows.length, chats, emails };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  if (!(await secretOk(req.headers.get("x-digest-secret")))) return json(401, { error: "unauthorized" });
  try {
    return json(200, await run());
  } catch (err) {
    console.error("app-updates error:", err instanceof Error ? err.message : err);
    return json(500, { error: "server_error" });
  }
});
