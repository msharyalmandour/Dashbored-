import { isSupabaseConfigured, supabase } from "./supabaseClient";
import { track } from "./analytics";
import { tr } from "./i18n";

/* «ارموا أي شي» — طبقة البيانات: رمية (drops) فيها عناصر (ملفات بحاوية drops، نصوص، روابط)،
   drop-read يقراها ويكتب النتايج (drop_results)، والحفظ/التراجع بدوال القاعدة drop_file / drop_undo
   بصلاحيات المستخدم نفسه. */

export type Destination = "library" | "tasks" | "minutes" | "supervisor_note" | "supervisor_question" | "proposal" | "dataset" | "tools" | "ethics" | "calendar" | "files";
export type DropStatus = "uploading" | "reading" | "ready" | "filed" | "undone" | "failed";
export type DropError = "unreadable" | "unsupported" | "nothing_found" | "offline" | "ai_limit" | "too_large" | "failed";
export type DropSource = "page" | "global" | "share" | "orb" | "paste" | "chat";

export interface DropRow {
  id: string;
  status: DropStatus;
  error_code: DropError | null;
  source: DropSource;
  summary: string;
  created_at: string;
  filed_at: string | null;
}
export interface DropItemRow {
  id: string;
  kind: "file" | "text" | "url";
  name: string;
  mime: string | null;
  size: number | null;
  page_count: number | null;
  ocr_used: boolean;
}
export interface CreatedEntity {
  type: string;
  id: string;
}
export interface DropResult {
  id: string;
  drop_id: string;
  item_id: string | null;
  destination: Destination;
  title: string;
  payload: Record<string, any>;
  confidence: number;
  included: boolean;
  ord: number;
  created_entities: CreatedEntity[];
  filed_note: string | null;
  undone_at: string | null;
}

export const CONFIDENT_AT = 0.75;
export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const ACCEPT = "application/pdf,.pdf,image/*,.heic,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.csv,text/csv,.txt,.md,text/plain,text/markdown";

const db = () => supabase!;
const URL_ONLY = /^\s*(https?:\/\/\S+\s*)+$/i;

/** صورة كبيرة (أو HEIC بسفاري) → JPEG أصغر قبل الرفع. لو ما قدر المتصفح يقراها نرفعها مثل ما هي */
export async function shrinkImage(file: File, maxSide = 2000, maxBytes = 1_500_000): Promise<File> {
  const heic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  if (!file.type.startsWith("image/") && !heic) return file;
  if (!heic && file.size <= maxBytes) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

const extOf = (name: string) => (/\.([a-z0-9]{1,6})$/i.exec(name)?.[1] ?? "bin").toLowerCase();

export interface DropInput {
  files?: File[];
  text?: string;
  source: DropSource;
}

export type StartResult = { id: string } | { error: DropError | "no_team" | "not_allowed" | "empty"; message: string };

/** يبدأ رمية: سطر بـ drops، يرفع الملفات لحاوية drops ({team}/{drop}/…)، ويسجّل العناصر */
export async function startDrop(teamId: string, userId: string, input: DropInput): Promise<StartResult> {
  if (!isSupabaseConfigured) return { error: "not_allowed", message: tr("هذي الميزة تشتغل بحساب فريقكم الحقيقي.") };
  const files = (input.files ?? []).slice(0, MAX_FILES);
  const text = (input.text ?? "").trim();
  if (!files.length && text.length < 2) return { error: "empty", message: tr("ارموا ملف أو الصقوا نص أول.") };
  if ((input.files?.length ?? 0) > MAX_FILES || files.some((f) => f.size > MAX_FILE_BYTES)) return { error: "too_large", message: tr("الحد 10 ملفات و25 ميغا للملف.") };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await queueOffline({ files, text, source: input.source });
    return { error: "offline", message: tr("حفظناه عندكم، وأول ما يرجع النت نقراه لحاله.") };
  }

  const { data: drop, error } = await db().from("drops").insert({ team_id: teamId, user_id: userId, source: input.source, status: "uploading" }).select("id").single();
  if (error || !drop) return { error: "failed", message: tr("ما قدرنا نبدأ الرمية — جرّبوا مرة ثانية.") };
  const dropId = drop.id as string;

  const rows: Record<string, unknown>[] = [];
  for (const [i, raw] of files.entries()) {
    const f = await shrinkImage(raw);
    const path = `${teamId}/${dropId}/${i + 1}-${Date.now().toString(36)}.${extOf(f.name)}`;
    const up = await db().storage.from("drops").upload(path, f, { contentType: f.type || "application/octet-stream", upsert: false });
    if (up.error) return { error: "failed", message: tr("ما قدرنا نرفع «{0}» — جرّبوا مرة ثانية.", raw.name) };
    rows.push({ drop_id: dropId, team_id: teamId, kind: "file", name: raw.name, storage_path: path, mime: f.type || null, size: f.size });
  }
  if (text) {
    if (URL_ONLY.test(text)) for (const u of text.split(/\s+/).filter(Boolean).slice(0, 3)) rows.push({ drop_id: dropId, team_id: teamId, kind: "url", name: u, extracted_text: u });
    else rows.push({ drop_id: dropId, team_id: teamId, kind: "text", name: text.split("\n")[0].slice(0, 80), extracted_text: text.slice(0, 40000), size: text.length });
  }
  const ins = await db().from("drop_items").insert(rows);
  if (ins.error) return { error: "failed", message: tr("ما قدرنا نبدأ الرمية — جرّبوا مرة ثانية.") };
  track("drop_started", { source: input.source, files: files.length, text: text.length > 0 });
  return { id: dropId };
}

