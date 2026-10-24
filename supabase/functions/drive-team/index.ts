// ربط درايف الفريق: قائد الفريق يربط حساب Google حقه مرة وحدة، فنسوي مجلد «Wesync — اسم الفريق» بدرايفه
// ونشاركه مع أعضاء الفريق (وغيرهم لو أراد، مثل الدكتورة بالقراءة فقط). محاضر الاجتماعات (Word) تنرفع للمجلد.
// الصلاحية المطلوبة drive.file فقط: التطبيق ما يشوف إلا الملفات والمجلدات اللي أنشأها هو.
//
// verify_jwt=false لأن Google يرجّع المستخدم بطلب GET بدون توكن (الـ callback)؛ كل إجراء POST يوثّق نفسه بـ JWT.
// أسرار لازمة (Supabase → Edge Functions → Secrets):
//   GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET   من Google Cloud → OAuth client (Web application)
//        Authorized redirect URI = https://<project-ref>.supabase.co/functions/v1/drive-team
//   DRIVE_TOKEN_KEY   نص عشوائي طويل — يشفّر رموز التحديث قبل حفظها بقاعدة البيانات
//   SITE_URL          اختياري (الافتراضي https://dashbored-sigma.vercel.app)
// بدون الأسرار الثلاثة الأولى تردّ الدالة configured=false والواجهة تخفي الميزة.
import { createClient } from "npm:@supabase/supabase-js@2";

const CLIENT_ID = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
const TOKEN_KEY = Deno.env.get("DRIVE_TOKEN_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SITE = (Deno.env.get("SITE_URL") ?? "https://dashbored-sigma.vercel.app").replace(/\/$/, "");
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/drive-team`;
const configured = !!(CLIENT_ID && CLIENT_SECRET && TOKEN_KEY);

const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------- تشفير الرموز + توقيع state ----------
const enc = new TextEncoder();
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64url = (u: Uint8Array) => b64(u).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => unb64(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4));

async function aesKey() {
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(TOKEN_KEY!));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function encrypt(text: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), enc.encode(text)));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return b64(out);
}
async function decrypt(data: string): Promise<string> {
  const all = unb64(data);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: all.slice(0, 12) }, await aesKey(), all.slice(12));
  return new TextDecoder().decode(pt);
}
async function hmac(payload: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(TOKEN_KEY!), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(payload))));
}
async function signState(data: { u: string; p: string }): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ ...data, t: Date.now() })));
  return `${payload}.${await hmac(payload)}`;
}
async function verifyState(state: string): Promise<{ u: string; p: string } | null> {
  const [payload, sig] = state.split(".");
  if (!payload || !sig || (await hmac(payload)) !== sig) return null;
  try {
    const d = JSON.parse(new TextDecoder().decode(unb64url(payload)));
    if (!UUID.test(d.u) || !UUID.test(d.p) || Date.now() - d.t > 10 * 60 * 1000) return null;
    return { u: d.u, p: d.p };
  } catch {
    return null;
  }
}

// ---------- Google ----------
async function refreshAccessToken(refreshToken: string): Promise<{ token?: string; revoked?: boolean }> {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID!, client_secret: CLIENT_SECRET!, refresh_token: refreshToken, grant_type: "refresh_token" }),
  });
  const j = await r.json().catch(() => ({}));
  if (r.ok && j.access_token) return { token: j.access_token };
  return { revoked: j.error === "invalid_grant" };
}

async function createFolder(token: string, name: string): Promise<{ id: string; link: string } | null> {
  const r = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,webViewLink", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder" }),
  });
  if (!r.ok) {
    console.error("folder create failed", r.status, (await r.text()).slice(0, 300));
    return null;
  }
  const j = await r.json();
  return { id: j.id, link: j.webViewLink };
}

async function shareFolder(token: string, folderId: string, emails: string[], role: "writer" | "reader"): Promise<{ ok: number; failed: string[] }> {
  let ok = 0;
  const failed: string[] = [];
  for (const emailAddress of emails) {
    const r = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}/permissions?sendNotificationEmail=true&fields=id`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "user", role, emailAddress }),
    });
    if (r.ok) ok++;
    else {
      failed.push(emailAddress);
      console.error("share failed", r.status, (await r.text()).slice(0, 200));
    }
  }
  return { ok, failed };
}

// ---------- الفريق/المستخدم ----------
async function teamContext(userId: string) {
  const { data: profile } = await admin.from("profiles").select("id, name, email, role, team_id").eq("id", userId).maybeSingle();
  if (!profile?.team_id) return null;
  const { data: project } = await admin.from("research_projects").select("id, title").eq("team_id", profile.team_id).maybeSingle();
  if (!project) return null;
  const { data: team } = await admin.from("teams").select("name").eq("id", profile.team_id).maybeSingle();
  return { profile, project, teamName: (team?.name as string) || "فريق بحثي" };
}

