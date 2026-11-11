// Supabase Edge Function — «ارموا أي شي» (drop-read): يقرا رمية كاملة (ملفات بحاوية drops + نصوص + روابط)،
// يصنّفها بنداء ذكاء واحد بمخطط JSON صارم، ويكتب النتايج بـ drop_results. ما يحفظ شي بأماكن الفريق:
// الحفظ بـ drop_file() بعد موافقتهم (بصلاحياتهم هم). الحالة تنتقل عبر Realtime: reading → ready / failed.
// المتغيرات: ANTHROPIC_API_KEY.
import Anthropic from "npm:@anthropic-ai/sdk@^0.68.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "npm:unpdf@0.12.1";
import {
  csvToTable,
  detectKind,
  docxToText,
  imageMediaType,
  inputHash,
  itemBlock,
  type Ctx,
  type ItemCtx,
  meanConfidence,
  type Member,
  monthStartIso,
  normalizeResults,
  pdfPageCount,
  RESULT_SCHEMA,
  type ResultRow,
  riyadhToday,
  sha256Hex,
  SYSTEM,
  xlsxToTable,
  looksScanned,
  arabicLayerBroken,
} from "./lib.ts";
import { fetchLink, URL_RE } from "./links.ts";
import { ESCALATE_BELOW, MAX_DROP_CHARS, MAX_FILE_BYTES, MAX_FILES_PER_DROP, MAX_IMAGE_BYTES, MAX_ATTACH_BYTES, MAX_LINKS, MAX_SCANNED_PDF_BYTES, MIN_TEXT_PER_PAGE, MODEL_FAST, MODEL_STRONG, monthlyLimit } from "./limits.ts";

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n).trimEnd()}…`);

type ErrorCode = "unreadable" | "unsupported" | "nothing_found" | "ai_limit" | "too_large" | "failed";
const MESSAGES: Record<ErrorCode, string> = {
  unreadable: "ما قدرنا نقرا الملف — جرّبوا صورة أوضح أو الصقوا النص.",
  unsupported: "نوع الملف ما نقراه للحين. ملفات Word القديمة (.doc) احفظوها .docx أو PDF.",
  nothing_found: "قرينا الرمية بس ما لقينا شي ينحط تلقائيًا.",
  ai_limit: "وصلتوا لحد القراءات هالشهر — يتجدد أول الشهر الجاي.",
  too_large: "الرمية كبيرة: الحد ١٠ ملفات و٢٥ ميغا للملف.",
  failed: "صار خطأ غير متوقع، جرّبوا مرة ثانية.",
};

const b64 = (bytes: Uint8Array) => {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

async function pdfText(bytes: Uint8Array): Promise<{ text: string; pages: number }> {
  try {
    const doc = await getDocumentProxy(new Uint8Array(bytes));
    const { totalPages, text } = await extractText(doc, { mergePages: true });
    return { text: String(text ?? ""), pages: totalPages };
  } catch {
    return { text: "", pages: pdfPageCount(bytes) };
  }
}

interface DbItem {
  id: string;
  kind: "file" | "text" | "url";
  name: string;
  storage_path: string | null;
  mime: string | null;
  size: number | null;
  extracted_text: string | null;
  created_at: string;
}

type Block = Anthropic.ContentBlockParam;
type Classified = { rows: ResultRow[]; summary: string };

async function classify(model: string, content: Block[], ctx: Ctx, usage: { in: number; out: number }): Promise<Classified | null> {
  try {
    const res = await anthropic.messages.create({
      model,
      max_tokens: 8000,
      system: SYSTEM,
      ...({
        ...(model === MODEL_FAST ? { thinking: { type: "disabled" } } : {}),
        output_config: { effort: "low", format: { type: "json_schema", schema: RESULT_SCHEMA } },
      } as Record<string, unknown>),
      messages: [{ role: "user", content }],
    });
    usage.in += res.usage?.input_tokens ?? 0;
    usage.out += res.usage?.output_tokens ?? 0;
    if (res.stop_reason !== "end_turn") return null;
    const raw = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
    const parsed = JSON.parse(raw);
    return { rows: normalizeResults(parsed, ctx), summary: typeof parsed.summary === "string" ? clip(parsed.summary.trim(), 200) : "" };
  } catch (e) {
    console.error(`drop-read ${model}:`, e instanceof Error ? e.message : e);
    return null;
  }
}

/** الأرخص أول؛ الأكبر بس لو الرد مو سليم أو الثقة أقل من الحد */
async function classifyWithEscalation(content: Block[], ctx: Ctx, forceStrong = false) {
  const usage = { in: 0, out: 0 };
  let used = forceStrong ? MODEL_STRONG : MODEL_FAST;
  let out = await classify(used, content, ctx, usage);
  if (!forceStrong && (!out || !out.rows.length || meanConfidence(out.rows) < ESCALATE_BELOW)) {
    const strong = await classify(MODEL_STRONG, content, ctx, usage);
    if (strong && strong.rows.length && (!out || !out.rows.length || meanConfidence(strong.rows) >= meanConfidence(out.rows))) {
      out = strong;
      used = MODEL_STRONG;
    }
  }
  return { out, used, inTok: usage.in, outTok: usage.out };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  let dropId = "";
  const fail = async (code: ErrorCode, extra: Record<string, unknown> = {}) => {
    if (dropId) await admin.from("drops").update({ status: "failed", error_code: code }).eq("id", dropId);
    return json({ status: "failed", error_code: code, message: MESSAGES[code], ...extra });
  };
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return json({ error: "غير مصرح — سجّلوا دخولكم أول" }, 401);
    const { data: profile } = await db.from("profiles").select("team_id").eq("id", user.id).single();
    const teamId = profile?.team_id as string | undefined;
    if (!teamId) return json({ error: "ما لقينا فريقكم" });

    const body = await req.json().catch(() => ({}));
    const id = typeof body.dropId === "string" ? body.dropId : "";
    const { data: drop } = await admin.from("drops").select("id, team_id, user_id, status").eq("id", id).maybeSingle();
    if (!drop || drop.team_id !== teamId) return json({ error: "ما لقينا الرمية" }, 404);
    if (drop.status !== "uploading" && drop.status !== "failed") return json({ status: drop.status });
    // قفل بسيط: لو انضغط مرتين، القراءة الثانية ترجع بدون ما تعيد الشغل
    const { data: claimed } = await admin.from("drops").update({ status: "reading", error_code: null }).eq("id", drop.id).in("status", ["uploading", "failed"]).select("id");
    if (!claimed?.length) return json({ status: "reading" });
    dropId = drop.id;
    // إعادة محاولة: نشيل أي نتايج ناقصة من المحاولة اللي قبل
    await admin.from("drop_results").delete().eq("drop_id", dropId);

    const { data: rows } = await admin.from("drop_items").select("id, kind, name, storage_path, mime, size, extracted_text, created_at").eq("drop_id", dropId).order("created_at");
    const dbItems = (rows ?? []) as DbItem[];
    if (!dbItems.length) return fail("nothing_found");
    if (dbItems.filter((i) => i.kind === "file").length > MAX_FILES_PER_DROP || dbItems.some((i) => (i.size ?? 0) > MAX_FILE_BYTES)) return fail("too_large");

    // ── ١) القراءة ──
    const items: ItemCtx[] = [];
    const attachments: Block[] = [];
    const hashParts: string[] = [];
    const notes: string[] = [];
    let unsupported = 0;
    let totalChars = 0;
    let attachBytes = 0;
    const fits = (n: number) => {
      if (attachBytes + n > MAX_ATTACH_BYTES) return false;
      attachBytes += n;
      return true;
    };
    const meta = new Map<string, { attached: boolean; pages: number | null }>();

    for (const [n, it] of dbItems.entries()) {
      const ctx: ItemCtx = { index: n + 1, id: it.id, kind: it.kind, name: it.name || "", mime: it.mime ?? "", size: it.size ?? 0, storagePath: it.storage_path, fileKind: it.kind === "file" ? "unsupported" : it.kind, text: "" };
      const update: Record<string, unknown> = {};
      let attached = false;
      let pages: number | null = null;

      if (it.kind === "text") {
        ctx.text = clip(String(it.extracted_text ?? "").trim(), 40000);
        const urls = [...new Set((ctx.text.match(URL_RE) ?? []).map((u) => u.replace(/[).,،؛]+$/, "")))].slice(0, MAX_LINKS);
        const fetched = await Promise.all(urls.map(fetchLink));
        for (const f of fetched) ctx.text += f.failed ? `\n\nFETCHED ${f.url}: FETCH FAILED` : `\n\nFETCHED ${f.url}:\n${f.text ?? "(PDF attached)"}`;
        const pdf = fetched.find((f) => f.pdf)?.pdf;
        if (pdf && fits(pdf.length * 0.75)) {
          attachments.push({ type: "text", text: `ITEM ${ctx.index} — linked PDF:` }, { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf } });
          attached = true;
        }
        hashParts.push(await sha256Hex(`text:${it.extracted_text ?? ""}`));
      } else if (it.kind === "url") {
        const url = String(it.extracted_text || it.name).trim();
        ctx.url = url;
        ctx.name = url;
        const f = await fetchLink(url);
        ctx.text = f.failed ? "FETCH FAILED" : f.text ?? "";
        if (f.failed) notes.push(`ما قدرنا نفتح الرابط (${clip(url, 80)}) — الموقع يمنع أو يحتاج اشتراك. ارفعوا الـ PDF بدالها.`);
        if (f.pdf && fits(f.pdf.length * 0.75)) {
          attachments.push({ type: "text", text: `ITEM ${ctx.index} — linked PDF:` }, { type: "document", source: { type: "base64", media_type: "application/pdf", data: f.pdf } });
          attached = true;
        }
        hashParts.push(await sha256Hex(`url:${url}`));
      } else {
        const path = it.storage_path ?? "";
        if (!path.startsWith(`${teamId}/${dropId}/`)) return fail("failed");
        const { data: blob } = await admin.storage.from("drops").download(path);
        if (!blob) return fail("unreadable");
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const sha = await sha256Hex(bytes);
        hashParts.push(sha);
        update.sha256 = sha;
        update.size = bytes.byteLength;
        ctx.size = bytes.byteLength;
        const kind = detectKind(ctx.name, ctx.mime);
        ctx.fileKind = kind.kind;

        // كاش القراءة: نفس الملف قريناه قبل بنفس الفريق
        const { data: prev } = await admin.from("drop_items").select("extracted_text, page_count, ocr_used").eq("team_id", teamId).eq("sha256", sha).not("extracted_text", "is", null).neq("id", it.id).limit(1).maybeSingle();

        if (kind.kind === "pdf") {
          const r = prev?.extracted_text != null && !prev.ocr_used ? { text: prev.extracted_text as string, pages: prev.page_count ?? pdfPageCount(bytes) } : await pdfText(bytes);
          const pageCount = r.pages || pdfPageCount(bytes);
          pages = pageCount;
          const scanned = looksScanned(r.text, pageCount, MIN_TEXT_PER_PAGE) || arabicLayerBroken(r.text);
          if (scanned) {
            if (bytes.byteLength > MAX_SCANNED_PDF_BYTES || !fits(bytes.byteLength)) {
              notes.push(`«${ctx.name}» ممسوح وكبير — قسّموه أو صوّروا الصفحات المهمة.`);
            } else {
              attachments.push({ type: "text", text: `ITEM ${ctx.index} — «${clip(ctx.name, 80)}»:` }, { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64(bytes) } });
              attached = true;
            }
          }
          // لو قرينا الصفحات صور ما نرسل النص المكسور معها
          ctx.text = scanned && attached ? "" : r.text;
          Object.assign(update, { page_count: pageCount, ocr_used: scanned, extracted_text: clip(r.text, 100000) });
        } else if (kind.kind === "image") {
          if (bytes.byteLength > MAX_IMAGE_BYTES || !fits(bytes.byteLength)) {
            notes.push(`«${ctx.name}» صورة كبيرة — صغّروها وارموها مرة ثانية.`);
          } else {
            attachments.push({ type: "text", text: `ITEM ${ctx.index} — photo «${clip(ctx.name, 80)}»:` }, { type: "image", source: { type: "base64", media_type: imageMediaType(ctx.name, ctx.mime), data: b64(bytes) } });
            attached = true;
          }
          pages = 1;
          Object.assign(update, { page_count: 1, ocr_used: true });
        } else if (kind.kind === "docx") {
          ctx.text = prev?.extracted_text ?? docxToText(bytes) ?? "";
          Object.assign(update, { extracted_text: clip(ctx.text, 100000) });
        } else if (kind.kind === "xlsx" || kind.kind === "csv") {
          ctx.table = kind.kind === "xlsx" ? xlsxToTable(bytes) : csvToTable(new TextDecoder().decode(bytes));
          ctx.text = ctx.table ? `${ctx.table.columns.join(" | ")}` : "";
          Object.assign(update, { extracted_text: ctx.table ? clip(JSON.stringify(ctx.table), 100000) : null });
        } else if (kind.kind === "text") {
          ctx.text = new TextDecoder().decode(bytes);
          Object.assign(update, { extracted_text: clip(ctx.text, 100000) });
        } else {
          unsupported++;
          notes.push(kind.reason === "heic" ? `«${ctx.name}»: صور HEIC حوّلوها JPG (أو صوّروها من الموقع).` : kind.reason === "word_old" ? `«${ctx.name}»: احفظوه .docx أو PDF.` : `«${ctx.name}»: نوع ما نقراه — بينحفظ بالملفات.`);
        }
        await admin.from("drop_items").update(update).eq("id", it.id);
      }
      ctx.text = clip(ctx.text, Math.max(0, MAX_DROP_CHARS - totalChars));
      totalChars += ctx.text.length;
      items.push(ctx);
      meta.set(ctx.id, { attached, pages });
    }

    const fileCount = dbItems.filter((i) => i.kind === "file").length;
    if (fileCount > 0 && unsupported === dbItems.length) return fail("unsupported", { notes });
    const readable = items.some((i) => i.text.replace(/\s+/g, "").length > 2 || i.table) || attachments.length > 0;
    if (!readable) return fail(unsupported ? "unsupported" : "unreadable", { notes });

    // ── ٢) الكاش: نفس الرمية بالضبط قريناها قبل ──
    const hash = await inputHash(hashParts);
    const { data: cached } = await admin.from("drops").select("id, summary").eq("team_id", teamId).eq("input_hash", hash).in("status", ["ready", "filed", "undone"]).neq("id", dropId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (cached) {
      const { data: oldItems } = await admin.from("drop_items").select("id").eq("drop_id", cached.id).order("created_at");
      const { data: oldResults } = await admin.from("drop_results").select("item_id, destination, title, payload, confidence, ord").eq("drop_id", cached.id).order("ord");
      if (oldResults?.length) {
        const mapId = new Map((oldItems ?? []).map((o, i) => [o.id as string, items[i]]));
        const copy = oldResults.map((r) => {
          const it = r.item_id ? mapId.get(r.item_id as string) : undefined;
          const payload = { ...(r.payload as Record<string, unknown>) };
          if ("storage_path" in payload) payload.storage_path = it?.storagePath ?? null;
          return { drop_id: dropId, team_id: teamId, item_id: it?.id ?? null, destination: r.destination, title: r.title, payload, confidence: r.confidence, ord: r.ord };
        });
        await admin.from("drop_results").insert(copy);
        await admin.from("drops").update({ status: "ready", summary: cached.summary, input_hash: hash, model: "cache", input_tokens: 0, output_tokens: 0 }).eq("id", dropId);
        return json({ status: "ready", summary: cached.summary, count: copy.length, cached: true, notes });
      }
    }

    // ── ٣) الحد الشهري (القراءات بالذكاء بس) ──
    const { data: team } = await admin.from("teams").select("plan, on_trial").eq("id", teamId).single();
    const limit = monthlyLimit(team?.plan, team?.on_trial);
    const { count } = await admin.from("agent_runs").select("id", { count: "exact", head: true }).eq("team_id", teamId).eq("action", "drop-read").gte("created_at", monthStartIso());
    if ((count ?? 0) >= limit) return fail("ai_limit", { limit, used: count });

    // ── ٤) التصنيف: نداء واحد بمخطط صارم، النموذج الأرخص أول ──
    const { data: members } = await admin.from("profiles").select("id, name").eq("team_id", teamId);
    const roster: Member[] = ((members ?? []) as Member[]).map((m) => ({ id: m.id, name: String(m.name ?? "").trim() })).filter((m) => m.name);
    const { data: project } = await admin.from("research_projects").select("title").eq("team_id", teamId).limit(1).maybeSingle();
    const today = riyadhToday();
    const context = [
      `TODAY: ${today} (${new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })}, Asia/Riyadh)`,
      `TEAM TOPIC: ${clip(String(project?.title ?? "").trim() || "(not set yet)", 300)}`,
      `ROSTER: ${roster.map((m) => m.name).join(" | ") || "(none)"}`,
      "PROPOSAL SECTIONS: background, problem, gap, aim, questions, literature-review, methodology",
      notes.length ? `NOTES: ${notes.join(" / ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const text = `${context}\n\n${items.map((i) => itemBlock(i, meta.get(i.id)?.attached ?? false, meta.get(i.id)?.pages ?? null)).join("\n\n")}`;
    const content: Block[] = [...attachments, { type: "text", text }];
    const ctx = { today, roster, items };

    const { out, used, inTok, outTok } = await classifyWithEscalation(content, ctx);
    await admin.from("agent_runs").insert({ team_id: teamId, profile_id: user.id, action: "drop-read" });
    await admin.from("drops").update({ input_hash: hash, model: used, input_tokens: inTok, output_tokens: outTok }).eq("id", dropId);
    if (!out) return fail("failed");
    if (!out.rows.length) return fail("nothing_found", { notes });

    // ── ٥) النتايج: تنكتب وتوصل للواجهة مباشرة (Realtime) ──
    const { error: insErr } = await admin.from("drop_results").insert(out.rows.map((r) => ({ ...r, drop_id: dropId, team_id: teamId })));
    if (insErr) {
      console.error("drop-read insert:", insErr.message);
      return fail("failed");
    }
    await admin.from("drops").update({ status: "ready", summary: out.summary }).eq("id", dropId);
    return json({ status: "ready", summary: out.summary, count: out.rows.length, model: used, notes });
  } catch (err) {
    console.error("drop-read error:", err instanceof Error ? err.message : err);
    return fail("failed");
  }
});
