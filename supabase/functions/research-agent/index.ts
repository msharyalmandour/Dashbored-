// Supabase Edge Function — وكيل البحث العلمي (نسخة المصادر الحقيقية)
//
// النشر: supabase functions deploy research-agent
// المتغيرات: ANTHROPIC_API_KEY (نفس مفتاح ai-assist)، واختياري SCHOLARLY_CONTACT
// (إيميل تواصل يُرسل لـ PubMed وOpenAlex كآداب استخدام — بدونه يشتغل عادي).
//
// الإجراءات:
//   search    بحث بعنوان البحث في PubMed + OpenAlex، وClaude يرتّب ويلخّص بالعربي
//   tools     أدوات قياس معتمدة (استبيانات) لمتغير معيّن مع ثباتها ولغاتها
//   strategy  استراتيجية بحث PRISMA: كلمات مفتاحية وجمل بحث ومعايير قبول
//   ask       سؤال عن دراسة (من ملخصها أو من PDF ترفعه الطالبة)
//
// مبدأ الأمان من الاختلاق: الدراسات وروابطها وDOI تجي من الـ APIs مباشرة.
// Claude يرجّع فقط أرقام المرشّحين اللي اختارهم مع ملخصات مبنية على الملخص
// الأصلي، ونحن نربطها بالبيانات الأصلية — ما يكتب أي رابط بنفسه.

import Anthropic from "npm:@anthropic-ai/sdk@^0.68.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  clip,
  extractJson,
  mergeCandidates,
  searchOpenAlex,
  searchPubmed,
  type Candidate,
} from "./scholarly.ts";

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const HAIKU = "claude-haiku-4-5";
const SONNET = "claude-sonnet-5";
const CONTACT = Deno.env.get("SCHOLARLY_CONTACT") || undefined;

// حدود شهرية لكل فريق — تحكّم بالتكلفة. البحث يُحسب من جدول عمليات البحث
// نفسه (مثل النسخة القديمة)، والباقي من agent_runs
const MONTHLY_LIMITS: Record<string, number> = { search: 10, tools: 10, strategy: 10, ask: 40 };
const LIMIT_MESSAGES: Record<string, string> = {
  search: "وصلتوا للحد الشهري لعمليات البحث (١٠ عمليات) — يتجدد أول الشهر الجاي. تقدرون ترجعون لعمليات البحث السابقة بالأسفل.",
  tools: "وصلتوا للحد الشهري لبحث أدوات القياس (١٠ عمليات) — يتجدد أول الشهر الجاي.",
  strategy: "وصلتوا للحد الشهري لبناء استراتيجية البحث (١٠ عمليات) — يتجدد أول الشهر الجاي.",
  ask: "وصلتوا للحد الشهري لأسئلة الدراسات (٤٠ سؤال) — يتجدد أول الشهر الجاي.",
};
const AI_PLAN_REQUIRED_MESSAGE =
  "وكيل البحث العلمي متاح بباقة AI (٥٩ ريال شهريًا لكل عضو). تقدر قائدة الفريق تنتقل لها من صفحة «الباقات والاشتراك».";
const MAX_PDF_BASE64 = 7_000_000; // ≈ 5 ميجا PDF

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const httpGet = (url: string) =>
  fetch(url, {
    headers: { "User-Agent": "Wesync/1.0 (research assistant for nursing students)", Accept: "application/json, text/xml, */*" },
    signal: AbortSignal.timeout(15000),
  });

