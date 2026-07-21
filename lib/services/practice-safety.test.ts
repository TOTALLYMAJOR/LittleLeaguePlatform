import { describe, expect, it } from "vitest";
import {
  formatWaterBreakCountdown,
  remainingWaterBreakSeconds,
  waterBreakMinutePresets
} from "./practice-safety";

describe("practice safety timer", () => {
  it("uses short coach-ready water break presets", () => {
    expect(waterBreakMinutePresets).toEqual([3, 5, 8]);
  });

  it("recovers remaining time from the target timestamp", () => {
    expect(remainingWaterBreakSeconds(10_500, 9_000)).toBe(2);
    expect(remainingWaterBreakSeconds(9_000, 10_500)).toBe(0);
  });

  it("formats a stable minute and second display", () => {
    expect(formatWaterBreakCountdown(305)).toBe("05:05");
    expect(formatWaterBreakCountdown(-1)).toBe("00:00");
  });
});
