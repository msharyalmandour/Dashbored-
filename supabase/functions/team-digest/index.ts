// إيميلات دورية للفريق والمشرف/ة — تشتغل من pg_cron (verify_jwt=false، التوثيق بسر الجدولة في الهيدر):
//   weekly : تقرير أسبوعي (المنجز، المتأخر، الجاي، المراحل، قرارات تنتظر) للمشرف/ة المؤكَّد/ة إيميله ولكل عضو مفعّل تذكيرات الإيميل
//   daily  : تذكير لكل عضو بمهامه اللي موعدها خلال يومين أو متأخرة، وأي ملاحظة/رسالة جديدة من المشرف/ة
//   preview: (عضو مسجّل دخول) يرجّع نص التقرير الأسبوعي لفريقه بدون إرسال — للمعاينة من الموقع
// كل إرسال ينسجّل في reminder_log عشان ما يتكرر. العضو اللي مطفي «تذكيرات الإيميل» (profiles.email_reminders = false)
// ما يوصله لا تذكير يومي ولا تقرير أسبوعي — المفتاح ببطاقة «التنبيهات» بصفحة الفريق.
// الروابط بالإيميل لازم تكون #/… لأن الموقع يستخدم HashRouter (/tasks بدون # = 404 على Vercel).
// أسرار لازمة: RESEND_API_KEY، EMAIL_FROM (وSITE_URL اختياري). سر الجدولة: تولّده القاعدة (Vault) — راجع supabase/PENDING_digest_secret_and_cron.sql
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-digest-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });

const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const site = () => (Deno.env.get("SITE_URL") ?? "https://wesyncapp.com").replace(/\/$/, "");
const STOP_HINT = "توقفون التذكيرات من صفحة الفريق ← «التنبيهات» ← «تذكيرات الإيميل».";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

