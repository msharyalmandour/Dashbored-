import { Link } from "react-router-dom";
import Wesy from "../components/brand/Wesy";
import { tr } from "../lib/i18n";

/** 404 (brand-kit-demo · 13): 404 بالذهبي + «الصفحة ضاعت…» + سطر واحد + زر واحد، وويسي يفكر جنبها */
export default function NotFound() {
  return (
    <div className="mx-auto grid min-h-[70vh] max-w-[980px] items-center gap-6 px-6 py-10 text-[#f4f0ec] md:grid-cols-2">
      <div className="text-center md:text-start">
        <div dir="ltr" className="text-[clamp(80px,14vw,160px)] font-extrabold leading-none text-[#FFC777]">
          404
        </div>
        <h1 className="m-0 mt-3 pt-[.2em] text-[32px] font-extrabold md:text-[40px]">{tr("الصفحة ضاعت…")}</h1>
        <p className="m-0 mt-1 text-[16px] text-[#E9D3B8]">{tr("زي المرجع اللي ما لقيناه. بس ويسي يدوّر عليها.")}</p>
        <Link to="/" className="mt-5 inline-flex min-h-[48px] items-center rounded-full bg-gradient-to-l from-[#FF6A00] to-[#FF9A3C] px-7 text-[16px] font-extrabold text-[#160904]">
          {tr("ارجع للرئيسية")}
        </Link>
      </div>
      <div className="flex justify-center">
        <Wesy state="thinking" size={360} label={tr("ويسي يدوّر على الصفحة")} />
      </div>
    </div>
  );
}
