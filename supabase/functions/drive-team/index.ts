// ربط درايف الفريق: قائد الفريق يربط حساب Google حقه مرة وحدة، فنسوي مجلد «Wesync — اسم الفريق» بدرايفه
// فيه 6 مجلدات فرعية (01 المقترح … 06 المحاضر). كل عضو يقدر يربط درايفه (member_start) ونعرف مين مربوط
// (drive_members: connected | invited | missing_email | view_only). المشرف/ة «تشوف بس» (commenter) افتراضيًا.
// نعيد فحص الصلاحيات كل ساعة (pg_cron + x-digest-secret) وكل ما أحد فتح صفحة الدرايف.
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
// نرجّع المستخدم لنفس عنوان الموقع اللي بدأ منه الربط (جلسة دخوله محفوظة هناك)، بشرط يكون نطاقنا:
// نفس SITE أو نسخ مشروعنا على vercel.app. غير كذا نرجع لـ SITE.
function safeOrigin(o: unknown): string {
  try {
    const u = new URL(String(o));
    const siteHost = new URL(SITE).host;
    if (u.protocol === "https:" && (u.host === siteHost || u.host.endsWith("-msharyalmandour.vercel.app"))) return u.origin;
  } catch {
    // نرجع للافتراضي
  }
  return SITE;
}
async function signState(data: { u: string; p: string; o?: string; k?: "leader" | "member" }): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ ...data, t: Date.now() })));
  return `${payload}.${await hmac(payload)}`;
}
async function verifyState(state: string): Promise<{ u: string; p: string; o: string; k: "leader" | "member" } | null> {
  const [payload, sig] = state.split(".");
  if (!payload || !sig || (await hmac(payload)) !== sig) return null;
  try {
    const d = JSON.parse(new TextDecoder().decode(unb64url(payload)));
    if (!UUID.test(d.u) || !UUID.test(d.p) || Date.now() - d.t > 10 * 60 * 1000) return null;
    return { u: d.u, p: d.p, o: safeOrigin(d.o), k: d.k === "member" ? "member" : "leader" };
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

async function createFolder(token: string, name: string, parent?: string): Promise<{ id: string; link: string } | null> {
  const r = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,webViewLink", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder", ...(parent ? { parents: [parent] } : {}) }),
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


// ---------- ترتيب المجلد (6 مجلدات فرعية) + مين مربوط ----------
const SUBFOLDERS: [string, string][] = [
  ["proposal", "01 المقترح"],
  ["literature", "02 الأدبيات"],
  ["tools", "03 أدوات القياس"],
  ["ethics", "04 الأخلاقيات"],
  ["data", "05 البيانات"],
  ["minutes", "06 المحاضر"],
];
type Perm = { id: string; emailAddress?: string; role: string; type: string };
type Role = "writer" | "commenter" | "reader";

async function ensureSubfolders(token: string, conn: Record<string, unknown>): Promise<Record<string, string>> {
  const subs = { ...((conn.subfolders as Record<string, string> | null) ?? {}) };
  let changed = false;
  for (const [key, name] of SUBFOLDERS) {
    if (subs[key]) continue;
    const f = await createFolder(token, name, conn.folder_id as string);
    if (f) {
      subs[key] = f.id;
      changed = true;
    }
  }
  if (changed) await admin.from("drive_connections").update({ subfolders: subs }).eq("research_project_id", conn.research_project_id as string);
  return subs;
}

async function listPerms(token: string, fileId: string): Promise<Perm[]> {
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions?fields=permissions(id,emailAddress,role,type)&pageSize=100`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return [];
  return ((await r.json()).permissions ?? []) as Perm[];
}

async function countIn(token: string, folderId: string): Promise<number> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&pageSize=1000`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return 0;
  return ((await r.json()).files ?? []).length;
}

async function setPermRole(token: string, fileId: string, permId: string, role: Role): Promise<boolean> {
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions/${permId}?fields=id`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  return r.ok;
}

/** يتأكد من صلاحيات المجلد لكل عضو وللمشرف/ة، ويحدّث drive_members، ويرجّع القائمة + عدد ملفات كل مجلد فرعي.
    المشرف/ة: «تشوف بس» (commenter) افتراضيًا. الحالة: connected | invited | missing_email | view_only */
async function syncTeam(teamId: string, conn: Record<string, unknown>, token: string) {
  const subs = await ensureSubfolders(token, conn);
  const folderId = conn.folder_id as string;
  const owner = String(conn.google_email ?? "").toLowerCase();
  let perms = await listPerms(token, folderId);
  const has = (email?: string | null) => !!email && (email.toLowerCase() === owner || perms.some((p) => p.emailAddress?.toLowerCase() === email.toLowerCase()));
  const now = new Date().toISOString();

  const { data: profiles } = await admin.from("profiles").select("id, name, email, role").eq("team_id", teamId);
  const { data: rows } = await admin.from("drive_members").select("*").eq("team_id", teamId);
  const rowOf = (pid: string | null, kind: string) => (rows ?? []).find((r) => r.kind === kind && (kind === "supervisor" || r.profile_id === pid));

  for (const m of profiles ?? []) {
    const row = rowOf(m.id, "member");
    const email = (row?.email as string | null) || (m.email && EMAIL.test(m.email) ? (m.email as string) : null);
    const google = (row?.google_email as string | null) ?? null;
    let status: string;
    let invitedAt = (row?.invited_at as string | null) ?? null;
    if (m.id === conn.connected_by) status = "connected";
    else if (!email && !google) status = "missing_email";
    else {
      if (!has(email) && !has(google)) {
        const target = google || email!;
        const sh = await shareFolder(token, folderId, [target], "writer");
        if (sh.ok) {
          invitedAt = now;
          perms = [...perms, { id: "", emailAddress: target, role: "writer", type: "user" }];
        }
      }
      status = row?.connected_at && (has(google) || has(email)) ? "connected" : has(email) || has(google) ? "invited" : "missing_email";
    }
    const patch = { team_id: teamId, profile_id: m.id, kind: "member", email, status, role: "writer", invited_at: invitedAt, last_sync_at: now, updated_at: now };
    if (row) await admin.from("drive_members").update(patch).eq("id", row.id);
    else await admin.from("drive_members").insert(patch);
  }

  // المشرف/ة: إيميل الدكتورة من اشتراك الإيميل
  const { data: sup } = await admin.from("supervisor_email_subscriptions").select("email, unsubscribed_at").eq("team_id", teamId).maybeSingle();
  const supEmail = sup?.email && !sup.unsubscribed_at && EMAIL.test(sup.email) ? (sup.email as string) : null;
  const srow = rowOf(null, "supervisor");
  const role = ((srow?.role as Role | undefined) ?? "commenter") as Role;
  if (supEmail || srow) {
    const email = (srow?.email as string | null) || supEmail;
    let status = "missing_email";
    if (email) {
      const p = perms.find((x) => x.emailAddress?.toLowerCase() === email.toLowerCase());
      if (!p) {
        const sh = await shareFolder(token, folderId, [email], role === "writer" ? "writer" : "reader");
        // reader + تعليق: نرفعها لـ commenter بعد المشاركة
        if (sh.ok && role === "commenter") {
          const again = (await listPerms(token, folderId)).find((x) => x.emailAddress?.toLowerCase() === email.toLowerCase());
          if (again) await setPermRole(token, folderId, again.id, "commenter");
        }
      } else if (p.role !== role && p.role !== "owner") await setPermRole(token, folderId, p.id, role);
      status = role === "writer" ? "connected" : "view_only";
    }
    const patch = { team_id: teamId, profile_id: null, kind: "supervisor", email, status, role, last_sync_at: now, updated_at: now };
    if (srow) await admin.from("drive_members").update(patch).eq("id", srow.id);
    else await admin.from("drive_members").insert(patch);
  }

  const folders = [];
  for (const [key, name] of SUBFOLDERS) folders.push({ key, name, count: subs[key] ? await countIn(token, subs[key]) : 0 });
  await admin.from("drive_connections").update({ last_sync_at: now, folder_counts: folders }).eq("research_project_id", conn.research_project_id as string);
  return { folders, syncedAt: now };
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

function redirect(status: "connected" | "joined" | "error", reason?: string, base: string = SITE) {
  const q = reason ? `?drive=${status}&reason=${reason}` : `?drive=${status}`;
  return new Response(null, { status: 302, headers: { Location: `${base}/#/drive${q}` } });
}

// ---------- الـ callback (GET من Google) ----------
async function handleCallback(url: URL): Promise<Response> {
  if (!configured) return redirect("error", "not_configured");
  const state = await verifyState(url.searchParams.get("state") ?? "");
  if (url.searchParams.get("error")) return redirect("error", "denied", state?.o ?? SITE);
  const code = url.searchParams.get("code");
  if (!code || !state) return redirect("error", "bad_state");
  const back = (status: "connected" | "joined" | "error", reason?: string) => redirect(status, reason, state.o);

  const ctx = await teamContext(state.u);
  if (!ctx || ctx.project.id !== state.p) return back("error", "not_member");
  if (state.k === "member") return await joinMember(code, ctx, back);
  if (ctx.profile.role !== "leader") return back("error", "not_leader");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: CLIENT_ID!, client_secret: CLIENT_SECRET!, redirect_uri: REDIRECT_URI, grant_type: "authorization_code" }),
  });
  const tok = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tok.access_token) return back("error", "token");
  const granted = String(tok.scope ?? "");
  if (!granted.includes("drive.file")) return back("error", "scope");

  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tok.access_token}` } });
  const info = await infoRes.json().catch(() => ({}));
  const googleEmail = String(info.email ?? "");
  if (!googleEmail) return back("error", "email");

  const existing = await connectionOf(state.p);
  // refresh_token ما يرجع إلا بأول موافقة؛ لو غاب نحتفظ بالقديم لنفس الحساب
  let refreshToken: string | null = tok.refresh_token ?? null;
  if (!refreshToken && existing && existing.google_email === googleEmail) refreshToken = await decrypt(existing.refresh_token_enc);
  if (!refreshToken) return back("error", "no_refresh");

  let folderId = existing && existing.google_email === googleEmail ? (existing.folder_id as string) : "";
  let folderLink = existing && existing.google_email === googleEmail ? (existing.folder_link as string) : "";
  let isNewFolder = false;
  if (!folderId) {
    const f = await createFolder(tok.access_token, `Wesync — ${ctx.teamName}`);
    if (!f) return back("error", "folder");
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
    return back("error", "save");
  }

  if (isNewFolder) {
    const emails = (await memberEmails(ctx.profile.team_id, state.u)).filter((e) => e.toLowerCase() !== googleEmail.toLowerCase());
    await shareFolder(tok.access_token, folderId, emails, "writer");
  }
  // 6 مجلدات فرعية + مين مربوط (المشرف/ة «تشوف بس»)
  const fresh = await connectionOf(state.p);
  if (fresh) await syncTeam(ctx.profile.team_id, fresh, tok.access_token).catch((e) => console.error("sync after connect failed", String(e)));
  return back("connected");
}

/** عضو يربط درايفه بالفريق (DriveInviteM): نعرف إيميل Google حقه بس — ما نحفظ أي رمز له.
    لو المجلد مو مشارك مع هالإيميل نشاركه من حساب القائد. */
async function joinMember(code: string, ctx: NonNullable<Awaited<ReturnType<typeof teamContext>>>, back: (s: "connected" | "joined" | "error", r?: string) => Response) {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: CLIENT_ID!, client_secret: CLIENT_SECRET!, redirect_uri: REDIRECT_URI, grant_type: "authorization_code" }),
  });
  const tok = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tok.access_token) return back("error", "token");
  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tok.access_token}` } });
  const info = await infoRes.json().catch(() => ({}));
  const googleEmail = String(info.email ?? "");
  if (!EMAIL.test(googleEmail)) return back("error", "email");
  // ما نحتاج رمز العضو بعد ما عرفنا إيميله
  fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tok.access_token)}`, { method: "POST" }).catch(() => {});

  const now = new Date().toISOString();
  const { data: row } = await admin.from("drive_members").select("id").eq("team_id", ctx.profile.team_id).eq("kind", "member").eq("profile_id", ctx.profile.id).maybeSingle();
  const patch = { team_id: ctx.profile.team_id, profile_id: ctx.profile.id, kind: "member", google_email: googleEmail, connected_at: now, updated_at: now };
  if (row) await admin.from("drive_members").update(patch).eq("id", row.id);
  else await admin.from("drive_members").insert({ ...patch, status: "invited" });

  const conn = await connectionOf(ctx.project.id);
  if (conn) {
    const r = await refreshAccessToken(await decrypt(conn.refresh_token_enc));
    if (r.token) await syncTeam(ctx.profile.team_id, conn, r.token).catch((e) => console.error("sync after join failed", String(e)));
  }
  return back("joined");
}

// ---------- إجراءات POST ----------
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const url = new URL(req.url);
  if (req.method === "GET") return await handleCallback(url);
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  // كل ساعة (pg_cron بسر الجدولة): نعيد فحص صلاحيات مجلدات كل الفرق
  const cronSecret = req.headers.get("x-digest-secret");
  if (cronSecret) {
    const { data: okSecret } = await admin.rpc("verify_digest_secret", { p_secret: cronSecret });
    if (!okSecret) return json(401, { error: "unauthorized" });
    if (!configured) return json(200, { synced: 0 });
    const { data: all } = await admin.from("drive_connections").select("*");
    let synced = 0;
    for (const c of all ?? []) {
      const { data: proj } = await admin.from("research_projects").select("team_id").eq("id", c.research_project_id).maybeSingle();
      if (!proj?.team_id) continue;
      const r = await refreshAccessToken(await decrypt(c.refresh_token_enc));
      if (!r.token) continue;
      await syncTeam(proj.team_id as string, c, r.token).then(() => synced++, (e) => console.error("hourly sync failed", String(e)));
    }
    return json(200, { synced });
  }

  const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false },
  });
  // نمرّر الرمز صراحة: getUser() بدون وسيط يعتمد على جلسة محفوظة (ما عندنا مع persistSession:false) فيرجّع «unauthorized» لمستخدم سليم
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  let user = (await admin.auth.getUser(jwt)).data.user;
  let authMsg = "";
  if (!user) {
    const r = await userClient.auth.getUser(jwt);
    user = r.data.user;
    authMsg = r.error?.message ?? "";
  }
  if (!user) {
    // احتياط: قاعدة البيانات (PostgREST) تتحقق من توقيع الرمز بنفسها؛ لو قبلته وقرأنا ملف صاحبه فالرمز سليم
    try {
      const sub = String(JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).sub ?? "");
      if (UUID.test(sub)) {
        const { data } = await userClient.from("profiles").select("id").eq("id", sub).maybeSingle();
        if (data?.id === sub) user = { id: sub } as unknown as NonNullable<typeof user>;
      }
    } catch {
      // نكمل للرفض
    }
  }
  if (!user) {
    // تشخيص آمن (بدون كشف الرمز): نوع الرمز المرسل (anon/authenticated/…) ورسالة المصادقة
    let role = jwt ? "not_jwt" : "empty";
    try {
      role = String(JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).role ?? "?");
    } catch {
      // نخلي القيمة الافتراضية
    }
    return json(401, { error: "unauthorized", detail: `${role}${authMsg ? `: ${authMsg.slice(0, 80)}` : ""}` });
  }

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
      state: await signState({ u: user.id, p: ctx.project.id, o: safeOrigin(body.origin) }),
    }).toString();
    return json(200, { url: auth.toString() });
  }

  if (action === "member_start") {
    if (!conn) return json(409, { error: "not_connected" });
    const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    auth.search = new URLSearchParams({
      client_id: CLIENT_ID!,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: "openid email https://www.googleapis.com/auth/drive.file",
      prompt: "select_account",
      state: await signState({ u: user.id, p: ctx.project.id, o: safeOrigin(body.origin), k: "member" }),
    }).toString();
    return json(200, { url: auth.toString() });
  }

  if (!conn) return json(409, { error: "not_connected" });
  const accessFor = async () => {
    const r = await refreshAccessToken(await decrypt(conn.refresh_token_enc));
    if (r.revoked) await admin.from("drive_connections").delete().eq("research_project_id", ctx.project.id);
    return r;
  };

  if (action === "members") {
    // كل ما أحد فتح الصفحة نتأكد (مرة كل دقيقة بالكثير)، وكل ساعة من الجدولة
    const last = conn.last_sync_at ? Date.parse(conn.last_sync_at as string) : 0;
    if (body.force || Date.now() - last > 60 * 1000) {
      const a = await accessFor();
      if (!a.token) return json(409, { error: "reconnect_required" });
      await syncTeam(ctx.profile.team_id, conn, a.token);
    }
    return json(200, { ok: true });
  }

  if (action === "set_email") {
    if (!isLeader) return json(403, { error: "leader_only" });
    const pid = String(body.profileId ?? "");
    const email = String(body.email ?? "").trim();
    const kind = body.kind === "supervisor" ? "supervisor" : "member";
    if (!EMAIL.test(email) || (kind === "member" && !UUID.test(pid))) return json(400, { error: "bad_email" });
    if (kind === "member") {
      const { data: m } = await admin.from("profiles").select("id").eq("id", pid).eq("team_id", ctx.profile.team_id).maybeSingle();
      if (!m) return json(404, { error: "not_member" });
    }
    let q = admin.from("drive_members").select("id").eq("team_id", ctx.profile.team_id).eq("kind", kind);
    if (kind === "member") q = q.eq("profile_id", pid);
    const { data: row } = await q.maybeSingle();
    const now = new Date().toISOString();
    if (row) await admin.from("drive_members").update({ email, updated_at: now }).eq("id", row.id);
    else await admin.from("drive_members").insert({ team_id: ctx.profile.team_id, profile_id: kind === "member" ? pid : null, kind, email, status: "missing_email", role: kind === "supervisor" ? "commenter" : "writer" });
    const a = await accessFor();
    if (!a.token) return json(409, { error: "reconnect_required" });
    await syncTeam(ctx.profile.team_id, conn, a.token);
    return json(200, { ok: true });
  }

  if (action === "set_supervisor_role") {
    if (!isLeader) return json(403, { error: "leader_only" });
    const role = String(body.role ?? "") as Role;
    if (!["writer", "commenter", "reader"].includes(role)) return json(400, { error: "bad_role" });
    const { data: row } = await admin.from("drive_members").select("id").eq("team_id", ctx.profile.team_id).eq("kind", "supervisor").maybeSingle();
    if (!row) return json(404, { error: "no_supervisor" });
    await admin.from("drive_members").update({ role, updated_at: new Date().toISOString() }).eq("id", row.id);
    const a = await accessFor();
    if (!a.token) return json(409, { error: "reconnect_required" });
    await syncTeam(ctx.profile.team_id, conn, a.token);
    return json(200, { ok: true });
  }

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
      const pre = enc.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name: file.name, parents: [((conn.subfolders as Record<string, string> | null) ?? {}).minutes || conn.folder_id] })}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`);
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
