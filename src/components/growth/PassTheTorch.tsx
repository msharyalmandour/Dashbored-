import { useEffect, useState } from "react";
import { Flame, MessageCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../lib/supabaseClient";
import { publicOrigin } from "../../lib/publicUrl";
import { tr } from "../../lib/i18n";

/** «سلّموا الشعلة»: بعد المناقشة، الفريق المتخرج يرسل رابطه للدفعة الجاية — كل دفعة تجيب اللي بعدها.
    نفس كود السفير (my_ambassador_code): الفريق الجديد اللي يبدأ من الرابط ياخذ شهر مجاني، وأنتم كمان. */
export default function PassTheTorch() {
  const { mode } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    if (mode !== "supabase" || !supabase) return;
    void supabase.rpc("my_ambassador_code").then(({ data }) => setCode(typeof data === "string" ? data : null));
  }, [mode]);
  const link = code ? `${publicOrigin()}/?ref=${code}` : publicOrigin();
  const msg = tr(
    "خلصنا بحث التخرج على Wesync 🎓 كل الفريق والدكتورة بمكان واحد، وويسي رتّب لنا الشغل. إذا بتبدأون بحثكم، ابدأوا من رابطنا وتاخذون شهر مجاني: {0}",
    link,
  );
  return (
    <div className="rounded-3xl border border-amber-accent-200 bg-gradient-to-b from-amber-accent-50/60 to-paper p-5 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-accent-100 text-amber-accent-700">
        <Flame size={20} />
      </span>
      <p className="mt-3 font-display text-lg font-extrabold text-brand-950">{tr("سلّموا الشعلة للدفعة الجاية")}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-brand-950/60">
        {tr("أرسلوا رابطكم لطلاب السنة الثالثة. الفريق اللي يبدأ منه ياخذ شهر مجاني، ومشروعكم يبقى محفوظ عندكم للأبد.")}
      </p>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(msg)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-brand-200 bg-paper px-5 text-sm font-bold text-brand-700"
      >
        <MessageCircle size={16} aria-hidden />
        {tr("أرسلوها بالواتساب")}
      </a>
    </div>
  );
}
