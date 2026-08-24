import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeId = "white" | "dark-green" | "black" | "navy";

export interface ThemeOption {
  id: ThemeId;
  label: string;
  swatch: string;
}

export const themes: ThemeOption[] = [
  { id: "white", label: "الأساسي", swatch: "#c93f64" },
  { id: "dark-green", label: "أخضر غامق", swatch: "#0e3a2a" },
  { id: "black", label: "أسود", swatch: "#0a0a0a" },
  { id: "navy", label: "كحلي", swatch: "#0e2340" },
];

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = "nursync.theme";

function applyTheme(theme: ThemeId) {
  if (theme === "white") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    return stored && themes.some((t) => t.id === stored) ? stored : "white";
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (next: ThemeId) => {
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
