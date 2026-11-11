import { isSupabaseConfigured, supabase } from "./supabaseClient";
import { tr } from "./i18n";

/* «كلام الدكتورة يصير التزامات»: طلباتها من الفريق (from_supervisor) ووعودها لهم (to_team).
   تنقرا رسالتها تلقائيًا (commit-extract) وتطلع «مقترحة»، والقائد يعتمدها ← مهمة «من الدكتورة».
   لما تخلص المهمة يطلع لها إيصال (إيميل + كرت بصفحتها) وتضغط «تمام». */

export type CommitmentStatus = "proposed" | "approved" | "in_progress" | "done" | "dismissed";
export type Direction = "from_supervisor" | "to_team";

export interface Commitment {
  id: string;
  team_id: string;
  direction: Direction;
  source_message_id: string | null;
  title: string;
  quote: string;
  assignee_id: string | null;
  due_at: string | null;
  due_label: string;
  recurring_rule: string | null;
  status: CommitmentStatus;
  important: boolean;
  created_task_id: string | null;
  done_at: string | null;
  proof_name: string | null;
  receipt_sent_at: string | null;
  receipt_ack_at: string | null;
  created_at: string;
}

const db = () => supabase!;
const rpcErr = (m: string) =>
  /leader_only/.test(m) ? tr("الاعتماد للقائد بس.") : /read_only/.test(m) ? tr("الاشتراك منتهي — الفريق يقدر يشوف بس.") : tr("ما انحفظ — جرّبوا مرة ثانية.");

export async function listCommitments(): Promise<Commitment[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await db().from("commitments").select("*").neq("status", "dismissed").order("created_at", { ascending: false }).limit(200);
  return (data ?? []) as Commitment[];
}

export async function approveCommitment(id: string, patch: { title?: string; assignee?: string | null; due?: string | null } = {}) {
  const { data, error } = await db().rpc("approve_commitment", { p_id: id, p_title: patch.title ?? null, p_assignee: patch.assignee ?? null, p_due: patch.due ?? null });
  return error ? { error: rpcErr(error.message), taskId: null } : { error: null, taskId: data as string };
}
export async function dismissCommitment(id: string) {
  const { error } = await db().rpc("dismiss_commitment", { p_id: id });
  return { error: error ? rpcErr(error.message) : null };
}
export async function setCommitmentImportant(id: string, important: boolean) {
  const { error } = await db().rpc("set_commitment_important", { p_id: id, p_important: important });
  return { error: error ? rpcErr(error.message) : null };
}

/** ملف الإثبات للإيصال: يرتفع لحاوية drops الخاصة تحت مجلد الفريق */
export async function attachProof(teamId: string, id: string, file: File) {
  if (file.size > 25 * 1024 * 1024) return { error: tr("الحد ٢٥ ميغا للملف.") };
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  const path = `${teamId}/receipts/${id}/${Date.now().toString(36)}.${ext}`;
  const up = await db().storage.from("drops").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
  if (up.error) return { error: tr("ما قدرنا نرفع الملف — جرّبوا مرة ثانية.") };
  const { error } = await db().rpc("attach_commitment_proof", { p_id: id, p_path: path, p_name: file.name.slice(0, 200) });
  return { error: error ? rpcErr(error.message) : null };
}

// ───────── صفحة الدكتورة (برمز رابطها، بدون حساب) ─────────
export interface SupItem {
  id: string;
  direction: Direction;
  title: string;
  quote: string;
  status: CommitmentStatus;
  important: boolean;
  due_at: string | null;
  due_label: string;
  done_at: string | null;
  created_at: string;
  assignee: string | null;
  task_due: string | null;
  task_status: string | null;
  proof_name: string | null;
  has_proof: boolean;
  receipt_sent_at: string | null;
  receipt_ack_at: string | null;
  receipt_note: string | null;
}
export interface SupImpact {
  id: string;
  section_key: string;
  label: string;
  body: string;
  quote: string;
  before: string;
  after: string;
  created_at: string;
}

export async function supervisorCommitments(token: string): Promise<{ items: SupItem[]; impacts: SupImpact[] } | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await db().rpc("supervisor_commitments", { p_token: token });
  if (error || !data) return null;
  const d = data as { items?: SupItem[]; impacts?: SupImpact[] };
  return { items: d.items ?? [], impacts: d.impacts ?? [] };
}
export async function supervisorAck(token: string, id: string, note?: string, name?: string) {
  const { error } = await db().rpc("supervisor_ack_receipt", { p_token: token, p_id: id, p_note: note ?? null, p_name: name ?? "" });
  return { error: error ? tr("ما انحفظ — جرّبوا مرة ثانية.") : null };
}
export async function supervisorSetImportant(token: string, id: string, important: boolean) {
  const { error } = await db().rpc("supervisor_set_important", { p_token: token, p_id: id, p_important: important });
  return { error: error ? tr("ما انحفظ — جرّبوا مرة ثانية.") : null };
}
export async function supervisorFulfil(token: string, id: string) {
  const { error } = await db().rpc("supervisor_fulfil_promise", { p_token: token, p_id: id });
  return { error: error ? tr("ما انحفظ — جرّبوا مرة ثانية.") : null };
}
export async function receiptFileUrl(token: string, id: string): Promise<string | null> {
  const { data } = await db().functions.invoke("supervisor-email", { body: { action: "receipt_file", token, commitmentId: id } });
  return (data as { url?: string } | null)?.url ?? null;
}

