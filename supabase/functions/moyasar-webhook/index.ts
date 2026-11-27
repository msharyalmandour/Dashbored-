// Supabase Edge Function — يستقبل إشعارات Moyasar عند نجاح/فشل الدفع
//
// النشر: يتم تلقائيًا عبر Supabase MCP (مو محتاجة تنسخينه يدويًا)
// المتغيرات المطلوبة (Project Settings → Edge Functions → Secrets):
//   MOYASAR_WEBHOOK_SECRET   كلمة سر تختارينها إنتِ — تحطينها بآخر رابط الـ
//                            webhook اللي تسجلينه بلوحة Moyasar، كـ
//                            ?secret=xxxx — هذا يثبت إن الطلب واصل من
//                            Moyasar فعلاً مو من أي جهة ثانية
//   MOYASAR_SECRET_KEY      نفس المفتاح السري اللي أضفتيه سابقًا — نستخدمه هنا
//                            كمان عشان نتحقق من حالة الدفعة مباشرة من Moyasar
//                            بدل ما نثق بمحتوى الإشعار وحده (لو حد قلّد الطلب)
// (SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY متوفرة تلقائيًا داخل بيئة الدالة)
//
// رابط الـ webhook اللي تسجلينه بلوحة Moyasar (Settings → Webhooks):
//   https://uwdejlkvhsiqolmgihjq.supabase.co/functions/v1/moyasar-webhook?secret=<MOYASAR_WEBHOOK_SECRET>
// واختاري الحدث "payment_paid" فقط.

import { createClient } from "npm:@supabase/supabase-js@2";