/** تاريخ الرياض (UTC+3) بصيغة YYYY-MM-DD مع إزاحة أيام */
function riyadhDate(offsetDays = 0): string {
  return new Date(Date.now() + 3 * 3600000 + offsetDays * 86400000).toISOString().slice(0, 10);
}
const arDate = (d: string) => {
  try {
    return new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${d}T12:00:00Z`));
  } catch {
    return d;
  }
};

function layout(title: string, bodyHtml: string, ctaUrl?: string, ctaLabel?: string, footer?: string) {
  return `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#111;line-height:1.8">
<p style="font-size:12px;letter-spacing:.2em;color:#888;margin:0 0 12px">WESYNC ∞</p>
<h2 style="margin:0 0 12px;font-size:20px">${esc(title)}</h2>
${bodyHtml}
${ctaUrl ? `<p style="margin:24px 0"><a href="${esc(ctaUrl)}" style="background:#f59e0b;color:#111;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:12px;display:inline-block">${esc(ctaLabel ?? "افتحوا الرابط")}</a></p>` : ""}
${footer ? `<p style="font-size:12px;color:#888;border-top:1px solid #eee;padding-top:12px;margin-top:24px">${footer}</p>` : ""}
</div>`;
}

const section = (title: string, items: string[], empty?: string) =>
  items.length === 0 && !empty
    ? ""
    : `<h3 style="font-size:15px;margin:18px 0 6px">${esc(title)}</h3>${
        items.length === 0 ? `<p style="color:#888;margin:0">${esc(empty!)}</p>` : `<ul style="margin:0;padding-inline-start:20px">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`
      }`;

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  if (!key || !from) {
    console.error("email not configured");
    return false;
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  if (!r.ok) console.error("resend failed", r.status, (await r.text()).slice(0, 300));
  return r.ok;
}

/** يسجّل الإرسال؛ يرجّع false لو كان مسجّل من قبل (ما نرسل مرتين) */
async function claim(kind: string, refId: string, profileKey: string): Promise<boolean> {
  const { error } = await admin.from("reminder_log").insert({ kind, ref_id: refId, recipient: profileKey });
  return !error;
}

/** لو فشل الإرسال نفك التسجيل، عشان التذكير يعاد بالدورة الجاية بدل ما يضيع */
async function release(claimed: { kind: string; refId: string; key: string }[]): Promise<void> {
  for (const c of claimed) await admin.from("reminder_log").delete().eq("kind", c.kind).eq("ref_id", c.refId).eq("recipient", c.key);
}

// ───────────────────────── التقرير الأسبوعي ─────────────────────────

interface Weekly {
  subject: string;
  html: string;
  text: string;
}

async function buildWeekly(teamId: string, audience: "supervisor" | "team"): Promise<Weekly | null> {
  const today = riyadhDate();
  const weekAgo = riyadhDate(-7);
  const nextWeek = riyadhDate(7);
  const [{ data: team }, { data: project }, { data: members }, { data: tasks }, { data: decisions }] = await Promise.all([
    admin.from("teams").select("id, name, share_token").eq("id", teamId).maybeSingle(),
    admin.from("research_projects").select("id, title, target_submission_date").eq("team_id", teamId).maybeSingle(),
    admin.from("profiles").select("id, name").eq("team_id", teamId),
    admin.from("tasks").select("title, status, due_date, assignee_id, completed_at").eq("team_id", teamId).limit(500),
    admin.from("decision_requests").select("question, status").eq("team_id", teamId).eq("status", "open").limit(10),
  ]);
  if (!team) return null;
  const pid = project?.id as string | undefined;
  const [{ data: stages }, { data: feedback }, { data: events }] = await Promise.all([
    pid ? admin.from("research_stages").select("title_ar, status, progress, stage_order").eq("research_project_id", pid).order("stage_order") : Promise.resolve({ data: [] }),
    pid ? admin.from("supervisor_feedback").select("status, resolved_at").eq("research_project_id", pid) : Promise.resolve({ data: [] }),
    admin.from("calendar_events").select("title, event_date, event_time, event_type").eq("team_id", teamId).gte("event_date", today).lte("event_date", nextWeek).order("event_date").limit(10),
  ]);

  const first = new Map<string, string>((members ?? []).map((m: { id: string; name: string }) => [m.id, String(m.name ?? "").split(" ")[0]]));
  type T = { title: string; status: string; due_date: string | null; assignee_id: string; completed_at: string | null };
  const all = (tasks ?? []) as T[];
  const doneWeek = all.filter((t) => t.status === "done" && (t.completed_at ?? "").slice(0, 10) >= weekAgo);
  const overdue = all.filter((t) => t.status !== "done" && (t.status === "overdue" || (!!t.due_date && t.due_date < today)));
  const upcoming = all.filter((t) => t.status !== "done" && !!t.due_date && t.due_date >= today && t.due_date <= nextWeek);
  const fb = (feedback ?? []) as { status: string; resolved_at: string | null }[];
  const fbOpen = fb.filter((f) => f.status === "open").length;
  const fbResolvedWeek = fb.filter((f) => (f.resolved_at ?? "").slice(0, 10) >= weekAgo).length;
  const current = ((stages ?? []) as { title_ar: string; status: string; progress: number }[]).find((s) => s.status !== "done");
  const totalDone = all.filter((t) => t.status === "done").length;

  const who = (t: T) => esc(first.get(t.assignee_id) ?? "؟");
  const line = (t: T) => `${esc(t.title)} — ${who(t)}${t.due_date ? ` <span style="color:#888">(${esc(arDate(t.due_date))})</span>` : ""}`;

  const intro = `<p style="margin:0 0 8px">${audience === "supervisor" ? "هذا ملخص أسبوع فريق" : "ملخص أسبوعكم في"} <b>${esc(team.name ?? "الفريق")}</b>${project?.title ? ` — بحث «${esc(project.title)}»` : ""}.</p>
<p style="margin:0;background:#f6f6f6;border-radius:12px;padding:10px 14px">
✅ أنجزوا <b>${doneWeek.length}</b> مهمة هالأسبوع (المجموع ${totalDone} من ${all.length})
${overdue.length ? `<br>⚠️ <b>${overdue.length}</b> مهمة متأخرة` : "<br>👌 ما فيه مهام متأخرة"}
${current ? `<br>🎯 المرحلة الحالية: ${esc(current.title_ar)} (${Math.round(current.progress ?? 0)}٪)` : ""}
<br>📝 ملاحظات المشرف/ة: ${fbResolvedWeek} انحلّت هالأسبوع، ${fbOpen} مفتوحة
${project?.target_submission_date ? `<br>🏁 موعد التسليم: ${esc(arDate(project.target_submission_date))}` : ""}
</p>`;

  const html = layout(
    audience === "supervisor" ? `تقرير الأسبوع — ${team.name ?? "الفريق"}` : "تقرير أسبوعكم",
    intro +
      section("المنجز هالأسبوع", doneWeek.slice(0, 10).map(line), "ما انحسب إنجاز هالأسبوع.") +
      section("المتأخر", overdue.slice(0, 10).map(line)) +
      section("الأسبوع الجاي", [
        ...upcoming.slice(0, 8).map(line),
        ...((events ?? []) as { title: string; event_date: string; event_time: string; event_type: string }[]).map(
          (e) => `📅 ${esc(e.title)} <span style="color:#888">(${esc(arDate(e.event_date))}${e.event_type !== "deadline" ? ` ${esc(e.event_time)}` : ""})</span>`,
        ),
      ]) +
      section(audience === "supervisor" ? "قرارات تنتظر رأيك" : "قرارات تنتظر المشرف/ة", ((decisions ?? []) as { question: string }[]).map((d) => esc(d.question))),
    audience === "supervisor" ? `${site()}/#/supervisor/${team.share_token}` : `${site()}/#/`,
    audience === "supervisor" ? "افتح لوحة الفريق" : "افتحوا Wesync",
  );
  const text = `${team.name ?? "الفريق"}: أنجزوا ${doneWeek.length} مهمة هالأسبوع، ${overdue.length} متأخرة، ${upcoming.length} موعدها الأسبوع الجاي.`;
  return { subject: audience === "supervisor" ? `تقرير الأسبوع: ${team.name ?? "فريقكم"}` : "تقرير أسبوعكم في Wesync", html, text };
}

