// Supabase Edge Function — مساعد NURSYNC الذكي
//
// النشر: supabase functions deploy ai-assist
// المتغيرات المطلوبة (Project Settings → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY    مفتاح Anthropic الخاص بك
//   ELEVENLABS_API_KEY   اختياري — لصوت المرشدة "نور" الحقيقي بالجولة
//                        التعريفية (بدونه ترجع تلقائيًا لصوت المتصفح
//                        الجاهز، بدون أي كسر بالتطبيق)
//   ELEVENLABS_VOICE_ID  اختياري — رمز صوت من مكتبة ElevenLabs
//                        (elevenlabs.io/app/voice-library)، افتراضيًا صوت
//                        عام يدعم العربية عبر eleven_multilingual_v2
// (SUPABASE_URL و SUPABASE_ANON_KEY متوفرة تلقائيًا داخل بيئة الدالة)
//
// هذي الدالة هي الطبقة الوحيدة اللي تتكلم مع Claude API وElevenLabs —
// المفاتيح ما تظهر أبدًا بكود الواجهة (لو حطيناها بالـ React مباشرة، أي حد
// يفتح أدوات المطور بالمتصفح يقدر يسرقها ويستخدم رصيدك).

import Anthropic from "npm:@anthropic-ai/sdk@^0.68.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
// صوت افتراضي عام يدعم العربية عبر نموذج eleven_multilingual_v2 — بدّليه
// برمز صوت تختارينه من مكتبة ElevenLabs لو تبين صوت مختلف
const ELEVENLABS_VOICE_ID = Deno.env.get("ELEVENLABS_VOICE_ID") ?? "21m00Tcm4TlvDq8ikWAM";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// بروتوكولات ومعايير البحث العلمي التمريضي — مصدر معرفة موثوق يُغذّى للمساعد
// عشان إجاباته تُبنى على معايير معتمدة عالميًا ومحليًا، مو معلومات عامة غير مؤكدة.
//
// المصادر (راجعيها وحدّثي المحتوى حسب متطلبات قسمكم بالتحديد لو تغيّرت):
// - PRISMA 2020 Statement — https://www.prisma-statement.org/
// - STROBE Statement (Cross-sectional / Cohort / Case-control) — https://www.strobe-statement.org/
// - National Committee of BioEthics (Saudi Arabia, NCBE) — الدليل التنفيذي لنظام أخلاقيات البحث على المخلوقات الحية
// - Declaration of Helsinki (WMA)
// - Saudi Guidelines for Informed Consent — وزارة الصحة السعودية
// - PICO(T) Framework — أدلة الممارسة المبنية على الأدلة (Evidence-Based Practice)
// - مراجع أكاديمية عامة لكتابة مقترحات البحث التمريضي (خلفية، مشكلة، فجوة بحثية)
//
// ملاحظة مهمة: هذي معايير عامة معتمدة دوليًا/محليًا — لو مشرفة القسم أو الجامعة
// تطلب شكل أو تفاصيل مختلفة (مثلًا هيكل فصل معيّن)، تعليمات المشرفة هي الأولوية.
const RESEARCH_PROTOCOLS = `
# بروتوكولات البحث العلمي التمريضي — مرجع المساعد

استخدم هذا المرجع لتوجيه إجاباتك عن خطوات ومعايير البحث. اذكري للطالبة إذا
كان الجواب مبني على معيار معتمد (اذكري اسمه، مثل PRISMA أو STROBE) عشان
تثقين بمصداقية الجواب. لو سؤال يخص تفاصيل محددة بجامعتهم/قسمهم (شكل التنسيق
مثلًا)، وضّحي إن المرجع النهائي هو تعليمات المشرفة الأكاديمية.

## 1) خلفية البحث (Background)
تشرح السياق العام للمشكلة الصحية/التمريضية: حجمها، انتشارها، أثرها على
المرضى والممارسة التمريضية، ولماذا تستحق الدراسة الآن. تُبنى على إحصائيات
ودراسات سابقة موثوقة (منظمات صحية، دراسات محكّمة)، وتنتهي بربط منطقي نحو
مشكلة البحث.

## 2) مراجعة الأدبيات (Literature Review) — معيار PRISMA 2020
مبني على PRISMA 2020 Statement (27-item checklist لتقارير المراجعات
المنهجية):
- حدّدي استراتيجية بحث واضحة: قواعد البيانات المستخدمة (PubMed, CINAHL,
  Scopus...)، الكلمات المفتاحية، والفترة الزمنية.
- وثّقي عدد الدراسات: كم دراسة ظهرت بالبحث، كم استُبعدت وليش، كم بقيت
  للمراجعة النهائية (مخطط تدفق / Flow Diagram).
- صنّفي الدراسات حسب الموضوع/المحور (Theme) لتسهيل الكتابة.
- لكل دراسة: المؤلف والسنة، تصميم الدراسة، أهم نتيجة، وصلتها المباشرة
  ببحثك (مو بس ملخص عام).
- الهدف من المراجعة: تلخيص "المعروف حاليًا" تمهيدًا لتحديد الفجوة البحثية.

## 3) مشكلة البحث (Problem Statement)
جملة أو فقرة مركّزة توضّح بالضبط وش الفجوة أو النقص اللي يحتاج بحث. يجب
أن تكون: واضحة ومحددة (مو عامة جدًا)، قابلة للبحث فعليًا (نقدر نجمع
بيانات عنها)، وذات أهمية حقيقية للممارسة التمريضية أو رعاية المريض.
الطول المعتاد: فقرة إلى فقرتين لمقترح البحث (نصف صفحة تقريبًا).

## 4) الفجوة البحثية (Research Gap)
تلخيص دقيق لما هو "معروف" مقابل "غير معروف/غير مدروس بما فيه الكفاية"
بناءً على مراجعة الأدبيات. لكل فجوة: اذكري وش الناقص (who/what/when/
where/why/how) بشكل منفصل ومحدد، ثم اربطيها مباشرة بهدف بحثك — يعني
وضّحي كيف بحثك بالضبط بيسد هذي الفجوة.

## 5) الهدف وأسئلة البحث (Aim & Research Questions) — إطار PICO(T)
لصياغة سؤال بحثي واضح وقابل للبحث، استخدمي إطار PICO(T):
- P — Patient/Population: الفئة المستهدفة (مثلًا: ممرضات العناية المركزة)
- I — Intervention/Issue: المتغير أو الممارسة قيد الدراسة
- C — Comparison: عنصر المقارنة (إن وجد — مو كل الدراسات تحتاجه)
- O — Outcome: النتيجة المتوقع قياسها
- T — Time: الإطار الزمني (اختياري)
ملاحظة: PICO الأصلي مبني لأسئلة تدخّل/علاج؛ لو بحثك وصفي (Descriptive) أو
تحسين جودة (Quality Improvement) بدون مقارنة تدخّل، إطار PPCO (Problem,
Population, Change, Outcome) بديل أنسب. هدف الدراسة جملة واحدة واضحة،
وأسئلة البحث تتفرّع منه مباشرة (سؤال لكل متغير رئيسي عادة).

## 6) المنهجية (Methodology)

### أ) تصميم الدراسة (Study Design)
اختاري التصميم حسب طبيعة سؤالك:
- **دراسة وصفية (Descriptive)**: لوصف ظاهرة أو مستوى معرفة/ممارسة كما هي،
  بدون فحص علاقة سببية.
- **دراسة ارتباطية (Correlational)**: لفحص العلاقة بين متغيرين أو أكثر
  بدون تدخّل.
- **دراسة مقطعية (Cross-sectional)**: جمع البيانات بنقطة زمنية واحدة —
  الأكثر شيوعًا برسائل التخرج لسهولتها زمنيًا. تتبع معيار STROBE للتقرير.
- **دراسة أترابية/طولية (Cohort)**: متابعة نفس المشاركين عبر فترة زمنية.
- **تجربة عشوائية محكومة (RCT)**: أقوى دليل علمي لكن الأصعب تنفيذًا
  برسالة تخرج (يحتاج موافقات وموارد أكبر).
مرجع التقرير: **STROBE Statement** (22-item checklist) للدراسات المقطعية
والأترابية ودراسات الحالات والشواهد.

### ب) مكان الدراسة والمجتمع (Setting & Population)
حدّدي بدقة: أين ستُجرى الدراسة (اسم المستشفى/القسم دون تفاصيل تكشف
الهوية بالمقترح العام)، ومن هو مجتمع الدراسة (كل الممرضات؟ فئة معينة؟).

### ج) العينة (Sampling)
- **معايير القبول (Inclusion Criteria)**: صفات لازم تتوفر بالمشارك
  (مثلًا: خبرة سنة فأكثر بالعناية المركزة).
- **معايير الاستبعاد (Exclusion Criteria)**: من لا يُشمل (مثلًا: إجازة
  طويلة أثناء فترة جمع البيانات).
- **طريقة أخذ العينة**: عشوائية (Random)، طبقية (Stratified)، أو ملائمة
  (Convenience) — الأخيرة الأكثر استخدامًا برسائل التخرج لسهولة الوصول،
  لكن اذكري هذا كمحدودية بمناقشة النتائج لاحقًا (تأثير على قابلية
  التعميم).
- **حجم العينة**: يُحسب إحصائيًا (مو رقم عشوائي) باستخدام برامج مثل
  G*Power، بناءً على: مستوى الدلالة (عادة α = 0.05)، قوة الاختبار
  (عادة 0.80)، وحجم الأثر المتوقع (Effect Size). أضيفي نسبة تعويضية
  (10-20%) لاحتمال الانسحاب أو الاستبيانات الناقصة.

### د) طرق جمع البيانات (Data Collection Methods)
استبيان ذاتي التعبئة، مقابلة منظّمة/شبه منظّمة، ملاحظة مباشرة، أو
مراجعة سجلات — الاختيار يعتمد على نوع البيانات (كمّية/كيفية) وسؤال
البحث.

### هـ) أداة الدراسة (Study Tool)
فضّلي أداة/استبيان **معتمد وموثّق سابقًا (Validated)** له دراسات موثوقية
وصدق منشورة، بدل تصميم أداة جديدة من الصفر (يتطلب اختبار صدق وثبات
إضافي يصعب إنجازه بوقت رسالة التخرج). لو الأداة مستخدمة بلغة غير لغة
عينتك، وثّقي إجراء الترجمة والترجمة العكسية (Translation & Back-
translation).

## 7) الاعتبارات الأخلاقية (Ethical Considerations)
مبنية على: **إعلان هلسنكي (Declaration of Helsinki)**، ونظام أخلاقيات
البحث على المخلوقات الحية الصادر عن **اللجنة الوطنية لأخلاقيات البحث
الحيوي والطبي (NCBE)** بالسعودية، والدليل السعودي للإذن الطبي الصادر عن
وزارة الصحة.
نقاط أساسية لازم تُذكر بأي مقترح:
- **الموافقة الأخلاقية (IRB/Ethics Approval)**: لازم موافقة من لجنة
  أخلاقيات البحث بالجهة (المستشفى/الجامعة) قبل بدء جمع البيانات — بدونها
  ما يُقبل البحث مبدئيًا.
- **الموافقة المستنيرة (Informed Consent)**: توضيح الهدف، الطوعية،
  الحق بالانسحاب بأي وقت بدون أثر سلبي، للمشارك قبل موافقته.
- **السرية وحماية الهوية (Confidentiality)**: تشفير/ترميز البيانات،
  عدم ربط الإجابات بهوية المشارك، تخزين آمن للبيانات.
- **تقليل الضرر (Minimizing Harm)**: التأكد إن المشاركة ما تسبب ضغط
  نفسي أو مهني على الممرضات المشاركات (مثلًا وقت تعبئة الاستبيان أثناء
  الدوام).

## قواعد عامة للمساعد
- إذا سُئلت عن تفاصيل مو موجودة بهذا المرجع (مثلًا: صيغة تنسيق APA
  محددة بجامعتهم)، وضّحي إنه غير متوفر هنا وأرشدي للرجوع لدليل الجامعة
  أو المشرفة.
- لا تكتبي محتوى القسم كامل نيابة عن الطالبة (زي فقرة خلفية بحث جاهزة) —
  اشرحي المبدأ ووجّهيها تكتبه بنفسها، هذا صلب رسالة التخرج.
- اربطي دايمًا الجواب بالمعيار المصدري لما يكون ذا صلة (PRISMA، STROBE،
  PICO، NCBE) عشان تعرف الطالبة إن الجواب موثوق ومو تخمين.
`;

