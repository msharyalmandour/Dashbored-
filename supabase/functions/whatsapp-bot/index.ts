// Supabase Edge Function — ويسي على واتساب (v1)
//
// GET  (Meta): تحقق الـ webhook (hub.challenge)
// POST (Meta): رسائل الطلاب — «ربط CODE» · «تم [رقم]» · «أجّل [رقم] [أيام]» · «مهامي» · «وقف» / «ابدأ»
// POST (cron, x-digest-secret, {"action":"morning"}): كل ساعة — «مهامكم اليوم» للي ساعتهم حانت (بتوقيت الرياض)
//
// أسرار لازمة (Supabase → Edge Functions → Secrets) — صاحب الحساب يضيفها بنفسه:
//   WHATSAPP_TOKEN          توكن دائم من Meta (System user) بصلاحية whatsapp_business_messaging
//   WHATSAPP_PHONE_ID       Phone number ID من WhatsApp Manager
//   WHATSAPP_APP_SECRET     App secret (App settings → Basic) — نتحقق فيه إن الرسالة جاية من Meta
//   WHATSAPP_VERIFY_TOKEN   أي كلمة تختارونها — نفسها تنكتب بإعداد الـ webhook عند Meta
// اختيارية: WHATSAPP_API_VERSION (افتراضي v27.0) · WHATSAPP_MORNING_TEMPLATE (افتراضي wesy_morning) · SITE_URL
// النشر: verify_jwt = false (Meta ما يرسل JWT — التحقق بالتوقيع X-Hub-Signature-256 والسر)

import { createClient } from "npm:@supabase/supabase-js@2";
import { addDays, normalizePhone, parseCommand, riyadhDate, riyadhHour, templateSafe, type Command } from "./parse.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const GRAPH = () => `https://graph.facebook.com/${env("WHATSAPP_API_VERSION") || "v27.0"}/${env("WHATSAPP_PHONE_ID")}/messages`;
const SITE = () => (env("SITE_URL") || "https://wesyncapp.com").replace(/\/$/, "");