const WEBHOOK_SECRET = Deno.env.get("MOYASAR_WEBHOOK_SECRET");
const MOYASAR_SECRET_KEY = Deno.env.get("MOYASAR_SECRET_KEY");

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  if (!WEBHOOK_SECRET || url.searchParams.get("secret") !== WEBHOOK_SECRET) {
    return new Response("unauthorized", { status: 401, headers: corsHeaders });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("bad request", { status: 400, headers: corsHeaders });
  }

  // بعض إعدادات Moyasar تبعث الكائن مباشرة، وبعضها يغلّفه بـ data — نتعامل مع الشكلين.
  // نستخدم الإشعار فقط لمعرفة رقم الدفعة — الحالة الحقيقية نتأكد منها من Moyasar نفسها بالأسفل
  const notifiedPayment = (body.data as Record<string, unknown>) ?? body;
  const moyasarPaymentId = notifiedPayment.id as string | undefined;
  if (!moyasarPaymentId) {
    return new Response("ignored", { status: 200, headers: corsHeaders });
  }

  if (!MOYASAR_SECRET_KEY) {
    console.error("MOYASAR_SECRET_KEY not configured");
    return new Response("server misconfigured", { status: 500, headers: corsHeaders });
  }

  const verifyRes = await fetch(`https://api.moyasar.com/v1/payments/${moyasarPaymentId}`, {
    headers: { Authorization: `Basic ${btoa(`${MOYASAR_SECRET_KEY}:`)}` },
  });
  if (!verifyRes.ok) {
    console.error("moyasar verify failed", verifyRes.status, await verifyRes.text());
    return new Response("error", { status: 502, headers: corsHeaders });
  }
  const payment = await verifyRes.json();

  const status = payment.status as string | undefined;
  const amountHalalas = payment.amount as number | undefined;
  const metadata = payment.metadata as Record<string, unknown> | undefined;
  const teamId = metadata?.team_id as string | undefined;
  // مين دفع بالضبط — يجي من الواجهة (MoyasarPayment.tsx يمرره ضمن metadata)، يخلي
  // كل دفعة مربوطة بعضوها الصحيح بدل ما تكون مجهولة على مستوى الفريق فقط
  const profileId = metadata?.profile_id as string | undefined;

  if (status !== "paid" || !teamId) {
    // نتجاهل أي حدث غير "paid" أو ناقص بيانات — نرجّع 200 عشان Moyasar ما يعيد المحاولة
    return new Response("ignored", { status: 200, headers: corsHeaders });
  }

  const amount = (amountHalalas ?? 0) / 100;

  // ── السعر لكل شخص (2026-11-27) — نفس src/lib/plans.ts ──
  //   شهري 15 (30 يوم) · فصل 49 (120 يوم) · السنة الدراسية 99 (270 يوم) · خصم الاستمرار: الشهري 12
  //   الأيام تنضاف للفريق كامل بالتناسب: المبلغ × أيام المدة ÷ (عدد الأعضاء × سعر الشخص)
  //   فدفعة الفريق كامل = المدة كاملة، وحصة شخص من 4 = ربعها. الدفعات تتراكم.
  const PLANS: Record<string, { price: number; days: number }> = {
    month: { price: 15, days: 30 },
    semester: { price: 49, days: 120 },
    year: { price: 99, days: 270 },
  };
  const { count: memberCount } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId);
  const members = Math.max(memberCount ?? 1, 1);

  // تبرع «مقعد لزميل محتاج» ينطرح قبل الحسبة (حده 50)
  const donation = Math.min(Math.max(Number(metadata?.donation ?? 0) || 0, 0), 50, amount);
  const net = amount - donation;
  const forTeam = metadata?.mode === "full";
  // قائمة صريحة (مو «in») عشان قيم زي "constructor" ما تمر
  let period = ["month", "semester", "year"].includes(String(metadata?.period)) ? String(metadata?.period) : "month";
  let unit = PLANS[period].price;
  if (period === "month" && metadata?.streak === "1") {
    const { data: streakOk } = await supabaseAdmin.rpc("team_streak_ok", { p_team: teamId });
    if (streakOk === true) unit = 12;
  }
  // المبلغ أقل من سعر شخص واحد لهالمدة (أو نقص عن الفريق كامل) → نحسبه شهري بالتناسب، ما نعطي سعر مدة ما انشرت
  const seats = forTeam ? members : 1;
  if (net < unit * seats - 0.5) {
    period = "month";
    unit = PLANS.month.price;
  }
  const daysToAdd = Math.max(Math.round((net * PLANS[period].days) / (members * unit)), 1);

  // «ادفع عن صاحبك»: المستفيد لازم يكون من نفس الفريق، وإلا الدفعة تنحسب لصاحبها
  let beneficiary = profileId ?? null;
  const forProfile = typeof metadata?.for_profile_id === "string" ? (metadata.for_profile_id as string) : null;
  if (forProfile && forProfile !== profileId) {
    const { data: same } = await supabaseAdmin.from("profiles").select("id").eq("id", forProfile).eq("team_id", teamId).maybeSingle();
    if (same) beneficiary = forProfile;
  }

  // idempotency — لو نفس الدفعة وصلت أكتر من مرة (إعادة محاولة من Moyasar)، ما نمدد الاشتراك مرتين
  const row = { team_id: teamId, moyasar_payment_id: moyasarPaymentId, amount, status, profile_id: beneficiary };
  let { data: inserted, error: insertError } = await supabaseAdmin
    .from("payments")
    .insert({ ...row, paid_by: profileId ?? null, period, donation, for_team: forTeam })
    .select("id")
    .maybeSingle();
  // الأعمدة الجديدة لسا ما انضافت بالقاعدة (قبل تشغيل ملف SQL)؟ نحفظ بالأعمدة القديمة عشان الدفع ما يوقف
  if (insertError && (insertError.code === "42703" || insertError.code === "PGRST204")) {
    ({ data: inserted, error: insertError } = await supabaseAdmin.from("payments").insert(row).select("id").maybeSingle());
  }

  if (insertError) {
    if (insertError.code === "23505") {
      // unique violation — دفعة مكررة، تم تمديد الاشتراك أصلاً بالمرة الأولى
      return new Response("already processed", { status: 200, headers: corsHeaders });
    }
    console.error("payments insert failed", insertError);
    return new Response("error", { status: 500, headers: corsHeaders });
  }
  if (!inserted) {
    return new Response("already processed", { status: 200, headers: corsHeaders });
  }

  const { data: team, error: teamError } = await supabaseAdmin
    .from("teams")
    .select("subscription_end_date, referred_by_team_id, referral_reward_granted")
    .eq("id", teamId)
    .single();

  if (teamError || !team) {
    console.error("team lookup failed", teamError);
    return new Response("error", { status: 500, headers: corsHeaders });
  }

  const currentEnd = team.subscription_end_date
    ? new Date(team.subscription_end_date as string)
    : new Date();
  const today = new Date();
  const base = currentEnd > today ? currentEnd : today;
  const newEnd = new Date(base);
  newEnd.setDate(newEnd.getDate() + daysToAdd);
  const newEndStr = newEnd.toISOString().slice(0, 10);

  await supabaseAdmin
    .from("teams")
    // الاشتراك شامل: أي دفعة تفتح المساعد الذكي (plan='ai') حتى للفرق القديمة اللي كانت Basic
    .update({ subscription_end_date: newEndStr, on_trial: false, plan: "ai" })
    .eq("id", teamId);

  // أول تمديد حقيقي لفريق مُحال: شهر مجاني للفريقين (الداعي والجديد) — مرة وحدة بس، نفس منطق admin_extend_subscription
  if (team.referred_by_team_id && !team.referral_reward_granted) {
    const { data: referrerTeam } = await supabaseAdmin
      .from("teams")
      .select("subscription_end_date")
      .eq("id", team.referred_by_team_id as string)
      .single();

    if (referrerTeam) {
      const refCurrentEnd = referrerTeam.subscription_end_date
        ? new Date(referrerTeam.subscription_end_date as string)
        : new Date();
      const refBase = refCurrentEnd > today ? refCurrentEnd : today;
      const refNewEnd = new Date(refBase);
      refNewEnd.setDate(refNewEnd.getDate() + 30);

      await supabaseAdmin
        .from("teams")
        .update({ subscription_end_date: refNewEnd.toISOString().slice(0, 10) })
        .eq("id", team.referred_by_team_id as string);
    }

    const bonusEnd = new Date(newEnd);
    bonusEnd.setDate(bonusEnd.getDate() + 30);
    await supabaseAdmin
      .from("teams")
      .update({ referral_reward_granted: true, subscription_end_date: bonusEnd.toISOString().slice(0, 10) })
      .eq("id", teamId);
  }

  return new Response("ok", { status: 200, headers: corsHeaders });
});