const CHAT_SYSTEM = `أنت مساعد بحثي داخل تطبيق NURSYNC، يساعد فرق طلاب/طالبات
التمريض في بحث التخرج (المقترح، مراجعة الأدبيات، المنهجية). جاوب بإيجاز
ووضوح، بالعربية إلا إذا كتب المستخدم بالإنجليزية، وركّز على مساعدتهم
يفهمون ويتقدمون ببحثهم — لا تكتب لهم البحث كامل نيابة عنهم.

أحيانًا ترفق الطالبة صورة مع سؤالها (زي سكرين شوت تعليمات المشرفة، صفحة من
دراسة، أو جزء من مقترحهم). اقرئي الصورة بعناية واربطي شرحك بمحتواها
الفعلي، وإذا كان فيها نص غير واضح أو مقطوع، وضّحي إنك ما قدرتي تقرأينه
كامل بدل ما تخمّني.

استخدمي المرجع التالي (بروتوكولات ومعايير بحث معتمدة) كأساس موثوق
لإجاباتك عن خطوات ومعايير البحث العلمي التمريضي:
${RESEARCH_PROTOCOLS}`;

const IMPROVE_SYSTEM = `أنت مساعد كتابة أكاديمية. تستلم فقرة من بحث تخرج
تمريضي وتحسّن صياغتها الأكاديمية (وضوح، ترابط، رسمية) بدون ما تغيّر المعنى
أو تضيف معلومات جديدة. حافظ على نفس لغة النص المُدخل. رجّع النص المحسّن فقط،
بدون مقدمات أو شرح.`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function textFrom(content: Anthropic.ContentBlock[]): string {
  const block = content.find((b): b is Anthropic.TextBlock => b.type === "text");
  return block?.text ?? "";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // تحقق إن الطالب/ة مسجّل دخول فعليًا — عشان محد يستدعي الدالة ويستهلك رصيدك بدون حساب
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "غير مصرح — سجّل دخولك أولاً" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    if (body.action === "chat") {
      // content ممكن يكون نص عادي، أو مصفوفة أجزاء (نص + صورة base64) لما
      // الطالبة ترفق صورة (زي سكرين شوت تعليمات المشرفة) — Claude يدعم فهم
      // الصور مباشرة ضمن نفس المحادثة بدون أي معالجة إضافية من طرفنا
      const messages = body.messages as Anthropic.MessageParam[];
      const response = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 2000,
        system: CHAT_SYSTEM,
        messages,
      });
      return new Response(JSON.stringify({ text: textFrom(response.content) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "tts") {
      if (!ELEVENLABS_API_KEY) {
        return new Response(JSON.stringify({ error: "خدمة الصوت غير مفعّلة" }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = ((body.text as string) ?? "").slice(0, 600);
      const ttsResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }),
        },
      );
      if (!ttsResponse.ok) {
        const errBody = await ttsResponse.text();
        console.error("ElevenLabs TTS failed", ttsResponse.status, errBody);
        return new Response(
          JSON.stringify({ error: "تعذّر توليد الصوت", detail: errBody }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      const audioBytes = new Uint8Array(await ttsResponse.arrayBuffer());
      return new Response(
        JSON.stringify({ audioBase64: bytesToBase64(audioBytes), mimeType: "audio/mpeg" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (body.action === "improve") {
      const input = body.text as string;
      const response = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 2000,
        system: IMPROVE_SYSTEM,
        messages: [{ role: "user", content: input }],
      });
      return new Response(JSON.stringify({ text: textFrom(response.content) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "إجراء غير معروف" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "صار خطأ غير متوقع، حاول مرة ثانية" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
