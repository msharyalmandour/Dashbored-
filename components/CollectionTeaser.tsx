import { partCategories, partsByCategory } from "@/lib/mock-data";

export default function CollectionTeaser() {
  return (
    <section id="collection" className="mx-auto max-w-6xl px-6 py-16">
      <h2 className="font-editorial text-4xl text-text">المجموعة</h2>
      <p className="mt-3 max-w-xl text-text-soft">
        تصفح فئات القطع الرئيسية — كل فئة تفتح نفس المستكشف التفاعلي بالأعلى
        مع تفعيل الفئة المطلوبة.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {partCategories.map((cat) => (
          <a
            key={cat.id}
            href="#explorer"
            className="group rounded-diqa border border-line bg-panel p-5 transition-colors hover:border-accent"
          >
            <div className="font-data text-xs text-text-soft">
              {partsByCategory(cat.id).length} قطع
            </div>
            <div className="mt-2 font-editorial text-2xl text-text group-hover:text-accent">
              {cat.label}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