function textFrom(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

async function askModel(opts: {
  model: string;
  system: string;
  content: Anthropic.MessageParam["content"];
  maxTokens: number;
  lowEffort?: boolean;
}): Promise<string> {
  const response = await anthropic.messages.create({
    model: opts.model,
    max_tokens: opts.maxTokens,
    system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
    // effort غير مدعوم على Haiku — نبعثه فقط لـ Sonnet
    ...(opts.lowEffort ? { output_config: { effort: "low" as const } } : {}),
    messages: [{ role: "user", content: opts.content }],
  });
  return textFrom(response.content);
}

// ───────────────────────── بناء استعلامات البحث ─────────────────────────

const QUERY_SYSTEM = `You convert a nursing-research topic (written in Arabic or English) into English literature-search queries.
Output ONLY JSON: {"pubmed": ["query1", "query2"], "openalex": "keywords"}.
- pubmed[0]: a precise PubMed query: 2-4 concept groups joined with AND; synonyms inside each group joined with OR in parentheses; use [Title/Abstract] tags.
- pubmed[1]: a broader query with fewer concepts and plain keywords.
- openalex: 3-5 core English keywords (all of them must appear in a paper's title/abstract, so keep it tight), no operators or tags.
If the mode is "tools", the user wants validated measurement instruments: add a concept group (scale OR questionnaire OR instrument OR inventory) AND (validation OR psychometric OR reliability OR validity) to pubmed[0], and include the words "scale validation psychometric" in openalex.
Keep every query under 350 characters. Translate Arabic terms to their standard English nursing/medical terminology.`;

async function buildQueries(topic: string, mode: "papers" | "tools"): Promise<{ pubmed: string[]; openalex: string }> {
  try {
    const raw = await askModel({
      model: HAIKU,
      system: QUERY_SYSTEM,
      content: `mode: ${mode}\ntopic: ${clip(topic, 400)}`,
      maxTokens: 500,
    });
    const parsed = extractJson(raw) as { pubmed?: unknown; openalex?: unknown } | null;
    const pubmed = Array.isArray(parsed?.pubmed)
      ? (parsed!.pubmed as unknown[]).filter((q): q is string => typeof q === "string" && q.trim().length > 2).map((q) => clip(q.trim(), 400)).slice(0, 2)
      : [];
    const openalex = typeof parsed?.openalex === "string" ? clip(parsed.openalex.trim(), 200) : "";
    if (pubmed.length > 0 || openalex) return { pubmed, openalex: openalex || pubmed[0] };
  } catch (err) {
    console.error("query builder failed", err);
  }
  return { pubmed: [clip(topic, 300)], openalex: clip(topic, 200) };
}

async function gatherCandidates(topic: string, mode: "papers" | "tools", limit: number): Promise<Candidate[]> {
  const q = await buildQueries(topic, mode);
  const jobs: Promise<Candidate[]>[] = [];
  if (q.pubmed[0]) jobs.push(searchPubmed(q.pubmed[0], 10, httpGet, CONTACT));
  if (q.openalex) jobs.push(searchOpenAlex(q.openalex, 12, httpGet, CONTACT));
  if (q.pubmed[1]) jobs.push(searchPubmed(q.pubmed[1], 8, httpGet, CONTACT));
  const settled = await Promise.allSettled(jobs);
  const lists = settled.filter((s): s is PromiseFulfilledResult<Candidate[]> => s.status === "fulfilled").map((s) => s.value);
  for (const s of settled) if (s.status === "rejected") console.error("source failed", s.reason instanceof Error ? s.reason.message : s.reason);
  if (lists.length === 0) throw new Error("all scholarly sources failed");
  return mergeCandidates(lists, limit);
}

function candidateBlock(list: Candidate[], abstractChars: number): string {
  return list
    .map(
      (c, i) =>
        `[${i}] ${c.title} | ${c.year ?? "n.d."} | ${c.journal || "unknown journal"} | ${c.pubTypes.join("/") || "-"}\n` +
        `ABSTRACT: ${c.abstract ? clip(c.abstract, abstractChars) : "(no abstract available)"}`,
    )
    .join("\n\n");
}

// ───────────────────────── search ─────────────────────────

const RANK_SYSTEM = `You are a nursing-research librarian helping Saudi nursing students. You receive a graduation-research topic and numbered candidate papers (title, year, journal, abstract) retrieved from PubMed and OpenAlex.
Pick up to 8 candidates that are genuinely closest to the topic (topic closeness first, not recency). Skip irrelevant ones.
Output ONLY JSON:
{"picks":[{"i":0,"summaryAr":"...","relevanceReason":"...","studyDesign":"...","sampleSize":"...","keyFinding":"..."}],"noveltyNote":"..."}
Rules:
- Use ONLY information present in each candidate's abstract. Never add facts, numbers, or claims that are not in it.
- summaryAr: 1-2 sentences in Arabic (Saudi-friendly, clear) summarizing the study.
- relevanceReason: one short Arabic sentence on why it matters for THIS topic.
- studyDesign: English label as in the abstract (e.g. "Cross-sectional", "RCT", "Systematic review"); "" if not stated.
- sampleSize: e.g. "n=250 ICU nurses"; "" if not stated.
- keyFinding: the main result in one Arabic sentence, only if the abstract states it; otherwise "".
- noveltyNote: 2-3 Arabic sentences on what could still be new or different in the team's topic compared with these studies. Be honest: if the topic looks well covered, say so.
- Order picks from closest to least close. No text outside the JSON.`;

// deno-lint-ignore no-explicit-any
async function handleSearch(topic: string): Promise<any> {
  let candidates: Candidate[];
  try {
    candidates = await gatherCandidates(topic, "papers", 14);
  } catch {
    return { results: [], noveltyNote: "", sourcesFailed: true };
  }
  if (candidates.length === 0) return { results: [], noveltyNote: "" };

  const raw = await askModel({
    model: SONNET,
    system: RANK_SYSTEM,
    content: `TOPIC: ${clip(topic, 500)}\n\nCANDIDATES:\n${candidateBlock(candidates, 900)}`,
    maxTokens: 3500,
    lowEffort: true,
  });
  const parsed = extractJson(raw) as { picks?: unknown; noveltyNote?: unknown } | null;
  const picks = Array.isArray(parsed?.picks) ? (parsed!.picks as Record<string, unknown>[]) : [];
  const used = new Set<number>();
  const results = [];
  for (const p of picks) {
    const i = typeof p.i === "number" ? p.i : Number.NaN;
    if (!Number.isInteger(i) || i < 0 || i >= candidates.length || used.has(i)) continue;
    used.add(i);
    const c = candidates[i];
    const str = (v: unknown, n: number) => (typeof v === "string" ? clip(v.trim(), n) : "");
    results.push({
      title: c.title,
      url: c.url,
      authors: c.authors,
      year: c.year,
      journal: c.journal,
      doi: c.doi,
      source: c.source,
      sourceType: c.isJournal ? "peer-reviewed" : "other",
      summaryAr: str(p.summaryAr, 600) || "لا يتوفر ملخص لهذي الدراسة.",
      relevanceReason: str(p.relevanceReason, 300),
      studyDesign: str(p.studyDesign, 80),
      sampleSize: str(p.sampleSize, 120),
      keyFinding: str(p.keyFinding, 400),
      abstract: clip(c.abstract, 1800),
      pubTypes: c.pubTypes.slice(0, 4),
    });
    if (results.length >= 8) break;
  }
  return { results, noveltyNote: typeof parsed?.noveltyNote === "string" ? clip(parsed.noveltyNote, 800) : "" };
}

// ───────────────────────── tools ─────────────────────────

const TOOLS_SYSTEM = `You help Saudi nursing students find validated measurement instruments (questionnaires/scales) for their graduation research.
You receive the construct to measure, the target population, and numbered candidate papers (title, year, journal, abstract) from PubMed/OpenAlex.
Identify candidates whose abstract describes DEVELOPING or VALIDATING (or translating/adapting) a measurement instrument relevant to the construct.
Output ONLY JSON:
{"tools":[{"i":0,"toolName":"...","measures":"...","items":"...","reliability":"...","languages":"...","population":"...","notes":"..."}],"caveat":"..."}
Rules:
- Use ONLY information in the abstract. toolName is the instrument's name/acronym exactly as written there. If the abstract does not state items/reliability/languages/population, use "" — never guess.
- measures, notes: short Arabic. items/reliability/languages/population: as in the abstract (English ok), e.g. "22 items", "Cronbach alpha 0.87", "Arabic", "ICU nurses".
- notes: mention if this is an Arabic/Saudi adaptation, or a review that compares several tools.
- Up to 8 entries, most suitable for the population first. Skip papers that do not present an instrument.
- caveat: one Arabic sentence reminding that details come from abstracts only and they must read the full paper and check permission/licensing before using an instrument.`;

// deno-lint-ignore no-explicit-any
async function handleTools(construct: string, population: string): Promise<any> {
  const topic = population ? `${construct} — population: ${population}` : construct;
  let candidates: Candidate[];
  try {
    candidates = await gatherCandidates(topic, "tools", 16);
  } catch {
    return { tools: [], sourcesFailed: true };
  }
  if (candidates.length === 0) return { tools: [] };
  const raw = await askModel({
    model: SONNET,
    system: TOOLS_SYSTEM,
    content: `CONSTRUCT: ${clip(construct, 300)}\nPOPULATION: ${clip(population || "nurses / nursing students", 200)}\n\nCANDIDATES:\n${candidateBlock(candidates, 900)}`,
    maxTokens: 3500,
    lowEffort: true,
  });
  const parsed = extractJson(raw) as { tools?: unknown; caveat?: unknown } | null;
  const items = Array.isArray(parsed?.tools) ? (parsed!.tools as Record<string, unknown>[]) : [];
  const tools = [];
  const str = (v: unknown, n: number) => (typeof v === "string" ? clip(v.trim(), n) : "");
  for (const t of items) {
    const i = typeof t.i === "number" ? t.i : Number.NaN;
    if (!Number.isInteger(i) || i < 0 || i >= candidates.length || !str(t.toolName, 120)) continue;
    const c = candidates[i];
    tools.push({
      toolName: str(t.toolName, 120),
      measures: str(t.measures, 200),
      items: str(t.items, 80),
      reliability: str(t.reliability, 160),
      languages: str(t.languages, 100),
      population: str(t.population, 160),
      notes: str(t.notes, 300),
      sourceTitle: c.title,
      sourceUrl: c.url,
      year: c.year,
      journal: c.journal,
      authors: c.authors,
    });
    if (tools.length >= 8) break;
  }
  return {
    tools,
    caveat: typeof parsed?.caveat === "string" ? clip(parsed.caveat, 300) : "التفاصيل من ملخصات الدراسات فقط — اقرأوا الدراسة كاملة وتأكدوا من إذن استخدام الأداة قبل اعتمادها.",
  };
}

// ───────────────────────── strategy ─────────────────────────

const STRATEGY_SYSTEM = `You are a nursing-research methodologist. Given a graduation-research topic (Arabic or English), design a literature search strategy following PRISMA 2020 practice.
Output ONLY JSON:
{
 "pico": {"population":"...","intervention":"...","comparison":"...","outcome":"...","note":"..."},
 "keywordsEn": ["..."],
 "keywordsAr": ["..."],
 "meshTerms": ["..."],
 "searchStrings": {"pubmed":"...","cinahl":"...","scopus":"..."},
 "inclusion": ["..."],
 "exclusion": ["..."],
 "tips": ["..."]
}
Rules:
- pico values in Arabic with the English term in parentheses where useful; comparison may be "غير منطبق" for descriptive studies (note that PPCO/PICo may fit better).
- keywordsEn: 8-14 English terms/synonyms; keywordsAr: the same concepts in Arabic (5-10).
- meshTerms: only MeSH headings you are confident exist; these are SUGGESTIONS (the app tells the student to verify in the MeSH Browser).
- searchStrings: ready-to-paste Boolean strings using AND/OR, quotes for phrases, parentheses. pubmed uses [Title/Abstract] and [MeSH Terms] tags; cinahl uses TI/AB style (e.g. TI (...) OR AB (...)); scopus uses TITLE-ABS-KEY(...). Keep each under 700 characters.
- inclusion/exclusion: 4-6 practical Arabic criteria each (years e.g. last 10 years, language, population, design).
- tips: 3-4 short Arabic tips for running and documenting the search (databases, dates, PRISMA flow diagram).
No text outside the JSON.`;

// deno-lint-ignore no-explicit-any
async function handleStrategy(topic: string): Promise<any> {
  const raw = await askModel({
    model: SONNET,
    system: STRATEGY_SYSTEM,
    content: `TOPIC: ${clip(topic, 500)}`,
    maxTokens: 3000,
    lowEffort: true,
  });
  const strategy = extractJson(raw);
  if (!strategy || typeof strategy !== "object") throw new Error("strategy parse failed");
  return { strategy };
}

// ───────────────────────── ask ─────────────────────────

const ASK_SYSTEM = `أنتِ مساعدة بحثية تجاوبين أسئلة طالبات/طلاب تمريض عن دراسة علمية.
اعتمدي فقط على المادة المرفقة (نص الدراسة أو ملخصها أو ملف PDF). لا تضيفين معلومات من خارجها ولا تخمّنين أرقام.
لو المعلومة ما هي موجودة، قولي بصراحة "ما لقيتها في المادة المتوفرة" واذكري إذا كانت المادة ملخصًا فقط (وقد تكون التفاصيل في النص الكامل).
جاوبي بالعربية (وخلي المصطلحات والأرقام كما هي بالإنجليزية)، بإيجاز وبنص عادي بدون Markdown (لا نجوم ولا # ولا جداول). للنقاط استخدمي أرقام بسيطة (١) ٢)) كل نقطة بسطر.
لو السؤال يخص ربط الدراسة ببحثهم، اربطي بحذر ووضحي إن القرار لهم ولمشرفتهم.`;

// deno-lint-ignore no-explicit-any
async function handleAsk(body: any): Promise<any> {
  const question = String(body.question ?? "").trim();
  if (!question) return { error: "السؤال مطلوب" };
  const title = clip(String(body.title ?? ""), 400);
  const context = [
    title && `عنوان الدراسة: ${title}`,
    body.abstract && `الملخص:\n${clip(String(body.abstract), 6000)}`,
    body.keyFinding && `أهم النتائج المسجّلة: ${clip(String(body.keyFinding), 1000)}`,
    body.relevance && `الصلة ببحث الفريق: ${clip(String(body.relevance), 1000)}`,
    body.projectTitle && `عنوان بحث الفريق: ${clip(String(body.projectTitle), 400)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const pdf = typeof body.pdfBase64 === "string" ? body.pdfBase64 : "";
  if (pdf.length > MAX_PDF_BASE64) return { error: "ملف الـ PDF كبير — جربوا ملف أصغر من ٥ ميجا." };
  if (!pdf && !body.abstract) return { error: "ما فيه ملخص لهذي الدراسة — ارفعوا ملف PDF لها عشان أقدر أجاوب." };

  const content: Anthropic.MessageParam["content"] = [];
  if (pdf) content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf } });
  content.push({ type: "text", text: `${context ? context + "\n\n" : ""}السؤال: ${clip(question, 600)}` });

  const answer = await askModel({ model: SONNET, system: ASK_SYSTEM, content, maxTokens: 1500, lowEffort: true });
  return { answer: answer.trim(), usedPdf: !!pdf };
}

// ───────────────────────── الدخول والتحقق والحدود ─────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: "غير مصرح — سجّل دخولك أولاً" }, 401);

    const { data: profile } = await supabase.from("profiles").select("team_id").eq("id", user.id).single();
    const teamId = profile?.team_id as string | undefined;
    const body = await req.json();
    const action = String(body.action ?? "");
    if (!(action in MONTHLY_LIMITS)) return json({ error: "إجراء غير معروف" }, 400);

    // باقة AI (أو أيام التجربة) — القفل هنا بالسيرفر. لو فشلت قراءة الباقة نسمح.
    if (teamId) {
      const { data: planRow, error: planError } = await supabase.from("teams").select("plan, on_trial").eq("id", teamId).single();
      if (planError) console.error("plan lookup failed", planError);
      if (planRow && planRow.plan !== "ai" && !planRow.on_trial) {
        return json({ upgradeRequired: true, limitReached: true, message: AI_PLAN_REQUIRED_MESSAGE });
      }
    }

    // الحد الشهري
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    if (teamId) {
      let used = 0;
      if (action === "search") {
        const { data: projectId } = await supabase.rpc("my_research_project_id");
        if (projectId) {
          const { count } = await supabase
            .from("research_search_queries")
            .select("id", { count: "exact", head: true })
            .eq("research_project_id", projectId)
            .gte("created_at", monthStart.toISOString());
          used = count ?? 0;
        }
      } else {
        const { count } = await supabaseAdmin
          .from("agent_runs")
          .select("id", { count: "exact", head: true })
          .eq("team_id", teamId)
          .eq("action", action)
          .gte("created_at", monthStart.toISOString());
        used = count ?? 0;
      }
      if (used >= MONTHLY_LIMITS[action]) return json({ limitReached: true, message: LIMIT_MESSAGES[action] });
      if (action !== "search") {
        await supabaseAdmin.from("agent_runs").insert({ team_id: teamId, profile_id: user.id, action });
      }
    }

    if (action === "search") {
      const topic = String(body.topic ?? "").trim();
      if (!topic) return json({ error: "العنوان مطلوب" }, 400);
      return json(await handleSearch(topic));
    }
    if (action === "tools") {
      const construct = String(body.construct ?? "").trim();
      if (!construct) return json({ error: "اكتبوا المتغير اللي تبون تقيسونه" }, 400);
      return json(await handleTools(construct, String(body.population ?? "").trim()));
    }
    if (action === "strategy") {
      const topic = String(body.topic ?? "").trim();
      if (!topic) return json({ error: "العنوان مطلوب" }, 400);
      return json(await handleStrategy(topic));
    }
    // 200 حتى مع رسالة خطأ ودّية — supabase-js يخفي نص الأخطاء غير 2xx
    return json(await handleAsk(body));
  } catch (err) {
    console.error("research-agent error:", err instanceof Error ? err.message : err);
    return json({ error: "صار خطأ غير متوقع، حاول مرة ثانية" }, 500);
  }
});
