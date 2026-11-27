import { useEffect, type CSSProperties } from "react";
import Wesy from "../brand/Wesy";
import { useAcademy } from "../../hooks/useAcademy";
import { useStartLesson } from "../AcademyCoach";
import { officeItemIds, itemLesson, wesyNeeds } from "../../data/wesyNeeds";
import { tr } from "../../lib/i18n";

/** «ويسي يحتاجكم»: سطر واحد تحت مكتبه — طلب منه بصوته (هو الدرس الجاي بالأكاديمية بس ما ينقال «درس»).
    «ساعدوه» يوديهم للمكان ويضوّي على الزر، وأول ما يسوونها تنحط قطعة على رفّه.
    الزر مو برتقالي — البرتقالي للخطوة الوحدة بكرت «الجاي لكم». يختفي لما يخلصون كل شي. */
export default function WesyNeeds({ style }: { style?: CSSProperties }) {
  const { loaded, refresh, next, done, total, signals } = useAcademy();
  const start = useStartLesson();

  useEffect(() => {
    if (!loaded) refresh();
  }, [loaded, refresh]);

  if (!loaded || !next) return null;
  const need = wesyNeeds[next.id];
  const items = officeItemIds.filter((id) => signals[itemLesson(id)]).length;

  return (
    <section className="hg-card v3-rise mb-2.5 flex flex-wrap items-center gap-3 !py-3 lg:mb-[18px]" style={style} aria-label={tr("ويسي يحتاجكم")}>
      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#2A160B]" aria-hidden>
        <Wesy head state="wink" size={48} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="lux-eye m-0 !text-xs">{tr("ويسي يحتاجكم")}</p>
        <p className="m-0 text-base font-extrabold leading-snug text-ws-text">{need.ask}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-sm font-bold text-ws-muted sm:inline" title={tr("ساعدتوه {0} من {1}", done, total)}>
          {tr("رفّه")} <span dir="ltr">{items}/{officeItemIds.length}</span>
        </span>
        <button type="button" className="v3-bd !min-h-[44px] !text-sm" onClick={() => start(next.id)}>
          {tr("ساعدوه ←")}
        </button>
      </div>
    </section>
  );
}
