import { useState } from "react";
import { X } from "lucide-react";
import { WesyAvatar } from "../brand/Wesy";
import { useAuth } from "../../context/AuthContext";
import { useTour } from "../../context/TourContext";
import { explainSeen } from "../../pages/Explain";
import { tr } from "../../lib/i18n";

/* ويسي يعرض الجولة (اختيارية): سطر واحد فوق المكتب للي ما شاف المكان قبل.
   «ورني» تبدأ الجولة، «بعدين» تخفيه. ما يرجع بعد ما يختارون — الجولة دايمًا موجودة بقائمة «المزيد» ودليل الطالب. */

const KEY = (uid: string) => `wesync.tourOffer.${uid}`;

function dismissed(uid: string): boolean {
  try {
    return localStorage.getItem(KEY(uid)) === "1";
  } catch {
    return true;
  }
}

export default function WesyTourOffer({ firstName }: { firstName: string }) {
  const { currentUser } = useAuth();
  const { finished, activeIndex, startTour } = useTour();
  const uid = currentUser?.id ?? "";
  const [hidden, setHidden] = useState(() => !uid || dismissed(uid) || explainSeen(uid));

  if (hidden || finished || activeIndex !== null) return null;

  const done = () => {
    try {
      localStorage.setItem(KEY(uid), "1");
    } catch {
      /* ما يهم */
    }
    setHidden(true);
  };

  return (
    <section className="wt-offer lux-in mb-2.5 lg:mb-[18px]" aria-label={tr("جولة ويسي")}>
      <WesyAvatar size={44} state="greet" className="wt-offer-av" />
      <div className="min-w-0 flex-1">
        <p className="m-0 text-sm font-bold text-ws-text">
          {firstName ? tr("هلا {0}، أنا ويسي.", firstName) : tr("هلا، أنا ويسي.")} {tr("تبي أوريك المكان؟")}
        </p>
        <p className="m-0 mt-0.5 text-xs text-ws-text-2">{tr("دقيقة وحدة، وأمشي معك على كل قسم وأقولك وش فيه.")}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          className="ws-btn-primary wt-offer-go"
          onClick={() => {
            done();
            startTour();
          }}
        >
          {tr("ورني")}
        </button>
        <button type="button" className="wt-offer-later" onClick={done}>
          {tr("بعدين")}
        </button>
      </div>
      <button type="button" className="wt-offer-x" onClick={done} aria-label={tr("إخفاء")}>
        <X size={14} />
      </button>
    </section>
  );
}
