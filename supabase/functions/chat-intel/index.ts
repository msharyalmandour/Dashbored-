// Supabase Edge Function — chat-intel: ذكاء محادثة الفريق. عضو مسجّل دخول (JWT)، والفريق من ملفه.
//  summary : «الخلاصة الحيّة» (انقرر / مفتوح / مين عليه وش) — محفوظة لكل فريق، وما تنحسب من جديد إلا لو فيه رسائل جديدة ومرّت دقيقتين
//  catchup : «اللي فاتك ويخصك» — ٣ أسطر لصاحب الطلب من رسائل غيابه ومهامه
//  voice   : يطلع من نص الفويس الزبدة والمهام/القرارات/الأسئلة/المواعيد (كل ~٥ ثواني وقت التسجيل، ومرة أخيرة بعد الإيقاف)
//  stt     : تفريغ ملف الفويس (حاوية drops) — بس لو فيه ELEVENLABS_API_KEY، وإلا not_configured ويكفي نص المتصفح
// نموذج سريع واحد بمخطط JSON صارم. المتغيرات: ANTHROPIC_API_KEY، ELEVENLABS_API_KEY (اختياري).
import Anthropic from "npm:@anthropic-ai/sdk@^0.68.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { CATCHUP_SCHEMA, CATCHUP_SYSTEM, normalizeCatchup, normalizeSummary, normalizeVoice, riyadhToday, SUMMARY_SCHEMA, SUMMARY_SYSTEM, transcript, VOICE_SCHEMA, VOICE_SYSTEM, type Line } from "./lib.ts";

const MODEL = "claude-haiku-5-5";
const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// حدود شهرية لكل فريق (عدّاد agent_runs) — سخية، بس تمنع الإسراف
const MONTHLY: Record<string, number> = { "chat-summary": 900, "chat-catchup": 300, "voice-extract": 3000, "voice-stt": 400 };
const SUMMARY_EVERY_MS = 2 * 60_000;

const monthStart = () => {
  const d = new Date(Date.now() + 3 * 3600_000);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - 3 * 3600_000).toISOString();
};
async function underLimit(teamId: string, action: string) {
  const { count } = await admin.from("agent_runs").select("id", { count: "exact", head: true }).eq("team_id", teamId).eq("action", action).gte("created_at", monthStart());
  return (count ?? 0) < (MONTHLY[action] ?? 100);
}
const logRun = (teamId: string, userId: string, action: string) => admin.from("agent_runs").insert({ team_id: teamId, profile_id: userId, action }).then(() => {}, () => {});

async function ask(system: string, schema: unknown, prompt: string, maxTokens = 900): Promise<unknown | null> {
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    ...({ thinking: { type: "disabled" }, output_config: { effort: "low", format: { type: "json_schema", schema } } } as Record<string, unknown>),
    messages: [{ role: "user", content: prompt }],
  });
  if (res.stop_reason !== "end_turn") return null;
  const raw = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
  return JSON.parse(raw);
}

const hhmm = (iso: string) => new Date(new Date(iso).getTime() + 3 * 3600_000).toISOString().slice(5, 16).replace("T", " ");

