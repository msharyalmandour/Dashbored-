import { useState } from "react";
import { getReduceMotion, setReduceMotion } from "../lib/motionPref";
import { Check, Palette } from "lucide-react";
import clsx from "clsx";
import { themes, useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { isFemaleUser } from "../lib/gender";
import { tr } from "../lib/i18n";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [calm, setCalm] = useState(() => getReduceMotion(currentUser?.id));
  const toggleCalm = () => {
    const next = !calm;
    setCalm(next);
    setReduceMotion(currentUser?.id, next);
  };
  const basicSwatch = isFemaleUser(currentUser) ? "#c93f64" : "#7f8c36";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title={tr("الإعدادات")}
        aria-label={tr("الإعدادات")}
        className="grid h-11 w-11 place-items-center rounded-full border border-brand-100/60 bg-paper/40 text-brand-950/60 hover:bg-surface-muted"
      >
        <Palette size={18} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute start-0 top-12 z-20 w-64 glass-panel rounded-3xl border border-brand-100/50 bg-paper/75 p-2 backdrop-blur-2xl backdrop-saturate-150">
            <p className="px-2 py-1.5 text-xs font-bold text-brand-950/45">{tr("لون الثيم")}</p>
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTheme(t.id);
                  setOpen(false);
                }}
                className={clsx(
                  "flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-sm font-semibold transition-colors",
                  theme === t.id ? "bg-surface-muted text-brand-950" : "text-brand-950/70 hover:bg-surface-muted",
                )}
              >
                <span
                  className="h-5 w-5 shrink-0 rounded-full border border-brand-950/10"
                  style={{ backgroundColor: t.id === "white" ? basicSwatch : t.swatch }}
                />
                <span className="flex-1 text-start">{t.label}</span>
                {theme === t.id && <Check size={15} className="text-brand-600" />}
              </button>
            ))}
            <div className="my-1.5 h-px bg-brand-100/40" />
            <button
              type="button"
              role="switch"
              aria-checked={calm}
              onClick={toggleCalm}
              className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-2 py-2 text-start hover:bg-surface-muted"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-brand-950">{tr("قلّل الحركة")}</span>
                <span className="block text-xs text-brand-950/60">{tr("يوقف كل الحركات والانتقالات بالموقع")}</span>
              </span>
              <span
                aria-hidden
                className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
                style={{ background: calm ? "linear-gradient(90deg,#FF6A00,#FF9A3C)" : "rgba(255,255,255,.14)" }}
              >
                <span
                  className="absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow transition-[inset-inline-start]"
                  style={{ insetInlineStart: calm ? 23 : 3 }}
                />
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
