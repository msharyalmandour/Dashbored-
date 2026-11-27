import { useState } from "react";
import WLogo from "../components/brand/WLogo";
import Wesy, { WesyAvatar } from "../components/brand/Wesy";
import type { WesyOutfit, WesyState } from "../vendor/wesy-real";
import { wesyMood } from "../lib/wesyMood";
import { CATCHPHRASE } from "../lib/sound";

/* لوحة الهوية (/#/brand): الشعار وكل حالات ويسي وأزيائه — للمراجعة مقابل brand/wesy-demo.html.
   مو بالقائمة؛ رابط مباشر بس. */

const STATES: [WesyState, string][] = [
  ["greet", "يسلّم · أول زيارة باليوم"],
  ["idle", "هادي · يبتسم ويشرب قهوة"],
  ["typing", "يكتب · يلخّص ويرتب"],
  ["thinking", "يفكر · ينتظر الذكاء"],
  ["listening", "يسمع · المايك شغال"],
  ["success", "نجاح · W ذهبي باللابتوب"],
  ["error", "خطأ · يده على جبينه"],
  ["laugh", "يضحك · إنجاز كبير"],
  ["wink", "يغمز · آخر لحظة بكل نجاح"],
  ["sleep", "نايم · 12 ثانية بدون حركة"],
  ["yawn", "يتثاوب · 12 الليل–5 الفجر"],
  ["deadline", "قبل التسليم بأقل من 24 ساعة"],
  ["celebrate", "سلّموا البحث النهائي"],
];
const OUTFIT_OF: Partial<Record<WesyState, WesyOutfit>> = { deadline: "deadline", celebrate: "grad" };
const OUTFITS: [WesyOutfit, string][] = [
  ["morning", "الصباح · بخار القهوة"],
  ["ramadan", "رمضان"],
  ["national", "اليوم الوطني"],
  ["grad", "التخرّج"],
];

export default function BrandBoard() {
  const [sync, setSync] = useState(0);
  const now = wesyMood();
  return (
    <main dir="rtl" className="min-h-screen bg-[#080808] px-4 py-10 text-ws-text-accent sm:px-10">
      <h1 className="m-0 text-[34px] font-extrabold text-ws-text">لوحة الهوية</h1>
      <p className="m-0 mt-1 text-base text-ws-muted">الشعار وويسي بكل حالاته — نفس ملفات brand/.</p>

      <section className="mt-8 flex flex-wrap items-end gap-8">
        <figure className="m-0 text-center"><WLogo size={96} /><figcaption className="mt-2 text-sm">idle</figcaption></figure>
        <figure className="m-0 text-center"><WLogo size={96} state="loading" /><figcaption className="mt-2 text-sm">loading</figcaption></figure>
        <figure className="m-0 text-center">
          <WLogo size={96} state="sync" playKey={sync} />
          <figcaption className="mt-2 text-sm">
            <button type="button" className="min-h-[44px] rounded-xl bg-white/10 px-3 text-ws-text" onClick={() => setSync((n) => n + 1)}>
              sync ↻
            </button>
          </figcaption>
        </figure>
        <figure className="m-0 text-center"><WesyAvatar size={56} /><figcaption className="mt-2 text-sm">الأفاتار</figcaption></figure>
        <figure className="m-0 text-center">
          <Wesy size={120} outfit={now.outfit} state={now.state ?? "idle"} stage={now.stage} />
          <figcaption className="mt-2 text-sm">الحين: {now.outfit}{now.line ? ` · «${now.line}»` : ""}</figcaption>
        </figure>
        <p className="m-0 self-center text-[22px] font-extrabold text-ws-accent3">{CATCHPHRASE}</p>
        <figure className="m-0 text-center"><WesyAvatar size={56} formal /><figcaption className="mt-2 text-sm">جهة الدكتورة</figcaption></figure>
      </section>

      <h2 className="mb-3 mt-10 text-[20px] font-extrabold text-ws-text">الحالات</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {STATES.map(([s, t]) => (
          <figure key={s} className="m-0 rounded-2xl bg-white/[0.04] p-3 text-center ring-1 ring-white/[0.06]">
            <Wesy state={s} size={190} outfit={OUTFIT_OF[s] ?? "normal"} level={s === "listening" ? 0.6 : undefined} />
            <figcaption className="mt-1 text-sm"><b className="text-ws-accent3">{s}</b> · {t}</figcaption>
          </figure>
        ))}
      </div>

      <h2 className="mb-3 mt-10 text-[20px] font-extrabold text-ws-text">الأزياء والنمو</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {OUTFITS.map(([o, t]) => (
          <figure key={o} className="m-0 rounded-2xl bg-white/[0.04] p-3 text-center ring-1 ring-white/[0.06]">
            <Wesy size={170} outfit={o} />
            <figcaption className="mt-1 text-sm">{t}</figcaption>
          </figure>
        ))}
        <figure className="m-0 rounded-2xl bg-white/[0.04] p-3 text-center ring-1 ring-white/[0.06]">
          <Wesy size={170} stage={2} />
          <figcaption className="mt-1 text-sm">stage 2 · كتب</figcaption>
        </figure>
        <figure className="m-0 rounded-2xl bg-white/[0.04] p-3 text-center ring-1 ring-white/[0.06]">
          <Wesy size={170} stage={3} formal />
          <figcaption className="mt-1 text-sm">stage 3 · رسمي للدكتورة</figcaption>
        </figure>
      </div>
    </main>
  );
}