const emailReady = () => !!Deno.env.get("RESEND_API_KEY") && !!Deno.env.get("EMAIL_FROM");

async function runWeekly(): Promise<{ sent: number; skipped?: string }> {
  // بدون إعداد الإيميل ما نسجّل شي بالسجل — عشان لما ينضبط يوصل التذكير بدل ما يضيع
  if (!emailReady()) return { sent: 0, skipped: "email_not_configured" };
  const week = riyadhDate().slice(0, 10);
  let sent = 0;
  const { data: teams } = await admin.from("teams").select("id").limit(1000);
  for (const { id: teamId } of (teams ?? []) as { id: string }[]) {
    const [{ data: sub }, { data: members }] = await Promise.all([
      admin.from("supervisor_email_subscriptions").select("email, confirm_token, confirmed_at, unsubscribed_at").eq("team_id", teamId).maybeSingle(),
      admin.from("profiles").select("id, email, email_reminders").eq("team_id", teamId),
    ]);
    const supOk = sub?.email && sub.confirmed_at && !sub.unsubscribed_at;
    // كل عضو مفعّل التذكيرات (الافتراضي)؛ المطفي ما نرسل له شي
    const recipients = ((members ?? []) as { id: string; email: string | null; email_reminders: boolean | null }[]).filter((m) => !!m.email && m.email_reminders !== false);
    if (!supOk && !recipients.length) continue;
    // فريق بدون أي مهمة = ما بدأ يستخدم المنصة، ما نزعج أحد
    const { count } = await admin.from("tasks").select("id", { count: "exact", head: true }).eq("team_id", teamId);
    if (!count) continue;

    if (supOk && (await claim("weekly-supervisor", teamId, `${sub!.email}|${week}`))) {
      const w = await buildWeekly(teamId, "supervisor");
      let ok = false;
      if (w) {
        const footer = `وصلك هذا لأنك فعّلت إشعارات Wesync لهذا الفريق. <a href="${site()}/#/supervisor-email/unsubscribe/${sub!.confirm_token}" style="color:#888">إيقاف الإيميلات</a>`;
        ok = await sendEmail(sub!.email, w.subject, w.html.replace("</div>", `<p style="font-size:12px;color:#888;border-top:1px solid #eee;padding-top:12px;margin-top:24px">${footer}</p></div>`), w.text);
      }
      if (ok) sent++;
      else await release([{ kind: "weekly-supervisor", refId: teamId, key: `${sub!.email}|${week}` }]);
    }
    // نفس نوع السجل القديم (weekly-leader) عشان القائد ما يوصله التقرير مرتين بأسبوع التحويل
    const teamWeekly = recipients.length ? await buildWeekly(teamId, "team") : null;
    for (const m of recipients) {
      if (!teamWeekly || !(await claim("weekly-leader", teamId, `${m.id}|${week}`))) continue;
      const html = teamWeekly.html.replace("</div>", `<p style="font-size:12px;color:#888;border-top:1px solid #eee;padding-top:12px;margin-top:24px">${STOP_HINT}</p></div>`);
      if (await sendEmail(m.email!, teamWeekly.subject, html, teamWeekly.text)) sent++;
      else await release([{ kind: "weekly-leader", refId: teamId, key: `${m.id}|${week}` }]);
    }
  }
  return { sent };
}

