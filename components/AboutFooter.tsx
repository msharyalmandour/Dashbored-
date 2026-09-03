export default function AboutFooter() {
  return (
    <footer id="about" className="border-t border-line bg-panel/50">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="font-editorial text-4xl text-text">من نحن</h2>
            <p className="mt-4 max-w-lg leading-8 text-text-soft">
              دِقّة منصة سعودية لقطع غيار السيارات، هدفها إنهاء التخمين عند
              شراء القطع. اختر ماركة سيارتك وموديلها وسنتها، ودِقّة تعرض لك
              فوراً القطع المتوافقة فعلياً معها.
            </p>
            <p className="mt-4 max-w-lg text-sm leading-7 text-text-soft">
              هذه نسخة MVP بواجهة أمامية وبيانات وهمية بالكامل، لعرض الفكرة
              والتفاعل قبل ربطها بقاعدة بيانات وواجهة خلفية فعلية.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm text-text-soft">
            <span className="font-data text-xs uppercase tracking-wide text-accent">
              تواصل
            </span>
            <span>الرياض، المملكة العربية السعودية</span>
            <span dir="ltr" className="font-data">
              hello@diqa.sa
            </span>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-xs text-text-soft sm:flex-row">
          <span>© {new Date().getFullYear()} دِقّة — جميع الحقوق محفوظة</span>
          <span>نسخة عرض تجريبي (MVP) — بيانات وهمية</span>
        </div>
      </div>
    </footer>
  );
}