async function chatLines(teamId: string, names: Map<string, string>, since?: string, limit = 160): Promise<{ lines: Line[]; last: string | null }> {
  let q = admin.from("team_messages").select("author_id, kind, meta, body, created_at").eq("team_id", teamId).is("deleted_at", null).order("created_at", { ascending: false }).limit(limit);
  if (since) q = q.gt("created_at", since);
  const { data } = await q;
  const rows = ((data ?? []) as { author_id: string | null; kind: string; meta: Record<string, unknown> | null; body: string; created_at: string }[]).reverse();
  const lines = rows.map((r) => {
    const meta = r.meta ?? {};
    if (r.kind === "event" && meta.type === "supervisor_message") return { who: `${String(meta.by ?? "الدكتورة")} (المشرف/ة)`, at: hhmm(r.created_at), text: String(meta.body ?? meta.excerpt ?? r.body) };
    if (r.kind === "event") return { who: "حدث", at: hhmm(r.created_at), text: r.body };
    if (meta.type === "voice") return { who: names.get(r.author_id ?? "") ?? "عضو", at: hhmm(r.created_at), text: `(فويس) ${String(meta.transcript ?? meta.gist ?? "")}` };
    if (r.kind === "agent") return { who: "الوكيل", at: hhmm(r.created_at), text: r.body };
    return { who: names.get(r.author_id ?? "") ?? "عضو", at: hhmm(r.created_at), text: r.body };
  });
  return { lines, last: rows.length ? rows[rows.length - 1].created_at : null };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin.auth.getUser(jwt);
  if (!u?.user) return json(401, { error: "unauthorized" });
  const { data: me } = await admin.from("profiles").select("id, team_id, name").eq("id", u.user.id).maybeSingle();
  if (!me?.team_id) return json(403, { error: "no_team" });
  const teamId = me.team_id as string;
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  const { data: team } = await admin.from("teams").select("subscription_end_date").eq("id", teamId).maybeSingle();
  const active = !!team?.subscription_end_date && String(team.subscription_end_date) >= riyadhToday();
  const { data: members } = await admin.from("profiles").select("id, name").eq("team_id", teamId);
  const roster = ((members ?? []) as { id: string; name: string | null }[]).map((m) => ({ id: m.id, name: String(m.name ?? "").trim() })).filter((m) => m.name);
  const names = new Map(roster.map((m) => [m.id, m.name.split(/\s+/)[0]]));

  try {
    if (action === "summary") {
      // الكاش: لو ما فيه جديد، أو انحسبت قبل أقل من دقيقتين، نرجّعها زي ما هي
      const { data: cached } = await admin.from("chat_summaries").select("data, last_message_at, updated_at").eq("team_id", teamId).maybeSingle();
      const { data: newest } = await admin.from("team_messages").select("created_at").eq("team_id", teamId).is("deleted_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const newestAt = (newest?.created_at as string | undefined) ?? null;
      const fresh = cached && (!newestAt || (cached.last_message_at && cached.last_message_at >= newestAt) || Date.now() - Date.parse(cached.updated_at) < SUMMARY_EVERY_MS);
      if (cached && (fresh || !active)) return json(200, { summary: cached.data, updatedAt: cached.updated_at, cached: true });
      if (!active) return json(200, { summary: null, reason: "read_only" });
      if (!(await underLimit(teamId, "chat-summary"))) return json(200, { summary: cached?.data ?? null, updatedAt: cached?.updated_at ?? null, reason: "ai_limit" });
      const { lines, last } = await chatLines(teamId, names);
      if (lines.filter((l) => l.who !== "حدث").length < 4) return json(200, { summary: null, reason: "too_short" });
      const { data: tasks } = await admin.from("tasks").select("title, assignee_id, status").eq("team_id", teamId).neq("status", "done").order("due_date", { ascending: true }).limit(25);
      const taskLines = ((tasks ?? []) as { title: string; assignee_id: string | null }[]).map((t) => `- ${t.title}${t.assignee_id ? ` (${names.get(t.assignee_id) ?? ""})` : ""}`).join("\n");
      const prompt = `ROSTER: ${roster.map((m) => m.name).join(" · ")}\nOPEN TASKS:\n${taskLines || "—"}\n\n<chat>\n${transcript(lines)}\n</chat>`;
      const raw = await ask(SUMMARY_SYSTEM, SUMMARY_SCHEMA, prompt, 700);
      const summary = normalizeSummary(raw, roster.map((m) => m.name));
      const now = new Date().toISOString();
      await admin.from("chat_summaries").upsert({ team_id: teamId, data: summary, last_message_at: last, updated_at: now }).then(() => {}, () => {});
      await logRun(teamId, me.id, "chat-summary");
      return json(200, { summary, updatedAt: now, cached: false });
    }

    if (action === "catchup") {
      const since = String(body.since ?? "");
      if (!/^\d{4}-\d{2}-\d{2}T/.test(since)) return json(400, { error: "bad_request" });
      if (!active) return json(200, { lines: [], reason: "read_only" });
      if (!(await underLimit(teamId, "chat-catchup"))) return json(200, { lines: [], reason: "ai_limit" });
      const { lines } = await chatLines(teamId, names, since, 150);
      if (lines.length < 3) return json(200, { lines: [] });
      const { data: mine } = await admin.from("tasks").select("title, due_date").eq("team_id", teamId).eq("assignee_id", me.id).neq("status", "done").order("due_date", { ascending: true }).limit(8);
      const myTasks = ((mine ?? []) as { title: string; due_date: string | null }[]).map((t) => `- ${t.title}${t.due_date ? ` (due ${t.due_date})` : ""}`).join("\n");
      const prompt = `ME: ${String(me.name ?? "").trim()} (first name: ${names.get(me.id) ?? ""})\nTODAY: ${riyadhToday()}\nMY OPEN TASKS:\n${myTasks || "—"}\n\n<missed_chat>\n${transcript(lines, 10000)}\n</missed_chat>`;
      const out = normalizeCatchup(await ask(CATCHUP_SYSTEM, CATCHUP_SCHEMA, prompt, 500));
      await logRun(teamId, me.id, "chat-catchup");
      return json(200, { lines: out });
    }

    if (action === "voice") {
      const text = String(body.text ?? "").slice(0, 6000).trim();
      if (text.split(/\s+/).length < 4) return json(200, { gist: "", items: [] });
      if (!active) return json(200, { gist: "", items: [], reason: "read_only" });
      if (!(await underLimit(teamId, "voice-extract"))) return json(200, { gist: "", items: [], reason: "ai_limit" });
      const today = riyadhToday();
      const prompt = `TODAY: ${today}\nROSTER: ${roster.map((m) => m.name).join(" · ")}\n\n<voice>\n${text}\n</voice>`;
      const out = normalizeVoice(await ask(VOICE_SYSTEM, VOICE_SCHEMA, prompt, 700), roster, today);
      await logRun(teamId, me.id, "voice-extract");
      return json(200, out);
    }

    if (action === "stt") {
      const key = Deno.env.get("ELEVENLABS_API_KEY");
      if (!key) return json(200, { text: null, reason: "not_configured" });
      const path = String(body.path ?? "");
      if (!path.startsWith(`${teamId}/voice/`)) return json(400, { error: "bad_path" });
      if (!active) return json(200, { text: null, reason: "read_only" });
      if (!(await underLimit(teamId, "voice-stt"))) return json(200, { text: null, reason: "ai_limit" });
      const { data: file, error } = await admin.storage.from("drops").download(path);
      if (error || !file) return json(404, { error: "not_found" });
      const fd = new FormData();
      fd.append("model_id", Deno.env.get("ELEVENLABS_STT_MODEL") ?? "scribe_v1");
      fd.append("language_code", "ara");
      fd.append("file", file, "voice.webm");
      const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": key }, body: fd });
      if (!r.ok) {
        console.error("chat-intel stt:", r.status);
        return json(200, { text: null, reason: "stt_failed" });
      }
      const out = (await r.json()) as { text?: string };
      await logRun(teamId, me.id, "voice-stt");
      return json(200, { text: String(out.text ?? "").slice(0, 8000) });
    }

    return json(400, { error: "unknown_action" });
  } catch (e) {
    console.error("chat-intel:", action, e instanceof Error ? e.message : e);
    return json(200, { error: "ai_failed" });
  }
});
