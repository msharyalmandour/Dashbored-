# ويسي على واتساب — خطوات التجهيز (للمالك)

الكود جاهز. باقي خطوات عند Meta لازم تسوونها أنتم بحسابكم، لأنها تحتاج هويتكم ورقم جوال ووسيلة دفع.
**لا ترسلون أي توكن أو سر بالشات.** كل الأسرار تنحط بـ Supabase مباشرة (الخطوة 5).

## 1) حساب الأعمال
- business.facebook.com ← سوّوا أو اختاروا حساب أعمال (Business portfolio) باسم Wesync.
- توثيق النشاط (Business verification) يرفع حدود الإرسال. للتجربة مع فريقين ما يلزم بالبداية.

## 2) تطبيق المطورين
- developers.facebook.com ← My Apps ← Create app ← النوع **Business** ← اربطوه بحساب الأعمال.
- من داخل التطبيق: Add product ← **WhatsApp** ← Set up.

## 3) الرقم
- WhatsApp Manager ← Phone numbers ← Add phone number.
- استخدموا **رقم جديد مو مسجّل بتطبيق واتساب العادي** (شريحة جديدة)، لأن الرقم ينتقل للمنصة.
- اسم العرض: **Wesync**. تأكيد بكود SMS.
- انسخوا **Phone number ID** (رقم طويل يطلع تحت الرقم).

## 4) التوكن الدائم
- Business settings ← Users ← **System users** ← Add (Admin).
- Assign assets ← التطبيق + حساب WhatsApp.
- Generate token ← اختاروا التطبيق، والصلاحيات `whatsapp_business_messaging` و `whatsapp_business_management`، والمدة «Never».
- App secret: من التطبيق ← App settings ← Basic ← App secret ← Show.

## 5) الأسرار في Supabase (أنتم تحطونها، مو أنا)
Supabase ← Project ← Edge Functions ← **Secrets** ← أضيفوا:

| الاسم | القيمة |
|---|---|
| `WHATSAPP_TOKEN` | التوكن الدائم (الخطوة 4) |
| `WHATSAPP_PHONE_ID` | Phone number ID (الخطوة 3) |
| `WHATSAPP_APP_SECRET` | App secret (الخطوة 4) |
| `WHATSAPP_VERIFY_TOKEN` | أي كلمة تختارونها، مثلًا `wesy-2026-xyz` |

## 6) الـ Webhook
- التطبيق ← WhatsApp ← Configuration ← Webhook ← Edit:
  - Callback URL: `https://uwdejlkvhsiqolmgihjq.supabase.co/functions/v1/whatsapp-bot`
  - Verify token: نفس `WHATSAPP_VERIFY_TOKEN`
- بعدها Webhook fields ← **messages** ← Subscribe.

## 7) قالب رسالة الصباح
WhatsApp Manager ← Message templates ← Create:
- الاسم: `wesy_morning` · الفئة: **Utility** · اللغة: **Arabic** (`ar`)
- النص (Body):
  ```
  صباح الخير {{1}} ☀️
  مهامك اليوم: {{2}}
  ردّ «تم» إذا خلصت، أو «أجّل» نأجلها يوم.
  ```
- أمثلة للمتغيرات (تطلبها Meta): `{{1}}` = سارة · `{{2}}` = 1) مراجعة الأدبيات — اليوم
- أزرار Quick reply: `تم ✓` · `أجّل يوم` · `مهامي`

ليش قالب؟ واتساب ما يسمح نبدأ نحن المحادثة إلا بقالب معتمد. أما لو الطالب رد علينا خلال آخر ٢٤ ساعة، فالكود يرسل رسالة عادية بأزرار.

## 8) الدفع
WhatsApp Manager ← Payment settings ← أضيفوا بطاقة.
- رسائل القالب برا نافذة الـ ٢٤ ساعة لها رسوم لكل رسالة. أسعار Meta للسعودية لفئة Utility تقريبًا سنت أمريكي لكل رسالة. شيّكوا الجدول الرسمي قبل الميزانية: https://developers.facebook.com/docs/whatsapp/pricing
- الردود داخل الـ ٢٤ ساعة مجانية.

## 9) أرسلوا لي الرقم فقط
الرقم نفسه (مثلًا 9665xxxxxxxx) عام وما فيه سر. أحطه بـ `src/lib/whatsapp.ts` وتطلع بطاقة «ويسي على واتساب» بصفحة الفريق.

## بعد التشغيل — كيف نعرف إنها نجحت؟
(قاعدة المالك: الاستخدام المتكرر، مو عدد التسجيلات.) نجرّبها مع فريقين حقيقيين لمدة أسبوعين ونقيس:
- **كم عضو ربط رقمه** من أعضاء الفريق.
- **كم واحد يرد أسبوعيًا** («تم» أو «أجّل» أو «مهامي»): من `whatsapp_messages` (direction = 'in').
- **كم مهمة انقفلت من الواتساب** مقارنة بالموقع.
- **هل الفريق صار نشط أسبوعيًا** أكثر من قبل.

إذا ما أحد رد بعد أسبوعين، نوقفها ونسأل الطلاب ليش، بدل ما نكبّرها.
