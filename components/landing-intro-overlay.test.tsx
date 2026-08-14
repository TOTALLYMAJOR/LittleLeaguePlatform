import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LandingIntroOverlay } from "./landing-intro-overlay";

describe("LandingIntroOverlay", () => {
  it("renders nothing on the server so the landing page paints without it", () => {
    expect(renderToStaticMarkup(<LandingIntroOverlay />)).toBe("");
  });

  it("keeps the dedication, replay guard, skip control, and reduced-motion opt-out", () => {
    const source = readFileSync(join(process.cwd(), "components", "landing-intro-overlay.tsx"), "utf8");
    expect(source).toContain("Built in honor of Pearl River Youth Sport Administrators and Volunteers");
    expect(source).toContain("leaguepilot-intro-seen:v1");
    expect(source).toContain("prefers-reduced-motion");
    expect(source).toContain("Skip intro");
    expect(source).toContain("Escape");
  });

  it("keeps the cinematic beats: weather layers, photo interludes, and the mascot flip", () => {
    const source = readFileSync(join(process.cwd(), "components", "landing-intro-overlay.tsx"), "utf8");
    expect(source).toContain("li-rain");
    expect(source).toContain("li-clouds");
    expect(source).toContain("li-sun");
    expect(source).toContain("li-cinema");
    expect(source).toContain("leaguepilot-game-day-parent.png");
    expect(source).toContain("leaguepilot-baseball-field-overhead.webp");
    expect(source).toContain("li-mascots");
    expect(source).toContain("li-badge-final");
    expect(source).toContain("Every Saturday starts in a parking lot");
  });

  it("tells the story in accessible text and keeps child privacy rules on the schedule board", () => {
    const source = readFileSync(join(process.cwd(), "components", "landing-intro-overlay.tsx"), "utf8");
    expect(source).toContain("sr-only");
    expect(source).toContain("Nobody gets paid");
    // Board names are volunteer coaches (first name + last initial), never players.
    expect(source).toMatch(/Coach [A-Z][a-z]+ [A-Z]\./);
  });
});