async function memberEmails(teamId: string, exceptUserId?: string): Promise<string[]> {
  const { data } = await admin.from("profiles").select("id, email").eq("team_id", teamId);
  return (data ?? []).filter((m) => m.id !== exceptUserId && m.email && EMAIL.test(m.email)).map((m) => m.email as string);
}

async function connectionOf(projectId: string) {
  const { data } = await admin.from("drive_connections").select("*").eq("research_project_id", projectId).maybeSingle();
  return data;
}

function redirect(status: "connected" | "error", reason?: string) {
  const q = reason ? `?drive=${status}&reason=${reason}` : `?drive=${status}`;
  return new Response(null, { status: 302, headers: { Location: `${SITE}/#/meeting-minutes${q}` } });
}

// ---------- الـ callback (GET من Google) ----------
async function handleCallback(url: URL): Promise<Response> {
  if (!configured) return redirect("error", "not_configured");
  if (url.searchParams.get("error")) return redirect("error", "denied");
  const code = url.searchParams.get("code");
  const state = await verifyState(url.searchParams.get("state") ?? "");
  if (!code || !state) return redirect("error", "bad_state");

  const ctx = await teamContext(state.u);
  if (!ctx || ctx.project.id !== state.p || ctx.profile.role !== "leader") return redirect("error", "not_leader");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: CLIENT_ID!, client_secret: CLIENT_SECRET!, redirect_uri: REDIRECT_URI, grant_type: "authorization_code" }),
  });
  const tok = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tok.access_token) return redirect("error", "token");
  const granted = String(tok.scope ?? "");
  if (!granted.includes("drive.file")) return redirect("error", "scope");

  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tok.access_token}` } });
  const info = await infoRes.json().catch(() => ({}));
  const googleEmail = String(info.email ?? "");
  if (!googleEmail) return redirect("error", "email");

  const existing = await connectionOf(state.p);
  // refresh_token ما يرجع إلا بأول موافقة؛ لو غاب نحتفظ بالقديم لنفس الحساب
  let refreshToken: string | null = tok.refresh_token ?? null;
  if (!refreshToken && existing && existing.google_email === googleEmail) refreshToken = await decrypt(existing.refresh_token_enc);
  if (!refreshToken) return redirect("error", "no_refresh");

  let folderId = existing && existing.google_email === googleEmail ? (existing.folder_id as string) : "";
  let folderLink = existing && existing.google_email === googleEmail ? (existing.folder_link as string) : "";
  let isNewFolder = false;
  if (!folderId) {
    const f = await createFolder(tok.access_token, `Wesync — ${ctx.teamName}`);
    if (!f) return redirect("error", "folder");
    folderId = f.id;
    folderLink = f.link;
    isNewFolder = true;
  }

  const { error } = await admin.from("drive_connections").upsert({
    research_project_id: state.p,
    connected_by: state.u,
    google_email: googleEmail,
    refresh_token_enc: await encrypt(refreshToken),
    folder_id: folderId,
    folder_link: folderLink,
  });
  if (error) {
    console.error("save connection failed", error.message);
    return redirect("error", "save");
  }

  if (isNewFolder) {
    const emails = (await memberEmails(ctx.profile.team_id, state.u)).filter((e) => e.toLowerCase() !== googleEmail.toLowerCase());
    await shareFolder(tok.access_token, folderId, emails, "writer");
  }
  return redirect("connected");
}

// ---------- إجراءات POST ----------
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const url = new URL(req.url);
  if (req.method === "GET") return await handleCallback(url);
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false },
  });
  // نمرّر الرمز صراحة: getUser() بدون وسيط يعتمد على جلسة محفوظة (ما عندنا مع persistSession:false) فيرجّع «unauthorized» لمستخدم سليم
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const {
    data: { user },
  } = await userClient.auth.getUser(jwt);
  if (!user) return json(401, { error: "unauthorized" });

  const isForm = (req.headers.get("content-type") ?? "").includes("multipart/form-data");
  let body: Record<string, unknown> = {};
  let form: FormData | null = null;
  try {
    if (isForm) {
      form = await req.formData();
      body = { action: "upload" };
    } else body = await req.json();
  } catch {
    return json(400, { error: "bad_request" });
  }
  const action = String(body.action ?? "");

  if (!configured) {
    if (action === "status") return json(200, { configured: false });
    return json(503, { error: "not_configured" });
  }
  const ctx = await teamContext(user.id);
  if (!ctx) return json(404, { error: "no_project" });
  const isLeader = ctx.profile.role === "leader";
  const conn = await connectionOf(ctx.project.id);

  if (action === "status") {
    let connectedByName = "";
    if (conn?.connected_by) {
      const { data } = await admin.from("profiles").select("name").eq("id", conn.connected_by).maybeSingle();
      connectedByName = (data?.name as string) ?? "";
    }
    return json(200, {
      configured: true,
      connected: !!conn,
      googleEmail: conn?.google_email ?? null,
      folderLink: conn?.folder_link ?? null,
      connectedByName,
      isLeader,
    });
  }

  if (action === "start") {
    if (!isLeader) return json(403, { error: "leader_only" });
    const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    auth.search = new URLSearchParams({
      client_id: CLIENT_ID!,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: "openid email https://www.googleapis.com/auth/drive.file",
      access_type: "offline",
      prompt: "consent",
      state: await signState({ u: user.id, p: ctx.project.id }),
    }).toString();
    return json(200, { url: auth.toString() });
  }

  if (!conn) return json(409, { error: "not_connected" });
  const accessFor = async () => {
    const r = await refreshAccessToken(await decrypt(conn.refresh_token_enc));
    if (r.revoked) await admin.from("drive_connections").delete().eq("research_project_id", ctx.project.id);
    return r;
  };

  if (action === "share") {
    if (!isLeader) return json(403, { error: "leader_only" });
    const a = await accessFor();
    if (!a.token) return json(409, { error: "reconnect_required" });
    const members = (await memberEmails(ctx.profile.team_id, user.id)).filter((e) => e.toLowerCase() !== String(conn.google_email).toLowerCase());
    const extra = (Array.isArray(body.readOnlyEmails) ? body.readOnlyEmails : [])
      .map((e) => String(e).trim())
      .filter((e) => EMAIL.test(e) && e.toLowerCase() !== String(conn.google_email).toLowerCase())
      .slice(0, 5);
    const w = await shareFolder(a.token, conn.folder_id, members, "writer");
    const r = await shareFolder(a.token, conn.folder_id, extra, "reader");
    return json(200, { shared: w.ok + r.ok, failed: [...w.failed, ...r.failed] });
  }

  if (action === "disconnect") {
    if (!isLeader) return json(403, { error: "leader_only" });
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(await decrypt(conn.refresh_token_enc))}`, { method: "POST" });
    } catch {
      // الإلغاء عند Google أفضل جهد فقط
    }
    await admin.from("drive_connections").delete().eq("research_project_id", ctx.project.id);
    return json(200, { ok: true });
  }

  if (action === "upload" && form) {
    const file = form.get("file");
    const minutesId = String(form.get("meeting_minutes_id") ?? "");
    if (!(file instanceof File)) return json(400, { error: "no_file" });
    if (file.size > 15 * 1024 * 1024) return json(413, { error: "too_large" });
    if (!UUID.test(minutesId)) return json(400, { error: "bad_minutes_id" });
    // المحضر لازم يكون ظاهر للمستخدم (RLS) ويتبع مشروع فريقه
    const { data: row } = await userClient.from("meeting_minutes").select("id, drive_file_id, research_project_id").eq("id", minutesId).maybeSingle();
    if (!row || row.research_project_id !== ctx.project.id) return json(404, { error: "minutes_not_found" });

    const a = await accessFor();
    if (!a.token) return json(409, { error: "reconnect_required" });

    const mime = file.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const bytes = new Uint8Array(await file.arrayBuffer());
    let res: Response;
    if (row.drive_file_id) {
      res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${row.drive_file_id}?uploadType=media&fields=id,webViewLink`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${a.token}`, "Content-Type": mime },
        body: bytes,
      });
    } else {
      const boundary = `wesync-${crypto.randomUUID()}`;
      const pre = enc.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: file.name, parents: [conn.folder_id] })}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`);
      const post = enc.encode(`\r\n--${boundary}--`);
      const out = new Uint8Array(pre.length + bytes.length + post.length);
      out.set(pre);
      out.set(bytes, pre.length);
      out.set(post, pre.length + bytes.length);
      res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink", {
        method: "POST",
        headers: { Authorization: `Bearer ${a.token}`, "Content-Type": `multipart/related; boundary=${boundary}` },
        body: out,
      });
    }
    if (!res.ok) {
      console.error("drive upload failed", res.status, (await res.text()).slice(0, 300));
      return json(502, { error: "drive_failed" });
    }
    const f = (await res.json()) as { id: string; webViewLink: string };
    const { error } = await admin.from("meeting_minutes").update({ drive_file_id: f.id, drive_view_link: f.webViewLink }).eq("id", minutesId);
    if (error) return json(500, { error: "save_failed" });
    return json(200, { driveFileId: f.id, driveViewLink: f.webViewLink });
  }

  return json(400, { error: "unknown_action" });
});
