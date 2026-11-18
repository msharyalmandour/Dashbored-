import { Download } from "lucide-react";
import { WhatsAppLogo } from "../components/ui/BrandLogos";
import { LuxHead } from "../components/lux/Lux";
import { CATCHPHRASE } from "../lib/sound";
import { tr } from "../lib/i18n";

/* «شارك»: ستيكرات ويسي (brand/stickers · 12 × 512px شفافة). تحميل كل واحد، أو إضافتها للواتساب:
   واتساب ما يقبل ستيكر من رابط ويب مباشرة، فنشاركها من قائمة المشاركة بالجوال (تطلع «واتساب» فيها) أو تنحفظ وتنضاف من تطبيق ستيكرات. */
const STICKERS: [string, string][] = [
  ["01-laugh", "هههههه"],
  ["02-wink", "😉"],
  ["03-sallamt", "سلّمت؟"],
  ["04-meeting", "يلا اجتماع"],
  ["05-doctor-replied", "الدكتورة ردّت!"],
  ["06-slept", "نمت"],
  ["07-same-wave", "على نفس الموجة"],
  ["08-typing", "ثواني أكتب"],
  ["09-morning", "صباح الخير"],
  ["10-deadline", "قبل التسليم"],
  ["11-graduation", "مبروك التخرج"],
  ["12-ramadan", "رمضان كريم"],
];
const url = (k: string) => `/stickers/${k}.webp`;

async function shareToWhatsApp(k: string) {
  try {
    const blob = await (await fetch(url(k))).blob();
    const file = new File([blob], `wesy-${k}.webp`, { type: "image/webp" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], text: CATCHPHRASE });
      return;
    }
  } catch {
    /* ننزّلها بدل المشاركة */
  }
  const a = document.createElement("a");
  a.href = url(k);
  a.download = `wesy-${k}.webp`;
  a.click();
}

export default function Stickers() {
  return (
    <div className="text-[#EAE3DC]">
      <LuxHead kicker={tr("شارك")} title={tr("ستيكرات ويسي")} sub={tr("حمّلوها، أو أرسلوها للواتساب من جوالكم")} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {STICKERS.map(([k, cap]) => (
          <div key={k} className="lx-card flex flex-col items-center gap-2 p-4 text-center">
            <img src={url(k)} alt={tr("ستيكر ويسي: {0}", tr(cap))} width={160} height={160} loading="lazy" className="h-40 w-40 object-contain" />
            <div className="flex w-full flex-col gap-2">
              <a href={url(k)} download={`wesy-${k}.webp`} className="lx-ghost flex min-h-[44px] flex-1 items-center justify-center gap-1.5 !px-2 text-[13px]">
                <Download size={15} aria-hidden />
                {tr("حمّلوها")}
              </a>
              <button type="button" onClick={() => void shareToWhatsApp(k)} className="lx-ghost flex min-h-[44px] flex-1 items-center justify-center gap-1.5 !px-2 text-[13px]">
                <WhatsAppLogo size={16} />
                {tr("أضيفوها للواتساب")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