// ───────── عرض ─────────
/** حالة الطلب كما تشوفها الدكتورة والفريق */
export function statusLabel(c: Pick<Commitment, "status" | "receipt_sent_at" | "receipt_ack_at" | "direction">): { text: string; tone: "muted" | "warm" | "gold" } {
  if (c.direction === "to_team") return c.status === "done" ? { text: tr("تمّ ✓"), tone: "gold" } : { text: "", tone: "muted" };
  if (c.status === "proposed") return { text: tr("ينتظر اعتماد"), tone: "muted" };
  if (c.status === "approved") return { text: tr("ينتظر"), tone: "muted" };
  if (c.status === "in_progress") return { text: tr("قيد التنفيذ"), tone: "warm" };
  if (c.status === "done") return { text: c.receipt_ack_at ? tr("خلص · تمام ✓") : c.receipt_sent_at ? tr("خلص · وصلها الإيصال") : tr("خلص"), tone: "gold" };
  return { text: "", tone: "muted" };
}

/** «قبل الموعد بـ ١٩ ساعة» / «بعد الموعد بـ يومين» — الموعد نهاية يوم الاستحقاق بتوقيت الرياض */
export function timingLabel(doneAt: string | null, dueDate: string | null): string {
  if (!doneAt || !dueDate) return "";
  const end = Date.parse(`${dueDate.slice(0, 10)}T23:59:00+03:00`);
  const h = Math.round((end - Date.parse(doneAt)) / 3600e3);
  const span = (n: number) => (n >= 48 ? tr("{0} أيام", Math.round(n / 24)) : tr("{0} ساعة", n));
  if (h >= 1) return tr("قبل الموعد بـ {0}", span(h));
  if (h <= -1) return tr("بعد الموعد بـ {0}", span(-h));
  return tr("بالموعد");
}

/** «الأحد · متبقي يومين» للوعود */
export function remainingLabel(dueAt: string | null, now = Date.now()): string {
  if (!dueAt) return "";
  const days = Math.ceil((Date.parse(dueAt) - now) / 864e5);
  if (days < 0) return tr("فات موعده");
  if (days === 0) return tr("اليوم");
  if (days === 1) return tr("بكرة");
  if (days === 2) return tr("متبقي يومين");
  return tr("متبقي {0} أيام", days);
}

export type DiffPart = { t: string; kind: "same" | "del" | "add" };

/** مقارنة كلمة بكلمة (أطول تسلسل مشترك) — «قبل» فيها المحذوف و«بعد» فيها المضاف.
    نقص النص لحول الفقرة اللي تغيرت عشان ما نعرض القسم كامل */
export function wordDiff(before: string, after: string): { before: DiffPart[]; after: DiffPart[] } {
  const a = before.split(/(\s+)/).filter((x) => x !== "");
  const b = after.split(/(\s+)/).filter((x) => x !== "");
  // حد أعلى للحجم (الأقسام قصيرة عادة)
  const A = a.slice(0, 1500);
  const B = b.slice(0, 1500);
  const n = A.length;
  const m = B.length;
  const L: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const bo: DiffPart[] = [];
  const ao: DiffPart[] = [];
  const push = (arr: DiffPart[], t: string, kind: DiffPart["kind"]) => {
    const last = arr[arr.length - 1];
    if (last && last.kind === kind) last.t += t;
    else arr.push({ t, kind });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      push(bo, A[i], "same");
      push(ao, B[j], "same");
      i++;
      j++;
    } else if (L[i + 1][j] >= L[i][j + 1]) push(bo, A[i++], "del");
    else push(ao, B[j++], "add");
  }
  while (i < n) push(bo, A[i++], "del");
  while (j < m) push(ao, B[j++], "add");
  return { before: trimSame(bo), after: trimSame(ao) };
}

/** الأجزاء المتشابهة الطويلة تنقص لـ «…» مع ٦ كلمات حول التغيير */
function trimSame(parts: DiffPart[]): DiffPart[] {
  return parts.map((p, k) => {
    if (p.kind !== "same") return p;
    const words = p.t.split(/(\s+)/);
    if (words.length <= 24) return p;
    const head = k === 0 ? [] : words.slice(0, 12);
    const tail = k === parts.length - 1 ? [] : words.slice(-12);
    return { ...p, t: `${head.join("")}${k === 0 ? "… " : " … "}${tail.join("")}` };
  });
}
