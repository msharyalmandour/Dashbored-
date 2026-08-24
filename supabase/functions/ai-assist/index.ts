// Supabase Edge Function — مساعد NURSYNC الذكي
//
// النشر: supabase functions deploy ai-assist
// المتغيرات المطلوبة (Project Settings → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY   مفتاح Anthropic الخاص بك
// (SUPABASE_URL و SUPABASE_ANON_KEY متوفرة تلقائيًا داخل بيئة الدالة)
//
// هذي الدالة هي الطبقة الوحيدة اللي تتكلم مع Claude API — مفتاح Anthropic
// ما يظهر أبدًا بكود الواجهة (لو حطيناه بالـ React مباشرة، أي حد يفتح أدوات
// المطور بالمتصفح يقدر يسرقه ويستخدم رصيدك).

import Anthropic from "npm:@anthropic-ai/sdk@^0.68.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });

const CHAT_SYSTEM = `أنت مساعد بحثي داخل تطبيق NURSYNC، يساعد فرق طلاب/طالبات
التمريض في بحث التخرج (المقترح، مراجعة الأدبيات، المنهجية). جاوب بإيجاز
ووضوح، بالعربية إلا إذا كتب المستخدم بالإنجليزية، وركّز على مساعدتهم
يفهمون ويتقدمون ببحثهم — لا تكتب لهم البحث كامل نيابة عنهم.`;

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
      const messages = body.messages as { role: "user" | "assistant"; content: string }[];
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
