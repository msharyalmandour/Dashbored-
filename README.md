# دِقّة (Diqa)

منصة تجارة إلكترونية لقطع غيار السيارات في السعودية — نسخة MVP بواجهة أمامية
فقط وبيانات وهمية (mock data)، بدون باك إند أو قاعدة بيانات فعلية.

الميزة الأساسية: فحص السيارة عبر رقم الشاصي (VIN) أو صورة القطعة، ومستكشف
تفاعلي (SVG) لقطع السيارة مع بحث "ذكي" (محاكاة مطابقة كلمات مفتاحية).

## التقنيات

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- خطوط Google: Markazi Text / Tajawal / IBM Plex Mono
- واجهة عربية RTL بالكامل

## التشغيل محلياً

```bash
npm install
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000).

## البنية

- `app/` — صفحات Next.js (App Router)
- `components/` — مكونات الواجهة، بما فيها `PartsExplorer/` (المستكشف التفاعلي)
- `lib/types.ts` — أنواع البيانات (Car, Part, ...)
- `lib/mock-data.ts` — بيانات وهمية للسيارات والقطع
- `lib/search.ts` — محاكاة البحث الذكي (مطابقة كلمات مفتاحية)
