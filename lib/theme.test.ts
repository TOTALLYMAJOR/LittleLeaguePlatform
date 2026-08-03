import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import {
  COLOR_THEME_PREPAINT_SCRIPT,
  COLOR_THEME_STORAGE_KEY,
  isColorTheme
} from "./theme";

function runPrepaint(savedTheme: string | null, storageThrows = false) {
  const dataset: Record<string, string> = {};
  runInNewContext(COLOR_THEME_PREPAINT_SCRIPT, {
    document: { documentElement: { dataset } },
    window: {
      localStorage: {
        getItem: (key: string) => {
          expect(key).toBe(COLOR_THEME_STORAGE_KEY);
          if (storageThrows) throw new Error("storage unavailable");
          return savedTheme;
        }
      }
    }
  });
  return dataset.theme;
}

describe("manual color theme", () => {
  it("accepts only the two supported explicit themes", () => {
    expect(isColorTheme("light")).toBe(true);
    expect(isColorTheme("dark")).toBe(true);
    expect(isColorTheme("system")).toBe(false);
    expect(isColorTheme(undefined)).toBe(false);
  });

  it("defaults to light without consulting the device preference", () => {
    expect(runPrepaint(null)).toBe("light");
    expect(runPrepaint("system")).toBe("light");
    expect(runPrepaint(null, true)).toBe("light");
  });

  it("restores a saved dark selection before interactive hydration", () => {
    expect(runPrepaint("dark")).toBe("dark");
    expect(runPrepaint("light")).toBe("light");
  });
});
