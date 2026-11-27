// تذكيرات الدفع — تشتغل يوميًا من pg_cron (verify_jwt=false، التوثيق بسر الجدولة x-digest-secret):
//   قبل الانتهاء بأسبوع · يوم 27 (يوم المكافأة) · يوم الانتهاء · بعده بـ 3 أيام · بعده بأسبوع
// لصاحب الحصة اللي ما دفع بس — مو للفريق كله، ومو بالمحادثة (ما نحرج أحد).
// القنوات: إشعار الجوال (Web Push) + إيميل (Resend) لو «تذكيرات الإيميل» مفعّلة عنده.
// كل تذكير ينسجّل في reminder_log (ما يتكرر)، ولو فشل الإرسال نفك التسجيل.
// أسرار: RESEND_API_KEY و EMAIL_FROM (نفس team-digest) · مفاتيح الإشعارات من جدول push_config (يولّدها push-notify).
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { coveredIds, nudgeKind, nudgeMessage, type PayRow } from "./nudge.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-digest-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const site = () => (Deno.env.get("SITE_URL") ?? "https://wesyncapp.com").replace(/\/$/, "");
const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const riyadhDate = (offsetDays = 0) => new Date(Date.now() + 3 * 3600000 + offsetDays * 86400000).toISOString().slice(0, 10);
const dayDiff = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
const arDate = (d: string) => {
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${d}T12:00:00Z`));
  } catch {
    return d;
  }
};

async function cronOk(given: string | null): Promise<boolean> {
  if (!given) return false;
  const { data, error } = await admin.rpc("verify_digest_secret", { p_secret: given });
  if (error) console.error("verify_digest_secret failed", error.message);
  return data === true;
}

// ── إشعار الجوال ──
interface Sub {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}
let vapidReady: boolean | null = null;
async function ensureVapid(): Promise<boolean> {
  if (vapidReady !== null) return vapidReady;
  const { data } = await admin.from("push_config").select("public_key, private_key").eq("id", 1).maybeSingle();
  if (!data) return (vapidReady = false);
  webpush.setVapidDetails(`mailto:${Deno.env.get("PUSH_CONTACT") ?? "support@wesync.app"}`, data.public_key, data.private_key);
  return (vapidReady = true);
}
async function push(profileId: string, title: string, body: string, url: string, tag: string): Promise<number> {
  if (!(await ensureVapid())) return 0;
  const { data } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("profile_id", profileId);
  let ok = 0;
  for (const s of (data ?? []) as Sub[]) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title, body, url, tag }), { TTL: 86400, urgency: "normal" });
      ok++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
      else console.error("push failed", code ?? (err instanceof Error ? err.message : err));
    }
  }
  return ok;
}

// ── الإيميل (نفس قالب Obsidian × Ember حق team-digest، مختصر) ──
const FONT = "Tajawal,'Segoe UI',Tahoma,Arial,sans-serif";
function emailHtml(title: string, body: string, ctaUrl: string, ctaLabel: string): string {
  return `<div dir="rtl" lang="ar" style="margin:0;padding:0;background:#080808">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#080808" style="background:#080808"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;background:#120D0A;border:1px solid #2A1C14;border-radius:24px;overflow:hidden">
<tr><td height="4" bgcolor="#FF6A00" style="height:4px;line-height:4px;font-size:0;background:#FF6A00;background-image:linear-gradient(90deg,#FF6A00,#FF8A24,#FFB547)">&nbsp;</td></tr>
<tr><td style="padding:24px 28px 4px;font-family:${FONT};direction:rtl;text-align:right;font-size:17px;font-weight:800;color:#F7EFE6">Wesync</td></tr>
<tr><td style="padding:10px 28px 4px;font-family:${FONT};direction:rtl;text-align:right"><h1 style="margin:0;font-size:22px;line-height:1.4;font-weight:800;color:#F7EFE6">${esc(title)}</h1></td></tr>
<tr><td style="padding:10px 28px 4px;font-family:${FONT};direction:rtl;text-align:right;font-size:15px;line-height:1.85;color:#E6DBD1">${esc(body)}</td></tr>
<tr><td style="padding:18px 28px 6px;direction:rtl;text-align:right"><a href="${esc(ctaUrl)}" style="display:inline-block;background:#FF6A00;background-image:linear-gradient(90deg,#FF6A00,#FF9A3C);color:#1A0802;font-family:${FONT};font-size:15px;font-weight:800;text-decoration:none;padding:13px 26px;border-radius:999px">${esc(ctaLabel)} ←</a></td></tr>
<tr><td style="padding:22px 28px 26px;direction:rtl;text-align:right"><div style="border-top:1px solid #2A1C14;padding-top:14px;font-family:${FONT};font-size:12px;line-height:1.8;color:#8F857C">
<p style="margin:0 0 6px">ما فيه تجديد تلقائي ولا سحب من بطاقتك — تدفع بس لما تختار. توقف التذكيرات من صفحة الفريق ← «التنبيهات».</p>
<p style="margin:0">Wesync · بحثكم يخلص بوقته، مو بآخر ليلة</p></div></td></tr>
</table></td></tr></table></div>`;
}
async function email(to: string, subject: string, html: string, text: string): Promise<boolean> {
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

// ── التشغيل اليومي ──
interface Team {
  id: string;
  name: string | null;
  subscription_end_date: string;
  on_trial: boolean | null;
}
interface Member {
  id: string;
  name: string | null;
  gender: string | null;
  email: string | null;
  email_reminders: boolean | null;
}

async function teamPayments(teamId: string): Promise<PayRow[]> {
  const since = new Date(Date.now() - 280 * 86400000).toISOString();
  let res = await admin.from("payments").select("profile_id, period, for_team, created_at").eq("team_id", teamId).eq("status", "paid").gte("created_at", since);
  // قبل ملف SQL 2026-11-27 (ما فيه period/for_team): نقرأ القديمة ونعتبرها شهري
  if (res.error) res = (await admin.from("payments").select("profile_id, created_at").eq("team_id", teamId).eq("status", "paid").gte("created_at", since)) as typeof res;
  return (res.data ?? []) as PayRow[];
}

async function runDaily(dryRun = false): Promise<{ sent: number; planned: number; preview?: unknown[] }> {
  const today = riyadhDate();
  const isPayday = today.slice(8, 10) === "27";
  const { data: teams } = await admin
    .from("teams")
    .select("id, name, subscription_end_date, on_trial")
    .not("subscription_end_date", "is", null)
    .gte("subscription_end_date", riyadhDate(-31))
    .lte("subscription_end_date", riyadhDate(21))
    .limit(2000);
  let sent = 0;
  let planned = 0;
  const preview: unknown[] = [];
  for (const team of (teams ?? []) as Team[]) {
    const daysLeft = dayDiff(today, team.subscription_end_date);
    const kind = nudgeKind(daysLeft, isPayday);
    if (!kind) continue;
    const { data: mem } = await admin.from("profiles").select("id, name, gender, email, email_reminders").eq("team_id", team.id);
    const members = (mem ?? []) as Member[];
    if (!members.length) continue;
    const covered = coveredIds(await teamPayments(team.id), members.map((m) => m.id));
    const unpaid = members.filter((m) => !covered.has(m.id));
    if (!unpaid.length) continue;
    const first = (m: Member) => String(m.name ?? "").trim().split(/\s+/)[0] || "هلا";
    const paidNames = members.filter((m) => covered.has(m.id)).map(first);
    for (const m of unpaid) {
      const msg = nudgeMessage({
        kind,
        firstName: first(m),
        female: m.gender === "female",
        teamName: team.name ?? "فريقكم",
        paidNames,
        onTrial: !!team.on_trial,
        endLabel: arDate(team.subscription_end_date),
      });
      planned++;
      if (dryRun) {
        preview.push({ team: team.id, member: m.id, kind, ...msg });
        continue;
      }
      // مرة وحدة لكل شخص ولكل نوع باليوم
      const logKind = `bill-${kind}`;
      const { error: dup } = await admin.from("reminder_log").insert({ kind: logKind, ref_id: m.id, recipient: today });
      if (dup) continue;
      const url = `${site()}/#/pricing`;
      let n = await push(m.id, msg.title, msg.body, url, `bill-${kind}`);
      if (m.email && m.email_reminders !== false) {
        const cta = kind === "post7" ? "خيارات الاشتراك والمنحة" : "ادفع حصتك";
        if (await email(m.email, msg.title, emailHtml(msg.title, msg.body, url, cta), `${msg.body}\n\n${url}`)) n++;
      }
      if (n === 0) await admin.from("reminder_log").delete().eq("kind", logKind).eq("ref_id", m.id).eq("recipient", today);
      else sent++;
    }
  }
  return dryRun ? { sent: 0, planned, preview } : { sent, planned };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });
  if (!(await cronOk(req.headers.get("x-digest-secret")))) return json(401, { error: "unauthorized" });
  const body = (await req.json().catch(() => ({}))) as { action?: string };
  if (body.action === "daily") return json(200, await runDaily());
  if (body.action === "dry-run") return json(200, await runDaily(true));
  return json(400, { error: "unknown action" });
});
