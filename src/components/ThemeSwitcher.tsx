import { useState } from "react";
import { Check, Palette } from "lucide-react";
import clsx from "clsx";
import { themes, useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { isFemaleUser } from "../lib/gender";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const basicSwatch = isFemaleUser(currentUser) ? "#c93f64" : "#7f8c36";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title="ثيم الموقع"
        className="rounded-xl border border-brand-100 p-2 text-brand-950/60 hover:bg-surface-muted"
      >
        <Palette size={18} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute start-0 top-12 z-20 w-48 rounded-2xl border border-brand-100 bg-paper p-2 shadow-lg shadow-brand-950/10">
            <p className="px-2 py-1.5 text-xs font-bold text-brand-950/45">اختر لون الثيم</p>
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
          </div>
        </>
      )}
    </div>
  );
}