/** يطلب القراءة. الحالة والنتايج توصل كمان بالتحديث المباشر */
export async function readDrop(dropId: string): Promise<{ status?: string; error_code?: DropError; message?: string; notes?: string[] }> {
  const { data, error } = await db().functions.invoke("drop-read", { body: { dropId } });
  if (error && !data) return { status: "failed", error_code: "failed", message: tr("القراءة مو متاحة الحين — جرّبوا بعد شوي.") };
  const out = (data ?? {}) as { status?: string; error_code?: DropError; message?: string; notes?: string[] };
  if (!out.error_code) track("drop_read", { status: out.status ?? "" });
  return out;
}

export async function fetchDrop(dropId: string) {
  const [d, items, results] = await Promise.all([
    db().from("drops").select("id, status, error_code, source, summary, created_at, filed_at").eq("id", dropId).maybeSingle(),
    db().from("drop_items").select("id, kind, name, mime, size, page_count, ocr_used").eq("drop_id", dropId).order("created_at"),
    db().from("drop_results").select("id, drop_id, item_id, destination, title, payload, confidence, included, ord, created_entities, filed_note, undone_at").eq("drop_id", dropId).order("ord"),
  ]);
  return { drop: (d.data as DropRow | null) ?? null, items: (items.data as DropItemRow[] | null) ?? [], results: (results.data as DropResult[] | null) ?? [] };
}

export async function updateResult(id: string, patch: Partial<Pick<DropResult, "included" | "destination" | "payload" | "title" | "confidence">>) {
  const { error } = await db().from("drop_results").update(patch).eq("id", id);
  return { error: error ? tr("ما انحفظ التعديل — جرّبوا مرة ثانية.") : null };
}

const RPC_ERR: Record<string, string> = {
  drop_not_found: tr("ما لقينا الرمية."),
  drop_not_ready: tr("الرمية انحفظت قبل، أو لسا ما خلصت قراءتها."),
};
const rpcMessage = (m?: string) => Object.entries(RPC_ERR).find(([k]) => m?.includes(k))?.[1] ?? tr("ما انحفظت — جرّبوا مرة ثانية.");

export async function fileDrop(dropId: string): Promise<{ created?: number; error?: string }> {
  const { data, error } = await db().rpc("drop_file", { p_drop_id: dropId });
  if (error) return { error: rpcMessage(error.message) };
  return { created: (data as { created: number }).created };
}

export interface UndoKept {
  result: string;
  type: string;
  id?: string;
  reason: "edited" | "no_permission";
}
export async function undoDrop(dropId: string, resultId?: string): Promise<{ removed?: number; kept?: UndoKept[]; error?: string }> {
  const { data, error } = await db().rpc("drop_undo", { p_drop_id: dropId, p_result_id: resultId ?? null });
  if (error) return { error: rpcMessage(error.message) };
  return data as { removed: number; kept: UndoKept[] };
}

