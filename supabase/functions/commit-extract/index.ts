// Supabase Edge Function — commit-extract: يقرا رسالة الدكتورة ويطلّع منها التزامات مقترحة (commitments, status=proposed):
// طلباتها من الفريق (from_supervisor) ووعودها لهم (to_team). ينطلب من القاعدة نفسها (trigger على supervisor_messages)
// بسر الجدولة من الـ vault — ما فيه نداء من المتصفح. نداء ذكاء واحد بمخطط JSON صارم (Haiku). المتغيرات: ANTHROPIC_API_KEY.
import Anthropic from "npm:@anthropic-ai/sdk@^0.68.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { normalize, riyadhToday, SCHEMA, SYSTEM, type Member } from "./lib.ts";

const MODEL = "claude-haiku-5-5";
const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  const given = req.headers.get("x-digest-secret");
  const { data: ok } = given ? await admin.rpc("verify_digest_secret", { p_secret: given }) : { data: false };
  if (ok !== true) return json(401, { error: "unauthorized" });

  const body = await req.json().catch(() => ({}));
  const messageId = String(body.messageId ?? "");
  if (!UUID.test(messageId)) return json(400, { error: "bad_request" });

  const { data: msg } = await admin.from("supervisor_messages").select("id, team_id, sender, sender_name, body").eq("id", messageId).maybeSingle();
  if (!msg || msg.sender !== "supervisor") return json(200, { created: 0, skipped: "not_supervisor" });
  // مرة وحدة لكل رسالة
  const { count } = await admin.from("commitments").select("id", { count: "exact", head: true }).eq("source_message_id", messageId);
  if ((count ?? 0) > 0) return json(200, { created: 0, skipped: "done_before" });

  const { data: members } = await admin.from("profiles").select("id, name").eq("team_id", msg.team_id);
  const roster = ((members ?? []) as Member[]).filter((m) => m.name);
  const today = riyadhToday();
  const prompt = `TODAY: ${today.date} (${today.weekday})\nROSTER: ${roster.map((m) => m.name).join(" · ") || "—"}\nSUPERVISOR: ${msg.sender_name || "—"}\n\n<message>\n${String(msg.body).slice(0, 4000)}\n</message>`;

  let items: ReturnType<typeof normalize> = [];
  let usage = { input_tokens: 0, output_tokens: 0 };
  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM,
      ...({ thinking: { type: "disabled" }, output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } } } as Record<string, unknown>),
      messages: [{ role: "user", content: prompt }],
    });
    usage = { input_tokens: res.usage?.input_tokens ?? 0, output_tokens: res.usage?.output_tokens ?? 0 };
    if (res.stop_reason === "end_turn") {
      const raw = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
      items = normalize(JSON.parse(raw), roster, today.date);
    }
  } catch (e) {
    console.error("commit-extract:", e instanceof Error ? e.message : e);
    return json(200, { created: 0, error: "ai_failed" });
  }

  if (items.length) {
    const { error } = await admin.from("commitments").insert(items.map((it) => ({ ...it, team_id: msg.team_id, source_message_id: msg.id, status: "proposed" })));
    if (error) {
      console.error("commit-extract insert:", error.message);
      return json(500, { error: "db_error" });
    }
  }
  await admin.from("agent_runs").insert({ team_id: msg.team_id, profile_id: null, action: "commit-extract" }).then(() => {}, () => {});
  return json(200, { created: items.length, usage });
});
