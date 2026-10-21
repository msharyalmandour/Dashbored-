# ربط درايف الفريق — الإعداد (مرة وحدة من المالك)

الميزة: قائد كل فريق يربط حساب Google حقه، فينسوّى مجلد «Wesync — اسم الفريق» بدرايفه، يتشارك مع الأعضاء، وتنرفع له محاضر الاجتماعات (Word).
الصلاحية المطلوبة `drive.file` فقط (التطبيق يشوف الملفات اللي أنشأها هو بس). الدالة: `supabase/functions/drive-team`. الجدول: `drive_connections` (RLS بدون policies، الرموز مشفّرة AES-GCM).

## الخطوات
1. <https://console.cloud.google.com> ← مشروع جديد باسم Wesync.
2. APIs & Services ← Library ← فعّل **Google Drive API**.
3. OAuth consent screen (Google Auth Platform) ← External ← اسم التطبيق Wesync، إيميل الدعم، إيميل المطوّر.
   - Scopes: `openid` و`email` و`https://www.googleapis.com/auth/drive.file`.
   - **انشر التطبيق (Publish app → In production).** لو بقي Testing: يقتصر على ١٠٠ مستخدم تجريبي والـ refresh token ينتهي بعد ٧ أيام (فيفصل الربط).
4. Credentials ← Create credentials ← OAuth client ID ← Web application.
   - Authorized redirect URI: `https://uwdejlkvhsiqolmgihjq.supabase.co/functions/v1/drive-team`
5. Supabase ← Edge Functions ← Secrets (تكتبها بنفسك بالداشبورد، لا تلصقها بالمحادثة):
   - `GOOGLE_OAUTH_CLIENT_ID`
   - `GOOGLE_OAUTH_CLIENT_SECRET`
   - `DRIVE_TOKEN_KEY` — أي نص عشوائي طويل (٤٠ حرف+). لو غيّرته لاحقًا ينفك ربط كل الفرق ويعيدون الربط.
6. انشر الدالة `drive-team` (verify_jwt=false لأن Google يرجّع المستخدم بطلب GET) وتأكد إن بطاقة «درايف الفريق» تظهر بصفحة محاضر الاجتماعات.

## كيف يشتغل
- قائد الفريق فقط يربط/يفك/يشارك. الأعضاء يشوفون الحالة ويرفعون المحاضر.
- عند الربط: ينسوّى المجلد ويتشارك (تعديل) مع إيميلات أعضاء الفريق المسجلين. من ينضم بعدين: القائد يضغط «شاركوا الآن».
- الدكتورة: القائد يكتب إيميلها بالبطاقة فيتشارك المجلد معها (قراءة فقط).
- كل محضر يُحفظ يتحول Word ويُرفع تلقائيًا، ورابطه يظهر بجنب المحضر («فتح بدرايف»).
- الإيميلات اللي ما هي حساب Google توصلها دعوة وتفتح الملف برابط.
- لو الفريق/القائد ألغى صلاحية Wesync من حسابه Google: الرفع يرجّع «انتهى الربط» والقائد يعيد الربط.

## حدود معروفة
- الصلاحية `drive.file`: لو القائد نقل/حذف المجلد من درايفه ينكسر الرفع حتى يعيد الربط (يُنشأ مجلد جديد عند تغيير الحساب فقط).
- ما انجرّب بحساب Google حقيقي بعد (يحتاج مفاتيح المالك).
- صفحة «الملفات» القديمة تستخدم `drive-upload` (حساب خدمة/Workspace) وما تغيّرت.
