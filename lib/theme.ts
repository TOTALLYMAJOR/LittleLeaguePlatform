export const COLOR_THEME_STORAGE_KEY = "leaguepilot-color-theme:v1";

export type ColorTheme = "light" | "dark";

export function isColorTheme(value: unknown): value is ColorTheme {
  return value === "light" || value === "dark";
}

export const COLOR_THEME_PREPAINT_SCRIPT = `(() => {
  try {
    const savedTheme = window.localStorage.getItem(${JSON.stringify(COLOR_THEME_STORAGE_KEY)});
    document.documentElement.dataset.theme = savedTheme === "dark" ? "dark" : "light";
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();`;
