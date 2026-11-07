import { isSupabaseConfigured, supabase } from "./supabaseClient";
import { MAX_PAPER_BYTES } from "../hooks/useProjectAgent";
import { tr } from "./i18n";

/* «ارموا أي شي»: الوكيل (drop-sort) يفهم الملف أو النص ويرجّع مقترحات، والواجهة تحفظها بعد موافقتهم. */

export type SortItem =
  | { kind: "paper" }
  | { kind: "task"; title: string; assigneeId: string | null; due: string; place: string }
  | { kind: "minutes"; meetingDate: string; agenda: string; discussion: string; decisions: string }
  | { kind: "supervisor_note"; comment: string; section: string }
  | { kind: "section_text"; section: string; text: string }
  | { kind: "event"; title: string; date: string; time: string }
  | { kind: "link"; url: string; label: string }
  | { kind: "other"; why: string };

export interface SortResult {
  summary: string;
  items: SortItem[];
}

export interface DropInput {
  /** اسم يطلع للمستخدم */
  name: string;
  /** PDF جاهز (أو صور اتحولت PDF) */
  pdf?: File;
  /** الملفات الأصلية (للدراسة: مساعد القراءة يقراها بالتفصيل) */
  files?: File[];
  text?: string;
}

const isPdf = (f: File) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
const isText = (f: File) => /^text\//.test(f.type) || /\.(txt|md|csv|tsv|json)$/i.test(f.name);

/** يحوّل الملفات المرمية لمدخلات: كل PDF لحاله، الصور كلها PDF واحد، والنصوص تنقرى نص */
export async function toInputs(files: File[]): Promise<{ inputs: DropInput[]; rejected: string[] }> {
  const inputs: DropInput[] = [];
  const rejected: string[] = [];
  for (const f of files.filter(isPdf)) {
    if (f.size > MAX_PAPER_BYTES) rejected.push(tr("«{0}» كبير (الحد ٤ ميغا).", f.name));
    else inputs.push({ name: f.name, pdf: f, files: [f] });
  }
  const images = files.filter((f) => f.type.startsWith("image/"));
  if (images.length) {
    try {
      const { imagesToPdf } = await import("./imagesToPdf");
      const pdf = await imagesToPdf(images.slice(0, 10), MAX_PAPER_BYTES, "drop.pdf");
      inputs.push({ name: images.length === 1 ? images[0].name : tr("{0} صور", images.length), pdf, files: images.slice(0, 10) });
    } catch {
      rejected.push(tr("ما قدرنا نجهّز الصور — جرّبوا صور أوضح."));
    }
  }
  for (const f of files.filter(isText)) inputs.push({ name: f.name, text: (await f.text()).slice(0, 20000) });
  for (const f of files) {
    if (!isPdf(f) && !f.type.startsWith("image/") && !isText(f)) rejected.push(/\.docx?$/i.test(f.name) ? tr("«{0}»: ملفات Word احفظوها PDF أو الصقوا نصها.", f.name) : tr("«{0}»: نوع ما نقراه للحين.", f.name));
  }
  return { inputs, rejected };
}

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

export async function sortDrop(input: DropInput): Promise<{ data?: SortResult; message?: string }> {
  if (!isSupabaseConfigured) return { message: tr("هذي الميزة تشتغل بحساب فريقكم الحقيقي.") };
  const body: Record<string, unknown> = { fileName: input.name };
  if (input.pdf) body.pdfBase64 = await toBase64(input.pdf);
  if (input.text) body.text = input.text;
  const { data, error } = await supabase!.functions.invoke("drop-sort", { body });
  const reply = data as (SortResult & { error?: string; limitReached?: boolean; message?: string }) | null;
  if (reply?.limitReached) return { message: reply.message ?? tr("وصلتوا للحد الشهري.") };
  if (reply?.error) return { message: reply.error };
  if (reply?.items) return { data: { summary: reply.summary ?? "", items: reply.items } };
  return { message: error ? tr("الفرز مو متاح الحين — جرّبوا بعد شوي.") : tr("ما وصل الرد — جرّبوا مرة ثانية.") };
}
