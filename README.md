# أثر (ATHAR) — متجر عطور إلكتروني

متجر إلكتروني لبيع العطور، مبني بـ Next.js (App Router) و TypeScript و Tailwind CSS، مع Supabase كقاعدة بيانات و Tap Payments كبوابة دفع (قيد الربط).

## التقنيات

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4**
- **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`) — للمنتجات والطلبات والعملاء
- **Tap Payments** — الدفع (Apple Pay / مدى / فيزا وماستركارد) — الهيكل جاهز، غير مفعّل بعد

## التشغيل محلياً

```bash
npm install
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000).

## هيكل المشروع

```
src/
  app/
    page.tsx                     الصفحة الرئيسية
    shop/                        صفحة كل المنتجات + فلترة
    product/[slug]/               صفحة تفاصيل المنتج
    cart/                        سلة المشتريات
    checkout/                    الدفع (واجهة جاهزة، غير مربوطة بـ Tap بعد)
    order-confirmation/          تأكيد الطلب
    admin/                       لوحة تحكم (نظرة عامة، الطلبات، المنتجات)
    api/
      checkout/route.ts          سينشئ الطلب + شحنة Tap عند التفعيل
      webhooks/tap/route.ts      استقبال إشعارات الدفع من Tap
  components/
    layout/                      الهيدر والفوتر
    home/                        أقسام الصفحة الرئيسية
    shop/                        بطاقة المنتج وفلاتر المتجر
    product/                     نموذج الإضافة للسلة
    admin/                       نموذج المنتج في لوحة التحكم
    ui/                          مكونات عامة (رسم زجاجة العطر)
  lib/
    types.ts                     أنواع Product / Order / Customer...
    constants.ts                 بيانات المتجر والتنقل والمدن
    cart-context.tsx             سلة المشتريات (React Context + localStorage)
    supabase/                    عملاء Supabase (متصفح وخادم)
    payments/tap.ts              عقد التكامل مع Tap (غير مفعّل بعد)
  data/
    mock-products.ts             منتجات تجريبية للعرض قبل ربط Supabase
    mock-orders.ts                طلبات تجريبية للوحة التحكم
supabase/
  schema.sql                     جداول products / customers / orders / order_items + RLS
```

## ربط Supabase

1. أنشئ مشروع في [supabase.com](https://supabase.com).
2. نفّذ محتوى `supabase/schema.sql` في SQL editor الخاص بالمشروع.
3. انسخ `.env.local.example` إلى `.env.local` وعبّئ:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. استبدل الاستيراد من `src/data/mock-products.ts` و `mock-orders.ts` باستعلامات عبر `src/lib/supabase/client.ts` (متصفح) أو `server.ts` (Server Components / Route Handlers).

## ربط Tap Payments

1. فعّل حساب تاجر في [Tap](https://www.tap.company) (يقبل رخصة العمل الحر).
2. عبّئ `TAP_SECRET_KEY` و `NEXT_PUBLIC_TAP_PUBLISHABLE_KEY` و `TAP_WEBHOOK_SECRET` في `.env.local`.
3. نفّذ منطق إنشاء الشحنة داخل `src/lib/payments/tap.ts` (الدالة `createTapCharge`)، واستدعِه من `src/app/api/checkout/route.ts`.
4. أكمل التحقق من التوقيع وتحديث حالة الطلب داخل `src/app/api/webhooks/tap/route.ts`.
5. فعّل خيارات الدفع (مدى / Apple Pay / فيزا) في `src/app/checkout/page.tsx` بدل الحقول المعطّلة حالياً.

## الحالة الحالية

- الصفحة الرئيسية وكل صفحات المتجر (المتجر، تفاصيل المنتج، السلة، الدفع، تأكيد الطلب، لوحة التحكم) تعمل بواجهة كاملة على بيانات تجريبية.
- الدفع الإلكتروني **غير مفعّل بعد** — عند تأكيد الطلب في صفحة الدفع يتم إنشاء طلب تجريبي محلياً فقط.
- لوحة التحكم للعرض حالياً؛ الإضافة والتعديل والحفظ الفعلي يحتاج ربط Supabase.
