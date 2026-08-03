"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { COLOR_THEME_STORAGE_KEY, isColorTheme, type ColorTheme } from "@/lib/theme";

function readTheme(): ColorTheme {
  const rootTheme = document.documentElement.dataset.theme;
  return isColorTheme(rootTheme) ? rootTheme : "light";
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ColorTheme>("light");

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  function selectTheme(nextTheme: ColorTheme) {
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;
    try {
      window.localStorage.setItem(COLOR_THEME_STORAGE_KEY, nextTheme);
    } catch {
      // The selected theme still applies for this page when storage is unavailable.
    }
    setTheme(nextTheme);
  }

  const nextTheme: ColorTheme = theme === "light" ? "dark" : "light";
  const label = `Use ${nextTheme} mode`;

  return (
    <button
      type="button"
      className={`theme-toggle${compact ? " theme-toggle-compact" : ""}`}
      aria-label={label}
      title={label}
      onClick={() => selectTheme(nextTheme)}
    >
      {theme === "light" ? <Moon aria-hidden="true" size={17} /> : <Sun aria-hidden="true" size={17} />}
      <span>{theme === "light" ? "Dark" : "Light"}</span>
    </button>
  );
}