/** رسالة التراجع: اللي انشال، واللي بقى ولماذا (المرسَل للمشرف/ة ما ينسحب) */
export function undoMessage(r: { removed?: number; kept?: UndoKept[] }): string {
  const kept = r.kept ?? [];
  const sent = kept.filter((k) => k.reason === "no_permission" && /supervisor_messages|decision_requests/.test(k.type)).length;
  const edited = kept.filter((k) => k.reason === "edited").length;
  const other = kept.length - sent - edited;
  const parts = [tr("شلنا {0}", r.removed ?? 0)];
  if (edited) parts.push(tr("وخلّينا {0} أحد عدّله بعد الرمية", edited));
  if (sent) parts.push(tr("والسؤال انرسل للمشرف/ة وما ينسحب"));
  if (other) parts.push(tr("و{0} ما عندكم صلاحية تشيلونه (القائد يقدر)", other));
  return parts.join("، ") + ".";
}

export interface RecentDrop extends DropRow {
  items: { name: string; mime: string | null; kind: string }[];
  results: { destination: Destination; included: boolean; created: number; undone: boolean; tasks: number }[];
}
export async function listRecent(limit = 6): Promise<RecentDrop[]> {
  const { data } = await db()
    .from("drops")
    .select("id, status, error_code, source, summary, created_at, filed_at, drop_items(name, mime, kind), drop_results(destination, included, created_entities, undone_at, payload)")
    .in("status", ["ready", "filed", "undone"])
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as any[]).map((d) => ({
    ...d,
    items: d.drop_items ?? [],
    results: (d.drop_results ?? []).map((r: any) => ({ destination: r.destination, included: r.included, created: (r.created_entities ?? []).length, undone: !!r.undone_at, tasks: Array.isArray(r.payload?.tasks) ? r.payload.tasks.length : 0 })),
  }));
}

// ───────── الأماكن ─────────
export const DESTS: Destination[] = ["library", "tasks", "minutes", "supervisor_note", "supervisor_question", "proposal", "dataset", "tools", "ethics", "calendar", "files"];
export const DEST_LABEL: Record<Destination, string> = {
  library: tr("مكتبة الأدلة + جدول الأدبيات"),
  tasks: tr("مهامي"),
  minutes: tr("محضر اجتماع"),
  supervisor_note: tr("ملاحظات المشرف/ة"),
  supervisor_question: tr("سؤال للمشرف/ة"),
  proposal: tr("المقترح"),
  dataset: tr("أجمع وأحلّل"),
  tools: tr("مكتبة أدوات القياس"),
  ethics: tr("الموافقة الأخلاقية"),
  calendar: tr("التقويم"),
  files: tr("الملفات"),
};
/** «انحطّت في …» */
/** اسم قصير للعدّ («1 دراسة»، «ملاحظة + 2 مهام») */
export const DEST_NOUN: Record<Destination, string> = {
  library: tr("دراسة"),
  tasks: tr("مهام"),
  minutes: tr("محضر"),
  supervisor_note: tr("ملاحظة"),
  supervisor_question: tr("سؤال"),
  proposal: tr("مسودة"),
  dataset: tr("بيانات"),
  tools: tr("أداة"),
  ethics: tr("موافقة"),
  calendar: tr("موعد"),
  files: tr("ملف"),
};

export const DEST_PLACE: Record<Destination, string> = {
  library: tr("مكتبة الأدلة"),
  tasks: tr("مهامي"),
  minutes: tr("الاجتماعات"),
  supervisor_note: tr("ملاحظات المشرف/ة"),
  supervisor_question: tr("صفحة المشرف/ة"),
  proposal: tr("المقترح"),
  dataset: tr("التحليل"),
  tools: tr("مكتبة أدوات القياس"),
  ethics: tr("الموافقة الأخلاقية"),
  calendar: tr("التقويم"),
  files: tr("الملفات"),
};

export const SECTION_LABEL: Record<string, string> = {
  background: tr("الخلفية"),
  problem: tr("المشكلة"),
  gap: tr("الفجوة"),
  aim: tr("الهدف"),
  questions: tr("أسئلة البحث"),
  "literature-review": tr("مراجعة الأدبيات"),
  methodology: tr("المنهجية"),
  ethics: tr("الأخلاقيات"),
  other: tr("عام"),
};