// ───────────────────────── التذكير اليومي لكل عضو ─────────────────────────

async function runDaily(): Promise<{ sent: number; skipped?: string }> {
  if (!emailReady()) return { sent: 0, skipped: "email_not_configured" };
  const today = riyadhDate();
  const soon = riyadhDate(2);
  const since = new Date(Date.now() - 26 * 3600000).toISOString();
  let sent = 0;

  const { data: profiles } = await admin.from("profiles").select("id, name, email, team_id, email_reminders").not("team_id", "is", null).limit(5000);
  const byTeam = new Map<string, { id: string; name: string; email: string | null; email_reminders: boolean | null }[]>();
  for (const p of (profiles ?? []) as { id: string; name: string; email: string | null; team_id: string; email_reminders: boolean | null }[]) {
    if (!byTeam.has(p.team_id)) byTeam.set(p.team_id, []);
    byTeam.get(p.team_id)!.push(p);
  }

  for (const [teamId, members] of byTeam) {
    const { data: project } = await admin.from("research_projects").select("id").eq("team_id", teamId).maybeSingle();
    const [{ data: tasks }, { data: newFeedback }, { data: newMessages }] = await Promise.all([
      admin.from("tasks").select("id, title, status, due_date, assignee_id").eq("team_id", teamId).neq("status", "done").not("due_date", "is", null).lte("due_date", soon).limit(500),
      project
        ? admin.from("supervisor_feedback").select("id, comment, created_by").eq("research_project_id", project.id).gte("created_at", since).limit(20)
        : Promise.resolve({ data: [] }),
      admin.from("supervisor_messages").select("id, body, sender").eq("team_id", teamId).eq("sender", "supervisor").gte("created_at", since).limit(10),
    ]);
    // ملاحظات المشرف/ة: اللي ما سجّلها عضو من الفريق (created_by فاضي) — أو المسجّلة من الفريق نفسه ما نذكّر فيها
    const memberIds = new Set(members.map((m) => m.id));
    const fb = ((newFeedback ?? []) as { id: string; comment: string; created_by: string | null }[]).filter((f) => !f.created_by || !memberIds.has(f.created_by));
    const msgs = (newMessages ?? []) as { id: string; body: string }[];

    for (const m of members) {
      if (!m.email || m.email_reminders === false) continue;
      const mine = ((tasks ?? []) as { id: string; title: string; status: string; due_date: string; assignee_id: string }[]).filter((t) => t.assignee_id === m.id);
      // كل مهمة تنذكر مرة وحدة لكل حالة (قربت / متأخرة) — ما نزعجهم كل يوم بنفس الشي
      const dueSoon: string[] = [];
      const late: string[] = [];
      const claimed: { kind: string; refId: string; key: string }[] = [];
      const take = async (kind: string, refId: string) => {
        if (!(await claim(kind, refId, m.id))) return false;
        claimed.push({ kind, refId, key: m.id });
        return true;
      };
      for (const t of mine) {
        const isLate = t.due_date < today;
        if (await take(isLate ? "task-late" : "task-soon", t.id)) (isLate ? late : dueSoon).push(`${esc(t.title)} <span style="color:#888">(${esc(arDate(t.due_date))})</span>`);
      }
      const fbNew: string[] = [];
      for (const f of fb) if (await take("feedback", f.id)) fbNew.push(esc(f.comment.slice(0, 200)));
      const msgNew: string[] = [];
      for (const x of msgs) if (await take("sup-message", x.id)) msgNew.push(esc(x.body.slice(0, 200)));
      if (!dueSoon.length && !late.length && !fbNew.length && !msgNew.length) continue;

      const firstName = String(m.name ?? "").split(" ")[0];
      const html = layout(
        `صباح الخير ${firstName} ☀️`,
        section("مهامك اللي موعدها قرّب", dueSoon) +
          section("مهام متأخرة — يمديك تلحقها", late) +
          section("ملاحظات جديدة من المشرف/ة", fbNew) +
          section("رسائل جديدة من المشرف/ة", msgNew),
        `${site()}/#/${dueSoon.length || late.length ? "tasks" : msgNew.length ? "" : "feedback"}`,
        dueSoon.length || late.length ? "افتح مهامي" : "افتح Wesync",
        STOP_HINT,
      );
      const subject = late.length
        ? `عندك ${late.length} مهمة متأخرة`
        : dueSoon.length
          ? `تذكير: ${dueSoon.length === 1 ? "مهمة موعدها قرّب" : `${dueSoon.length} مهام موعدها قرّب`}`
          : "جديد من المشرف/ة";
      const text = [dueSoon.length && `قرّب موعد ${dueSoon.length} مهمة`, late.length && `${late.length} متأخرة`, fbNew.length && `${fbNew.length} ملاحظة جديدة`, msgNew.length && `${msgNew.length} رسالة جديدة`]
        .filter(Boolean)
        .join("، ");
      if (await sendEmail(m.email, subject, html, text)) sent++;
      else await release(claimed);
    }
  }
  return { sent };
}

