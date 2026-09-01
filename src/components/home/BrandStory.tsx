import { PerfumeBottle } from "@/components/ui/PerfumeBottle";
import { SITE } from "@/lib/constants";

export function BrandStory() {
  return (
    <section id="story" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div className="flex justify-center gap-6 lg:order-2">
          <PerfumeBottle accentColor="#caa14d" className="h-56 w-auto sm:h-72" />
          <PerfumeBottle accentColor="#b76e79" className="mt-10 h-56 w-auto sm:h-72" />
        </div>

        <div className="text-center lg:order-1 lg:text-right">
          <span className="text-xs tracking-[0.3em] text-gold">قصتنا</span>
          <h2 className="font-display mt-4 text-3xl leading-snug text-foreground sm:text-4xl">
            شغف سعودي بصناعة العطور الفاخرة
          </h2>
          <p className="mx-auto mt-6 max-w-md leading-8 text-muted lg:mr-0">
            وُلدت {SITE.name} من شغف عميق بفن التعطير الشرقي، حيث نجمع بين
            العود والعنبر الأصيل وخامات عالمية مختارة بعناية، لنقدّم لك عطوراً
            تحمل هويتك وتترك أثراً يبقى في ذاكرة من حولك.
          </p>
          <ul className="mx-auto mt-8 max-w-md space-y-4 text-sm text-foreground/85 lg:mr-0">
            <li className="flex items-center justify-center gap-3 lg:justify-end">
              تركيبات حصرية بأيدي خبراء تعطير
              <span className="text-gold">◆</span>
            </li>
            <li className="flex items-center justify-center gap-3 lg:justify-end">
              خامات مستوردة أصلية 100%
              <span className="text-gold">◆</span>
            </li>
            <li className="flex items-center justify-center gap-3 lg:justify-end">
              تعبئة وتغليف فاخر يليق بالإهداء
              <span className="text-gold">◆</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