interface Link {
  profile_id: string;
  team_id: string | null;
  phone: string | null;
  paused: boolean;
  morning_hour: number;
  last_list: string[];
  last_inbound_at: string | null;
  last_morning_on: string | null;
}
interface Task {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
  team_id: string;
  assignee_id: string | null;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

// ── التحقق ──
async function signatureOk(raw: string, header: string | null): Promise<boolean> {
  const secret = env("WHATSAPP_APP_SECRET");
  if (!secret || !header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)));
  const hex = [...sig].map((b) => b.toString(16).padStart(2, "0")).join("");
  const given = header.slice(7);
  if (given.length !== hex.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

async function cronOk(given: string | null): Promise<boolean> {
  if (!given) return false;
  const { data, error } = await admin.rpc("verify_digest_secret", { p_secret: given });
  if (error) console.error("verify_digest_secret failed", error.message);
  return data === true;
}

// ── الإرسال ──
async function send(to: string, payload: Record<string, unknown>, log: { profile_id?: string; team_id?: string | null; kind: string; body: string }) {
  if (!env("WHATSAPP_TOKEN") || !env("WHATSAPP_PHONE_ID")) {
    console.error("whatsapp not configured");
    return false;
  }
  const res = await fetch(GRAPH(), {
    method: "POST",
    headers: { Authorization: `Bearer ${env("WHATSAPP_TOKEN")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, ...payload }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("whatsapp send failed", res.status, JSON.stringify(out).slice(0, 300));
    return false;
  }
  const waId = (out as { messages?: { id?: string }[] }).messages?.[0]?.id ?? null;
  await admin.from("whatsapp_messages").insert({ profile_id: log.profile_id ?? null, team_id: log.team_id ?? null, direction: "out", wa_id: waId, kind: log.kind, body: log.body.slice(0, 1000) });
  return true;
}

const text = (to: string, body: string, log: Omit<Parameters<typeof send>[2], "body">) =>
  send(to, { type: "text", text: { body, preview_url: false } }, { ...log, body });

/** رسالة بأزرار (حد Meta: ٣ أزرار، العنوان ≤ ٢٠ حرف، المعرّف ≤ ٢٥٦) */
const buttons = (to: string, body: string, btns: { id: string; title: string }[], log: Omit<Parameters<typeof send>[2], "body">) =>
  send(
    to,
    {
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body.slice(0, 1024) },
        action: { buttons: btns.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id, title: b.title.slice(0, 20) } })) },
      },
    },
    { ...log, body },
  );

// ── المهام ──
function dueLabel(due: string | null, today: string): string {
  if (!due) return "";
  if (due < today) return " — متأخرة";
  if (due === today) return " — اليوم";
  if (due === addDays(today, 1)) return " — بكرة";
  return ` — ${due.slice(8, 10)}/${due.slice(5, 7)}`;
}

async function openTasks(profileId: string, limit = 5): Promise<Task[]> {
  const { data } = await admin
    .from("tasks")
    .select("id, title, due_date, status, team_id, assignee_id")
    .eq("assignee_id", profileId)
    .neq("status", "done")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(limit);
  return (data ?? []) as Task[];
}

async function canWrite(teamId: string | null): Promise<boolean> {
  if (!teamId) return false;
  const { data } = await admin.rpc("team_can_write", { tid: teamId });
  return data === true;
}

function listText(tasks: Task[], today: string): string {
  return tasks.map((t, i) => `${i + 1}) ${t.title}${dueLabel(t.due_date, today)}`).join("\n");
}

/** المهمة المقصودة: معرّف زر، أو رقم من آخر قائمة، أو الوحيدة إذا ما فيه غيرها */
async function pickTask(link: Link, cmd: { n?: number; taskId?: string }): Promise<Task | "ask" | null> {
  let id = cmd.taskId;
  if (!id && cmd.n) id = link.last_list[cmd.n - 1];
  if (!id) {
    const open = await openTasks(link.profile_id, 3);
    if (open.length === 1) return open[0];
    return open.length ? "ask" : null;
  }
  const { data } = await admin.from("tasks").select("id, title, due_date, status, team_id, assignee_id").eq("id", id).maybeSingle();
  const t = data as Task | null;
  // بس مهامه هو (نفس قاعدة الموقع: المسؤول عن المهمة يقفلها)
  if (!t || t.assignee_id !== link.profile_id || t.status === "done") return null;
  return t;
}

async function showList(link: Link, to: string, intro = "") {
  const today = riyadhDate();
  const tasks = await openTasks(link.profile_id);
  const log = { profile_id: link.profile_id, team_id: link.team_id, kind: "list" };
  await admin.from("whatsapp_links").update({ last_list: tasks.map((t) => t.id) }).eq("profile_id", link.profile_id);
  if (!tasks.length) return text(to, `${intro}ما عليك مهام مفتوحة الحين 🎉\nأي مهمة جديدة تنضاف لك، تجيك هنا الصبح.`, log);
  const body = `${intro}مهامك المفتوحة:\n${listText(tasks, today)}\n\nردّ «تم 1» إذا خلصت وحدة، أو «أجّل 2» نأجلها يوم.`;
  return buttons(to, body, [
    { id: `done:${tasks[0].id}`, title: "تم الأولى ✓" },
    { id: `snooze:${tasks[0].id}`, title: "أجّل الأولى يوم" },
  ], log);
}

const HELP =
  "أنا ويسي 👋 أقدر أساعدك من هنا:\n• «مهامي» — مهامك المفتوحة\n• «تم 1» — قفل المهمة رقم 1\n• «أجّل 2» أو «أجّل 2 يومين» — تأجيل\n• «وقف» — أوقف رسالة الصباح · «ابدأ» — أرجّعها\n\nالباقي كله بالموقع: ";

// ── الرسائل الواردة ──
async function handle(from: string, raw: string, waId: string) {
  const phone = normalizePhone(from);
  const cmd: Command = parseCommand(raw);

  // منع التكرار: Meta يعيد الإرسال لو تأخرنا
  const { error: dup } = await admin.from("whatsapp_messages").insert({ direction: "in", wa_id: waId, kind: cmd.kind, body: raw.slice(0, 1000) });
  if (dup) return; // wa_id مكرر

  if (cmd.kind === "link") {
    const { data } = await admin
      .from("whatsapp_links")
      .select("profile_id, team_id, code_expires_at")
      .eq("link_code", cmd.code)
      .maybeSingle();
    if (!data || !data.code_expires_at || new Date(data.code_expires_at) < new Date()) {
      await text(phone, "الكود هذا انتهى أو غلط 🤔 افتح Wesync ← الفريق ← «ويسي على واتساب» واضغط «اربطوا» مرة ثانية.", { kind: "link-bad" });
      return;
    }
    // الرقم مربوط بحساب ثاني؟ نفكّه منه (آخر واحد ربطه هو الصحيح)
    await admin.from("whatsapp_links").update({ phone: null, linked_at: null }).eq("phone", phone).neq("profile_id", data.profile_id);
    await admin
      .from("whatsapp_links")
      .update({ phone, linked_at: new Date().toISOString(), link_code: null, code_expires_at: null, paused: false, last_inbound_at: new Date().toISOString() })
      .eq("profile_id", data.profile_id);
    await admin.from("whatsapp_messages").update({ profile_id: data.profile_id, team_id: data.team_id }).eq("wa_id", waId);
    const link = (await admin.from("whatsapp_links").select("*").eq("profile_id", data.profile_id).single()).data as Link;
    await showList(link, phone, "تم الربط ✓ من الحين أرسل لك مهامك كل صباح.\n\n");
    return;
  }

  const { data: found } = await admin.from("whatsapp_links").select("*").eq("phone", phone).maybeSingle();
  const link = found as Link | null;
  if (!link) {
    await text(phone, `هلا 👋 رقمك مو مربوط بحساب Wesync.\nافتح الموقع ← الفريق ← «ويسي على واتساب» واضغط «اربطوا».\n${SITE()}/#/team`, { kind: "unknown" });
    return;
  }
  await admin.from("whatsapp_links").update({ last_inbound_at: new Date().toISOString() }).eq("profile_id", link.profile_id);
  await admin.from("whatsapp_messages").update({ profile_id: link.profile_id, team_id: link.team_id }).eq("wa_id", waId);
  const log = { profile_id: link.profile_id, team_id: link.team_id };

  switch (cmd.kind) {
    case "list":
      await showList(link, phone);
      return;
    case "pause":
      await admin.from("whatsapp_links").update({ paused: true }).eq("profile_id", link.profile_id);
      await text(phone, "وقّفت رسالة الصباح ✓ إذا بغيتها ترجع اكتب «ابدأ». وتقدر تكتب «مهامي» أي وقت.", { ...log, kind: "pause" });
      return;
    case "resume":
      await admin.from("whatsapp_links").update({ paused: false }).eq("profile_id", link.profile_id);
      await text(phone, `رجّعتها ✓ أرسل لك مهامك كل يوم الساعة ${link.morning_hour} الصبح.`, { ...log, kind: "resume" });
      return;
    case "help":
      await text(phone, HELP + SITE(), { ...log, kind: "help" });
      return;
    case "done":
    case "snooze": {
      const t = await pickTask(link, cmd);
      if (t === null) {
        await text(phone, "ما لقيت هالمهمة بين مهامك المفتوحة. اكتب «مهامي» وأعطيك القائمة بأرقامها.", { ...log, kind: "not-found" });
        return;
      }
      if (t === "ask") {
        await showList(link, phone, "أي وحدة تقصد؟ ردّ بالرقم (مثلًا «تم 2»).\n\n");
        return;
      }
      if (!(await canWrite(t.team_id))) {
        await text(phone, `اشتراك فريقكم منتهي، فالفريق الحين قراءة بس. جدّدوه من هنا وكل شي يرجع: ${SITE()}/#/pricing`, { ...log, kind: "read-only" });
        return;
      }
      const today = riyadhDate();
      if (cmd.kind === "done") {
        await admin.from("tasks").update({ status: "done", completed_at: new Date().toISOString() }).eq("id", t.id).eq("assignee_id", link.profile_id);
        const left = await openTasks(link.profile_id, 1);
        await text(phone, `✓ قفلتها: ${t.title}\n${left.length ? `الجاية: ${left[0].title}${dueLabel(left[0].due_date, today)}` : "خلّصت كل مهامك 👏"}`, { ...log, kind: "done" });
      } else {
        const base = t.due_date && t.due_date > today ? t.due_date : today;
        const due = addDays(base, cmd.days);
        await admin.from("tasks").update({ due_date: due }).eq("id", t.id).eq("assignee_id", link.profile_id);
        await text(phone, `أجّلتها ✓ ${t.title} — صارت ${due.slice(8, 10)}/${due.slice(5, 7)}.\nإذا كان التأجيل يأثر على تسليم الفريق، قول لقائد الفريق.`, { ...log, kind: "snooze" });
      }
      return;
    }
  }
}

// ── رسالة الصباح ──
async function runMorning(): Promise<{ sent: number; skipped: number }> {
  const hour = riyadhHour();
  const today = riyadhDate();
  const { data } = await admin
    .from("whatsapp_links")
    .select("*")
    .not("phone", "is", null)
    .eq("paused", false)
    .eq("morning_hour", hour)
    .or(`last_morning_on.is.null,last_morning_on.lt.${today}`);
  let sent = 0;
  let skipped = 0;
  for (const link of (data ?? []) as Link[]) {
    const tasks = await openTasks(link.profile_id, 3);
    // ما نزعج: لا مهام = لا رسالة · فريق اشتراكه منتهي = لا رسالة
    if (!tasks.length || !(await canWrite(link.team_id))) {
      skipped++;
      continue;
    }
    const { data: prof } = await admin.from("profiles").select("name").eq("id", link.profile_id).maybeSingle();
    const first = (prof?.name ?? "").split(" ")[0] || "يا بطل";
    const log = { profile_id: link.profile_id, team_id: link.team_id, kind: "morning" };
    const open24h = link.last_inbound_at && Date.now() - new Date(link.last_inbound_at).getTime() < 23 * 3600_000;
    let ok: boolean;
    if (open24h) {
      // داخل نافذة الـ ٢٤ ساعة: رسالة عادية بأزرار (مجانية)
      ok = await buttons(link.phone!, `صباح الخير ${first} ☀️\nمهامك اليوم:\n${listText(tasks, today)}`, [
        { id: `done:${tasks[0].id}`, title: "تم الأولى ✓" },
        { id: `snooze:${tasks[0].id}`, title: "أجّل الأولى يوم" },
        { id: "list", title: "كل مهامي" },
      ], log);
    } else {
      // برا النافذة: لازم قالب معتمد من Meta (فئة Utility)
      ok = await send(
        link.phone!,
        {
          type: "template",
          template: {
            name: env("WHATSAPP_MORNING_TEMPLATE") || "wesy_morning",
            language: { code: "ar" },
            components: [{ type: "body", parameters: [{ type: "text", text: templateSafe(first, 40) }, { type: "text", text: templateSafe(tasks.map((t, i) => `${i + 1}) ${t.title}${dueLabel(t.due_date, today)}`).join(" · ")) }] }],
          },
        },
        { ...log, body: `[template] ${tasks.map((t) => t.title).join(" · ")}` },
      );
    }
    if (ok) {
      sent++;
      await admin.from("whatsapp_links").update({ last_morning_on: today, last_list: tasks.map((t) => t.id) }).eq("profile_id", link.profile_id);
    } else skipped++;
  }
  return { sent, skipped };
}

// ── المدخل ──
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const ok = url.searchParams.get("hub.mode") === "subscribe" && env("WHATSAPP_VERIFY_TOKEN") && url.searchParams.get("hub.verify_token") === env("WHATSAPP_VERIFY_TOKEN");
    return ok ? new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 }) : new Response("forbidden", { status: 403 });
  }
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  // الجدولة
  const cronSecret = req.headers.get("x-digest-secret");
  if (cronSecret) {
    if (!(await cronOk(cronSecret))) return json(401, { error: "unauthorized" });
    const body = await req.json().catch(() => ({}));
    if ((body as { action?: string }).action === "morning") return json(200, await runMorning());
    return json(400, { error: "unknown action" });
  }

  // Meta
  const raw = await req.text();
  if (!(await signatureOk(raw, req.headers.get("x-hub-signature-256")))) return new Response("bad signature", { status: 401 });
  let payload: { entry?: { changes?: { value?: { messages?: Record<string, unknown>[] } }[] }[] };
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const jobs: Promise<void>[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const m of change.value?.messages ?? []) {
        const from = String(m.from ?? "");
        const id = String(m.id ?? "");
        let body = "";
        if (m.type === "text") body = String((m.text as { body?: string })?.body ?? "");
        else if (m.type === "interactive") {
          const i = m.interactive as { button_reply?: { id?: string }; list_reply?: { id?: string } };
          body = String(i?.button_reply?.id ?? i?.list_reply?.id ?? "");
        } else if (m.type === "button") body = String((m.button as { payload?: string; text?: string })?.text ?? "");
        if (!from || !id) continue;
        jobs.push(handle(from, body || "help", id).catch((e) => console.error("handle failed", e instanceof Error ? e.message : e)));
      }
    }
  }
  await Promise.all(jobs);
  // دايمًا 200 لـ Meta (حتى لو فشلت رسالة) عشان ما يعيد نفس الحدث للأبد — التكرار محمي بـ wa_id
  return new Response("ok", { status: 200 });
});
