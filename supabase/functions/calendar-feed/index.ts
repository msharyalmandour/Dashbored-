// اشتراك تقويم الجوال: رابط ICS خاص بكل مستخدمة (التوثيق بالرمز داخل الرابط، لذلك verify_jwt=false).
// يقرأ بمفتاح service role لكن يحصر كل شيء بفريق صاحبة الرمز.
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildCalendar, type FeedEvent } from "./ics.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function plain(status: number, body: string) {
  return new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "GET" && req.method !== "HEAD") return plain(405, "Method not allowed");
  const url = new URL(req.url);
  const token = (url.searchParams.get("t") ?? "").trim();
  const scope = url.searchParams.get("scope") === "team" ? "team" : "mine";
  if (!UUID.test(token)) return plain(404, "Not found");

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  const { data: feed } = await admin.from("calendar_feeds").select("profile_id").eq("token", token).maybeSingle();
  if (!feed) return plain(404, "Not found");
  const { data: profile } = await admin.from("profiles").select("id, team_id").eq("id", feed.profile_id).maybeSingle();
  if (!profile?.team_id) return plain(404, "Not found");
  const teamId = profile.team_id as string;

  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const events: FeedEvent[] = [];

  let tq = admin
    .from("tasks")
    .select("id, title, description, due_date, priority, status, assignee_id")
    .eq("team_id", teamId)
    .neq("status", "done")
    .not("due_date", "is", null)
    .gte("due_date", cutoff)
    .limit(500);
  if (scope === "mine") tq = tq.eq("assignee_id", profile.id);
  const { data: tasks } = await tq;
  for (const t of tasks ?? []) {
    events.push({
      uid: `task-${t.id}@wesync`,
      title: `📝 ${t.title}`,
      description: [t.description, t.priority === "high" ? "أولوية عالية" : ""].filter(Boolean).join("\n"),
      date: t.due_date as string,
      alarms: ["-PT15H", "PT8H"],
    });
  }

  const { data: project } = await admin
    .from("research_projects")
    .select("id, title, target_submission_date")
    .eq("team_id", teamId)
    .maybeSingle();
  if (project) {
    const { data: stages } = await admin
      .from("research_stages")
      .select("id, title_ar, target_date, status")
      .eq("research_project_id", project.id)
      .neq("status", "done")
      .not("target_date", "is", null)
      .gte("target_date", cutoff);
    for (const s of stages ?? []) {
      events.push({
        uid: `stage-${s.id}@wesync`,
        title: `🎯 موعد مرحلة: ${s.title_ar}`.trim(),
        description: project.title ? `بحثكم: ${project.title}` : undefined,
        date: s.target_date as string,
        alarms: ["-PT15H"],
      });
    }
    if (project.target_submission_date && project.target_submission_date >= cutoff) {
      events.push({
        uid: `deadline-${project.id}@wesync`,
        title: "🏁 موعد تسليم البحث",
        description: project.title ? `بحثكم: ${project.title}` : undefined,
        date: project.target_submission_date,
        alarms: ["-P7D", "-PT15H", "PT8H"],
      });
    }
  }

  const body = buildCalendar(scope === "team" ? "Wesync — مواعيد الفريق" : "Wesync — مهامي ومواعيدي", events);
  return new Response(req.method === "HEAD" ? null : body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="wesync.ics"',
      "Cache-Control": "private, max-age=600",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
