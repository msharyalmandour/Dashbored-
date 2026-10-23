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

## حالة الإعداد (2026-10-21)
- ✅ مشروع Google Cloud باسم Wesync (project id: wesync-512311)، وDrive API مفعّل.
- ✅ OAuth consent: External، والصلاحيات `userinfo.email` و`openid` و`drive.file` (كلها non-sensitive).
- ✅ جدول `drive_connections` منشور بقاعدة البيانات؛ الكود بالمستودع (الدالة `drive-team` **غير منشورة بعد**، تنتظر الأسرار).
- ⏳ Branding: الحقول معبّاة (الاسم، البريد، الصفحة الرئيسية، الخصوصية، الشروط، النطاق `dashbored-sigma.vercel.app`، بريد المطوّر). **لازم يُشال اللوقو** (رفعه يفرض مراجعة Google) ثم Save، وبعدها يتفعّل زر Publish app.
- ⏳ Audience ← Publish app (In production). لو زر النشر ظل معطّل بعد حفظ Branding فالسبب غالبًا النطاق المشترك `vercel.app`؛ الحل: التحقق من ملكية النطاق بـ Google Search Console أو استخدام نطاق خاص.
- ⏳ Clients ← Create client (Web) بـ redirect URI المذكور أعلاه، ثم الأسرار الثلاثة بـ Supabase، ثم نشر الدالة وتجربة الربط.
- لوقو جاهز (120 و512) بـ `marketing/brand/` لكن لا يُرفع لـ Google قبل التوثيق.

## تحديث الحالة (2026-10-23)
- ✅ الأسرار الثلاثة محفوظة بـSupabase (`GOOGLE_OAUTH_CLIENT_ID` و`GOOGLE_OAUTH_CLIENT_SECRET` و`DRIVE_TOKEN_KEY`)، والدالة `drive-team` منشورة (الإصدار 1، verify_jwt=false). فحص الخادم: `configured=true` (الرد `reason=bad_state` عند GET بدون state).
- ✅ المالك أكّد بنفسه إن الإعداد والتجربة تمام (2026-10-23). لم أجرّب الربط بحساب Google حقيقي من جهتي.
- ⏳ الموقع الرئيسي (`dashbored-sigma.vercel.app`): يحتاج نشر نسخة الفرع حتى تظهر بطاقة الدرايف للجميع، والـredirect بعد موافقة Google يرجع له (`SITE_URL`).