/** السر يتحقق منه إما متغير DIGEST_SECRET (لو انضاف) أو دالة قاعدة البيانات verify_digest_secret اللي تقارن بسر Vault
    اللي ولّدته القاعدة نفسها — فما نحتاج أحد يخترع مفتاح أو يدخله يدويًا. */
async function secretOk(given: string | null): Promise<boolean> {
  if (!given) return false;
  const env = Deno.env.get("DIGEST_SECRET");
  if (env && given === env) return true;
  const { data, error } = await admin.rpc("verify_digest_secret", { p_secret: given });
  if (error) console.error("verify_digest_secret failed", error.message);
  return data === true;
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
    if (action === "preview") {
      const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      const { data: u } = await admin.auth.getUser(jwt);
      if (!u?.user) return json(401, { error: "unauthorized" });
      const { data: p } = await admin.from("profiles").select("team_id").eq("id", u.user.id).maybeSingle();
      if (!p?.team_id) return json(404, { error: "no_team" });
      const w = await buildWeekly(p.team_id, "supervisor");
      return w ? json(200, { subject: w.subject, html: w.html }) : json(404, { error: "no_team" });
    }

    if (!(await secretOk(req.headers.get("x-digest-secret")))) return json(401, { error: "unauthorized" });
    if (action === "weekly") return json(200, await runWeekly());
    if (action === "daily") return json(200, await runDaily());
    return json(400, { error: "unknown_action" });
  } catch (err) {
    console.error("team-digest error:", err instanceof Error ? err.message : err);
    return json(500, { error: "server_error" });
  }
});