/** رابط مباشر للشي اللي انخلق */
export function deepLink(r: Pick<DropResult, "destination" | "payload" | "created_entities">): string {
  const first = r.created_entities?.[0];
  switch (r.destination) {
    case "library":
      return "/evidence";
    case "tasks":
      return first && r.created_entities.length === 1 ? `/tasks?task=${first.id}` : "/tasks";
    case "minutes":
      return "/meeting-minutes";
    case "supervisor_note":
      return "/feedback";
    case "supervisor_question":
      return "/meeting-minutes?tab=decisions";
    case "proposal":
      return r.payload?.section === "methodology" ? "/methodology" : `/proposal?section=${r.payload?.section ?? "background"}`;
    case "dataset":
      return "/stats";
    case "tools":
      return "/tools";
    case "ethics":
      return "/ethical-approval";
    case "calendar":
      return "/calendar";
    default:
      return "/files";
  }
}

/** عدد الأشياء داخل النتيجة (مهام ×3، مواعيد، ملاحظات) */
export function countOf(r: Pick<DropResult, "destination" | "payload">): number {
  if (r.destination === "tasks") return r.payload?.tasks?.length ?? 1;
  if (r.destination === "calendar") return r.payload?.events?.length ?? 1;
  if (r.destination === "supervisor_note") return r.payload?.comments?.length ?? 1;
  return 1;
}

/** «غيّروا المكان»: نحوّل البيانات للمكان الجديد. null = ما ينفع (مثلاً موعد بدون تاريخ) */
export function retarget(r: Pick<DropResult, "destination" | "payload" | "title">, to: Destination): Record<string, any> | null {
  const p = r.payload ?? {};
  const text: string = p.text || p.discussion || p.question || p.finding || (p.comments ?? []).map((c: { text: string }) => c.text).join("\n") || r.title;
  const firstLine = (text || r.title).split("\n")[0].slice(0, 200);
  if (to === r.destination) return p;
  switch (to) {
    case "tasks": {
      const lines: string[] = p.tasks?.map((t: { title: string }) => t.title) ?? p.action_items ?? (p.comments ?? []).map((c: { text: string }) => c.text);
      const list = (lines?.length ? lines : [r.title]).filter(Boolean).slice(0, 20);
      return { tasks: list.map((title) => ({ title: String(title).slice(0, 200), note: "", owner_id: null, owner_name: "", due: "", place: "", target_count: null })) };
    }
    case "supervisor_note":
      return { comments: [{ text: firstLine || r.title, section: "other" }] };
    case "supervisor_question":
      return { question: (p.question || r.title).slice(0, 1500), options: [] };
    case "minutes":
      return { meeting_date: "", agenda: "", discussion: text.slice(0, 4000), decisions: "", action_items: p.tasks?.map((t: { title: string }) => t.title) ?? [] };
    case "library":
      return { title: p.title || r.title, authors: p.authors ?? "", year: p.year ?? null, country: "", aim: "", design: "", sample: "", data_collection: "", finding: "", relevance: "", section: "literature-review", theme: "عام", url: p.url ?? "" };
    case "tools":
      return { tool_name: p.tool_name || r.title, items_count: "", dimensions: "", scale: "" };
    case "files":
      return { name: p.name || r.title, mime: p.mime || "text/plain", size: p.size ?? 0, storage_path: p.storage_path ?? null, why: "" };
    case "proposal":
      return text && text.length >= 40 ? { section: "background", heading: "", text } : null;
    case "calendar":
      return p.events?.length ? p : null;
    case "ethics":
      return p.approval_number || p.approval_date ? p : null;
    case "dataset":
      return p.columns?.length ? p : null;
  }
  return null;
}

