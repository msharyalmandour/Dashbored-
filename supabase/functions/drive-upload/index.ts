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
// (SUPABASE_URL و SUPABASE_ANON_KEY و SUPABASE_SERVICE_ROLE_KEY متوفرة
//  تلقائيًا داخل بيئة الدالة)
//
// مجلد Drive نفسه مو سر — يُخزَّن بعمود research_projects.drive_folder_id
// (لكل فريق مجلده الخاص)، وحساب الخدمة لازم يكون عضو Content Manager
// بالـ Shared Drive اللي يحويه (يضيفه قائد الفريق يدويًا من Drive).

import { createClient } from "npm:@supabase/supabase-js@2";
import { GoogleAuth } from "npm:google-auth-library@9";

const SERVICE_ACCOUNT_KEY = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

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
      .select("drive_folder_id")
      .eq("id", projectId)
      .single();
    if (!project?.drive_folder_id) {
      return jsonError("مجلد Google Drive لفريقكم ما تم ربطه بعد — تواصلوا مع قائد الفريق", 409);
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("ما فيه ملف مرفق بالطلب");
    const category = form.get("category") === "meeting-minutes" ? "meeting-minutes" : "general";
    const meetingMinutesId = form.get("meeting_minutes_id") as string | null;

    // توكن وصول حقيقي عبر حساب الخدمة — صلاحيته محصورة على المجلدات اللي
    // أضافه قائد الفريق فيها كعضو، ما يقدر يشوف أي شي ثاني بدرايف أحد
    const googleAuth = new GoogleAuth({
      credentials: JSON.parse(SERVICE_ACCOUNT_KEY),
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    const googleClient = await googleAuth.getClient();
    const { token: accessToken } = await googleClient.getAccessToken();
    if (!accessToken) return jsonError("تعذّر الاتصال بـ Google Drive", 502);

    const metadata = { name: file.name, parents: [project.drive_folder_id] };
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
