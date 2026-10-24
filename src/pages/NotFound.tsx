import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { gradientPill } from "../components/ui/researchUi";
import { tr } from "../lib/i18n";

/** صفحة غير موجودة: بدل شاشة فاضية، رابط واضح يرجّع الطالب للرئيسية */
export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center text-[#F4F0EC]">
      <span aria-hidden className="flex h-16 w-16 items-center justify-center rounded-full border border-[#FF8A24]/50 text-[#FFB444]">
        <Compass size={28} />
      </span>
      <h1 className="font-kufi text-3xl font-extrabold md:text-4xl">{tr("ما لقينا هالصفحة")}</h1>
      <p className="max-w-md text-[#B8ADA2]">{tr("الرابط ممكن يكون قديم أو فيه خطأ بسيط. ارجعوا للرئيسية وكملوا من هناك.")}</p>
      <Link to="/" className={gradientPill}>{tr("الرئيسية")}</Link>
    </div>
  );
}
