import { isSupabaseConfigured, supabase } from "./supabaseClient";

export interface DriveStatus {
  /** true لو ما قدرنا نوصل لدالة الدرايف أصلًا (مهلة/شبكة/خطأ سيرفر) — غير «الميزة مو مفعّلة» */
  unreachable?: boolean;
  /** كود الخطأ الأخير (للتشخيص) */
  errorCode?: string;
  configured: boolean;
  connected: boolean;
  googleEmail: string | null;
  folderLink: string | null;
  connectedByName: string;
  isLeader: boolean;
}

const OFF: DriveStatus = { configured: false, connected: false, googleEmail: null, folderLink: null, connectedByName: "", isLeader: false };

/** كل استدعاءات ربط درايف الفريق (دالة drive-team). ترجع {error} بدل ما ترمي، والواجهة تقرر الرسالة. */
const TIMEOUT_MS = 20000;

async function call<T>(body: Record<string, unknown> | FormData, timeoutMs = TIMEOUT_MS): Promise<{ data?: T; error?: string }> {
  if (!isSupabaseConfigured) return { error: "not_configured" };
  // بدون مهلة: لو الدالة علّقت (إقلاع بارد/شبكة) يظل الزر يدور للأبد
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<{ data: null; error: { message: string } }>((resolve) => {
    timer = setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), timeoutMs);
  });
  const res = await Promise.race([supabase!.functions.invoke("drive-team", { body }), timeout]);
  clearTimeout(timer);
  const { data, error } = res as { data: unknown; error: { message?: string; context?: Response } | null };
  if (error?.message === "timeout") return { error: "timeout" };
  if (error) {
    // supabase-js يغلّف ردود الأخطاء — نحاول نقرأ كود الخطأ من جسم الرد
    try {
      const ctx = (error as { context?: Response }).context;
      const j = ctx ? await ctx.json() : null;
      if (j?.error) return { error: String(j.error) };
    } catch {
      // نرجع للرسالة العامة
    }
    return { error: "failed" };
  }
  return { data: data as T };
}

export async function getDriveStatus(): Promise<DriveStatus> {
  const r = await call<DriveStatus>({ action: "status" }, 12000);
  // فشل الفحص ≠ الميزة مطفّية: نرجّع unreachable عشان الواجهة تعرض «تعذّر الفحص + أعيدوا المحاولة» بدل ما تختفي
  if (!r.data) return r.error === "not_configured" ? OFF : { ...OFF, unreachable: true, errorCode: r.error ?? "failed" };
  return r.data;
}

/** يرجّع رابط موافقة Google؛ الواجهة تفتحه بنفس النافذة */
export async function startDriveConnect() {
  return call<{ url: string }>({ action: "start" });
}

export async function shareDriveFolder(readOnlyEmails: string[] = []) {
  return call<{ shared: number; failed: string[] }>({ action: "share", readOnlyEmails });
}

export async function disconnectDrive() {
  return call<{ ok: boolean }>({ action: "disconnect" });
}

export async function uploadMinutesToDrive(blob: Blob, fileName: string, minutesId: string) {
  const form = new FormData();
  form.append("file", new File([blob], fileName, { type: blob.type }));
  form.append("meeting_minutes_id", minutesId);
  return call<{ driveFileId: string; driveViewLink: string }>(form, 60000);
}

/** سبب الفشل لما تردّنا Google للموقع (?drive=error&reason=...) — كل كود له رسالة تقول وش نسوي */
export function driveReturnMessage(reason: string | null): string {
  switch (reason) {
    case "denied":
      return "ما وافقتم على الصلاحية بقوقل. اضغطوا «اربطوا Google Drive» وسمحوا بالوصول لملفات Wesync.";
    case "scope":
      return "لازم تعلّمون خانة «عرض الملفات وإدارتها اللي أنشأها هذا التطبيق» بشاشة الموافقة، وبدونها ما يشتغل الرفع.";
    case "not_leader":
      return "الربط لقائد الفريق فقط، وبنفس الحساب اللي مسجّل فيه الدخول لـ Wesync.";
    case "bad_state":
      return "انتهت صلاحية خطوة الربط (١٠ دقايق). ابدأوا من جديد من زر الربط.";
    case "no_refresh":
      return "قوقل ما أعطتنا إذن دائم. افتحوا myaccount.google.com/permissions وأزيلوا Wesync، ثم اربطوا من جديد.";
    case "folder":
      return "انربط الحساب لكن تعذّر إنشاء المجلد بالدرايف. تأكدوا إن في الدرايف مساحة فاضية وجرّبوا مرة ثانية.";
    case "token":
    case "email":
      return "قوقل رفضت إكمال الربط. جرّبوا مرة ثانية، ولو تكررت أرسلوا لنا كود الخطأ: " + reason;
    case "save":
      return "تعذّر حفظ الربط عندنا. جرّبوا مرة ثانية.";
    case "not_configured":
      return "ميزة الدرايف ما انفعّلت على الخادم بعد.";
    default:
      return `صار خطأ أثناء الربط — جرّبوا مرة ثانية.${reason ? ` (${reason})` : ""}`;
  }
}

export function driveErrorMessage(code: string | undefined): string {
  switch (code) {
    case "timeout":
      return "الاتصال تأخر — جرّبوا مرة ثانية بعد شوي.";
    case "not_configured":
      return "ميزة الدرايف ما انفعّلت على الخادم بعد.";
    case "reconnect_required":
      return "انتهى ربط الدرايف — قائد الفريق يعيد الربط من بطاقة الدرايف.";
    case "not_connected":
      return "الدرايف ما انربط بعد.";
    case "leader_only":
      return "هذا الإجراء لقائد الفريق فقط.";
    case "too_large":
      return "الملف أكبر من الحد المسموح.";
    default:
      return `تعذّر الاتصال بدرايف — حاولوا مرة ثانية.${code && code !== "failed" ? ` (${code})` : ""}`;
  }
}
