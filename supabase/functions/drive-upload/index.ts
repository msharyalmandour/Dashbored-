// Supabase Edge Function — رفع ملف حقيقي إلى مجلد Google Drive الخاص بفريق
// المستخدم، وتسجيله بجدول files (أو ربطه بمحضر اجتماع موجود بجدول
// meeting_minutes لو انبعث meeting_minutes_id).
//
// النشر: تلقائيًا عبر Supabase MCP.
// المتغيرات المطلوبة (Project Settings → Edge Functions → Secrets):
//   GOOGLE_SERVICE_ACCOUNT_KEY   محتوى ملف JSON الكامل لحساب الخدمة
//                                 (Google Cloud Console → Credentials →
//                                 Service Accounts → Keys) — يُلصق كامل،
//                                 لا يُرسل أبدًا بالمحادثة مع الوكيل.
//   GOOGLE_DRIVE_ROOT_ID          معرّف الـ Shared Drive الرئيسي اللي حساب
//                                 الخدمة عضو Content Manager فيه — مو سر
//                                 (نفس فكرة drive_folder_id بالأسفل). كل
//                                 فريق جديد ما عنده مجلد بعد يحصل تلقائيًا
//                                 مجلد فرعي هنا بأول رفع له.
// (SUPABASE_URL و SUPABASE_ANON_KEY و SUPABASE_SERVICE_ROLE_KEY متوفرة
//  تلقائيًا داخل بيئة الدالة)
//
// مجلد كل فريق يُخزَّن بعمود research_projects.drive_folder_id. أول فريق
// (اللي أعدّته يدويًا) مجلده هو الـ root نفسه. أي فريق جديد بعده — بما فيها
// فرق طلاب ثانين ما نعرفهم — يُنشأ له مجلد فرعي تلقائيًا تحت GOOGLE_DRIVE_ROOT_ID
// أول ما يحاول يرفع أي ملف، بدون أي تدخل يدوي أو إعداد Google من طرفهم.

import { createClient } from "npm:@supabase/supabase-js@2";
import { GoogleAuth } from "npm:google-auth-library@9";

const SERVICE_ACCOUNT_KEY = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
const DRIVE_ROOT_ID = Deno.env.get("GOOGLE_DRIVE_ROOT_ID");

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function getDriveAccessToken(): Promise<string | null> {
  const googleAuth = new GoogleAuth({
    credentials: JSON.parse(SERVICE_ACCOUNT_KEY!),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  const googleClient = await googleAuth.getClient();
  const { token } = await googleClient.getAccessToken();
  return token ?? null;
}

/** يتأكد إن مجلد الفريق مُشارك بصيغة "أي حد يملك الرابط: مشاهدة" — بدون
    هذا، الملفات تُنشأ داخل الـ Shared Drive اللي حساب الخدمة عضو فيه بس،
    فأي رابط "افتح بدرايف" يوصّل الطالب/ة لشاشة "تحتاج صلاحية وصول" بدل
    الملف الفعلي (الطلاب ما عندهم حساب Google مشترك بنفس الـ Workspace،
    فعضوية الـ Shared Drive وحدها ما تكفي). نتحقق أول إذا الصلاحية موجودة
    مسبقًا (نتجنب تكرارها بكل رفعة)، ونضيفها بس أول مرة — هذا يصلح تلقائيًا
    حتى مجلدات فرق أُنشئت قبل هذا التعديل، أول ما أي عضو فيها يرفع ملف جديد. */
async function ensureFolderIsLinkShared(accessToken: string, folderId: string): Promise<void> {
  const listRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}/permissions?supportsAllDrives=true&fields=permissions(type)`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (listRes.ok) {
    const { permissions } = (await listRes.json()) as { permissions?: { type: string }[] };
    if (permissions?.some((p) => p.type === "anyone")) return;
  }
  const createRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}/permissions?supportsAllDrives=true`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "anyone", role: "reader" }),
    },
  );
  if (!createRes.ok) {
    console.error("Drive folder sharing failed:", await createRes.text());
  }
}

/** ينشئ مجلد فرعي جديد باسم الفريق تحت الـ Shared Drive الرئيسي، ويربطه
    بمشروع الفريق — يصير أول ما فريق جديد (ما أعددنا له مجلد يدويًا) يحاول
    يرفع أي ملف لأول مرة. آمن من التسابق: لو فريقين حاولوا بنفس اللحظة،
    الفريق يستخدم أول مجلد يتسجّل فعليًا بقاعدة البيانات. */
