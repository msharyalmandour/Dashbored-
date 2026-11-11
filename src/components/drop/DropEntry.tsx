import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import Vessel from "./Vessel";
import { tr } from "../../lib/i18n";

/** كرت الرئيسية (DropEntry): وعاء صغير + «ارموا أي شي» */
export default function DropEntry({ style }: { style?: React.CSSProperties }) {
  return (
    <Link to="/drop" className="dr-card dr-in dr-d1 mb-2.5 flex min-h-[84px] items-center gap-3 overflow-hidden rounded-[24px] py-1 pe-3.5 ps-1.5 text-[#EAE3DC] no-underline lg:mb-[18px]" style={style} data-learn="drop-entry">
      <Vessel size={88} className="-my-2" />
      <span className="min-w-0 flex-1 leading-[1.4]">
        <b className="block text-[17px]">{tr("ارموا أي شي")}</b>
        <span className="text-[13px] text-[#E9D3B8]">{tr("ملف، صورة، رسالة المشرف/ة… ونرتبها")}</span>
      </span>
      <ChevronLeft size={20} className="shrink-0 text-[#ABA095] ltr:rotate-180" aria-hidden />
    </Link>
  );
}