// ───────── كشف النص الملصوق (شرائح حية) ─────────
export function detectPaste(text: string): { hint: string | null; lines: number } {
  const t = text.trim();
  const lines = t ? t.split(/\n/).filter((l) => l.trim()).length : 0;
  if (!t) return { hint: null, lines };
  let hint: string | null = null;
  if (/10\.\d{4,9}\/|pubmed|doi\.org/i.test(t)) hint = tr("شكله رابط دراسة");
  else if (URL_ONLY.test(t)) hint = tr("رابط — نفتحه ونلخصه");
  else if (/اجتماع|محضر|قررنا|ناقشنا|حضر/.test(t)) hint = tr("شكله محضر اجتماع");
  else if (/د\.|دكتور|الدكتورة|المشرف/.test(t)) hint = tr("شكلها ملاحظة من المشرف/ة");
  else if (t.split("\n").filter((l) => /^\s*([-•*]|\d+[.)-])/.test(l)).length >= 2) hint = tr("شكلها قائمة مهام");
  return { hint, lines };
}

/** ملصق نوع الملف (PDF / IMG / DOC …) */
export function fileTag(name: string, mime?: string | null): string {
  const m = mime ?? "";
  if (/pdf/i.test(m) || /\.pdf$/i.test(name)) return "PDF";
  if (/^image\//.test(m) || /\.(jpe?g|png|webp|gif|heic)$/i.test(name)) return /واتساب|whatsapp/i.test(name) ? "WA" : "IMG";
  if (/word/i.test(m) || /\.docx?$/i.test(name)) return "DOC";
  if (/sheet|csv/i.test(m) || /\.(xlsx|csv)$/i.test(name)) return "XLS";
  if (/^https?:/i.test(name)) return "URL";
  return "TXT";
}

// ───────── بدون نت: نحفظ الرمية بالجهاز ونقراها لما يرجع ─────────
const IDB = "wesync-drops";
interface Queued {
  id: string;
  at: number;
  source: DropSource;
  text: string;
  files: { name: string; type: string; blob: Blob }[];
}
function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(IDB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("queue", { keyPath: "id" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function queueOffline(q: { files: File[]; text: string; source: DropSource }) {
  try {
    const d = await idb();
    const item: Queued = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, at: Date.now(), source: q.source, text: q.text, files: q.files.map((f) => ({ name: f.name, type: f.type, blob: f })) };
    await new Promise<void>((res, rej) => {
      const tx = d.transaction("queue", "readwrite");
      tx.objectStore("queue").put(item);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch {
    // ما قدرنا نحفظ محليًا — الرسالة نفسها تطلب يعيدون لما يرجع النت
  }
}
async function takeQueued(): Promise<Queued[]> {
  try {
    const d = await idb();
    return await new Promise<Queued[]>((res, rej) => {
      const tx = d.transaction("queue", "readwrite");
      const store = tx.objectStore("queue");
      const all = store.getAll();
      all.onsuccess = () => {
        store.clear();
        res(all.result as Queued[]);
      };
      tx.onerror = () => rej(tx.error);
    });
  } catch {
    return [];
  }
}
/** أول ما يرجع النت: الرميات المحفوظة تنقرا لحالها (تطلع بـ«آخر اللي رميتوه» جاهزة للمراجعة) */
export async function flushOfflineQueue(teamId: string, userId: string): Promise<number> {
  if (!navigator.onLine) return 0;
  const list = await takeQueued();
  for (const q of list) {
    const files = q.files.map((f) => new File([f.blob], f.name, { type: f.type }));
    const r = await startDrop(teamId, userId, { files, text: q.text, source: q.source });
    if ("id" in r) void readDrop(r.id);
  }
  return list.length;
}

// ───────── المشاركة من تطبيق ثاني (share_target) ─────────
export interface SharedPayload {
  title: string;
  text: string;
  url: string;
  files: File[];
}
export async function takeShared(): Promise<SharedPayload | null> {
  try {
    const d = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("wesync-share", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("shared", { keyPath: "id" });
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return await new Promise<SharedPayload | null>((res) => {
      const tx = d.transaction("shared", "readwrite");
      const g = tx.objectStore("shared").get("last");
      g.onsuccess = () => {
        const v = g.result as { title?: string; text?: string; url?: string; files?: { name: string; type: string; blob: Blob }[] } | undefined;
        if (!v) return res(null);
        tx.objectStore("shared").delete("last");
        res({ title: v.title ?? "", text: v.text ?? "", url: v.url ?? "", files: (v.files ?? []).map((f) => new File([f.blob], f.name, { type: f.type })) });
      };
      g.onerror = () => res(null);
    });
  } catch {
    return null;
  }
}
