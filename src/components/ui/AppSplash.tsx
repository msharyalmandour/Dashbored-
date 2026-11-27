import { useEffect, useState } from "react";
import WLogo from "../brand/WLogo";
import { tr } from "../../lib/i18n";

const LINES = [tr("نرتّب مساحة فريقكم…"), tr("نجيب مهامكم ومواعيدكم…"), tr("نجهّز آخر المستجدات…"), tr("لحظات ونكون جاهزين")];

/** شاشة التحميل الأول: شعار W بحالة التحميل (الموجتين تتنفس)، وجملة تتبدل كل ثانيتين */
export default function AppSplash() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, LINES.length - 1)), 2000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-10 bg-[#080808] text-ws-text" role="status" aria-live="polite">
      <WLogo size={96} state="loading" />
      <p key={i} className="app-splash__line font-kufi text-base font-bold text-ws-muted">
        {LINES[i]}
      </p>
    </div>
  );
}