async function ensureDriveFolder(accessToken: string, projectId: string, teamId: string): Promise<string | null> {
  if (!DRIVE_ROOT_ID) return null;

  const { data: team } = await supabaseAdmin.from("teams").select("name").eq("id", teamId).single();
  const folderName = team?.name || "فريق بحثي";

  const createRes = await fetch(
    "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [DRIVE_ROOT_ID],
      }),
    },
  );
  if (!createRes.ok) {
    console.error("Drive folder creation failed:", await createRes.text());
    return null;
  }
  const created = (await createRes.json()) as { id: string };

  const { data: updated } = await supabaseAdmin
    .from("research_projects")
    .update({ drive_folder_id: created.id })
    .eq("id", projectId)
    .is("drive_folder_id", null)
    .select("drive_folder_id")
    .single();

  if (updated?.drive_folder_id) return updated.drive_folder_id;

  // فريق ثاني سبقنا وأنشأ مجلده بنفس اللحظة — نستخدم المجلد المسجَّل فعليًا
  const { data: project } = await supabaseAdmin
    .from("research_projects")
    .select("drive_folder_id")
    .eq("id", projectId)
    .single();
  return project?.drive_folder_id ?? created.id;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!SERVICE_ACCOUNT_KEY) {
      return jsonError("رفع الملفات لدرايف غير مفعّل بعد على هذا المشروع", 503);
    }

    // تحقق إن الطالب/ة مسجّل دخول فعليًا، بنفس أسلوب ai-assist
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return jsonError("غير مصرح — سجّل دخولك أولاً", 401);

    // نجيب مشروع البحث ومجلد Drive الخاصين بفريق المستخدم عبر RLS نفسها —
    // ما نثق أبدًا بأي folder id أو project id يرسله الطرف الآخر
    const { data: projectId } = await supabase.rpc("my_research_project_id");
    if (!projectId) return jsonError("ما لقينا مشروع بحث مرتبط بفريقك", 404);

    const { data: project } = await supabase
      .from("research_projects")
      .select("team_id, drive_folder_id")
      .eq("id", projectId)
      .single();
    if (!project) return jsonError("ما لقينا مشروع بحث مرتبط بفريقك", 404);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("ما فيه ملف مرفق بالطلب");
    const category = form.get("category") === "meeting-minutes" ? "meeting-minutes" : "general";
    const meetingMinutesId = form.get("meeting_minutes_id") as string | null;

    // توكن وصول حقيقي عبر حساب الخدمة — صلاحيته محصورة على المجلدات اللي
    // حساب الخدمة عضو فيها، ما يقدر يشوف أي شي ثاني بدرايف أحد
    const accessToken = await getDriveAccessToken();
    if (!accessToken) return jsonError("تعذّر الاتصال بـ Google Drive", 502);

    // مجلد الفريق: موجود مسبقًا (فرق أُعدّت يدويًا)، أو يُنشأ تلقائيًا الآن
    // كمجلد فرعي تحت الـ Shared Drive الرئيسي (أي فريق جديد — بما فيهم فرق
    // طلاب ثانين ما نعرفهم — بدون أي إعداد يدوي من جهتهم)
    const folderId =
      project.drive_folder_id ?? (await ensureDriveFolder(accessToken, projectId, project.team_id));
    if (!folderId) {
      return jsonError("رفع الملفات لدرايف غير مفعّل بعد على هذا المشروع — تواصلوا مع الدعم", 503);
    }
    // نتأكد إن الطلاب فعليًا يقدرون يفتحون روابط الملفات (مو بس يُنشأ الملف
    // داخل Shared Drive ما لهم عضوية فيه) — يشمل مجلدات فرق قديمة أُنشئت
    // قبل ما نضيف هذا الجزء، تُصلَح تلقائيًا أول رفعة جديدة لها
    await ensureFolderIsLinkShared(accessToken, folderId);

    const metadata = { name: file.name, parents: [folderId] };
    const boundary = `wesync-${crypto.randomUUID()}`;
    const encoder = new TextEncoder();
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const preamble = encoder.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
    );
    const closing = encoder.encode(`\r\n--${boundary}--`);
    const body = new Uint8Array(preamble.length + fileBytes.length + closing.length);
    body.set(preamble, 0);
    body.set(fileBytes, preamble.length);
    body.set(closing, preamble.length + fileBytes.length);

    const driveRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    );
    if (!driveRes.ok) {
      console.error("Drive upload failed:", await driveRes.text());
      return jsonError("فشل الرفع إلى Google Drive — حاولي مرة ثانية", 502);
    }
    const driveFile = (await driveRes.json()) as { id: string; webViewLink: string };

    if (meetingMinutesId) {
      const { error } = await supabaseAdmin
        .from("meeting_minutes")
        .update({ drive_file_id: driveFile.id, drive_view_link: driveFile.webViewLink })
        .eq("id", meetingMinutesId);
      if (error) return jsonError(error.message, 500);
      return new Response(
        JSON.stringify({ driveFileId: driveFile.id, driveViewLink: driveFile.webViewLink }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: fileRow, error: insertError } = await supabaseAdmin
      .from("files")
      .insert({
        research_project_id: projectId,
        name: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        category,
        drive_file_id: driveFile.id,
        drive_view_link: driveFile.webViewLink,
        uploaded_by: user.id,
      })
      .select()
      .single();
    if (insertError) return jsonError(insertError.message, 500);

    return new Response(JSON.stringify({ file: fileRow }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return jsonError("صار خطأ غير متوقع أثناء الرفع", 500);
  }
});
