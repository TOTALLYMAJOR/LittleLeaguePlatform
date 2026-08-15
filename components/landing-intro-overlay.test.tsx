import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LandingIntroOverlay } from "./landing-intro-overlay";

describe("LandingIntroOverlay", () => {
  it("renders nothing on the server so the landing page paints without it", () => {
    expect(renderToStaticMarkup(<LandingIntroOverlay />)).toBe("");
  });

  it("keeps the replay guard, skip control, and reduced-motion opt-out", () => {
    const source = readFileSync(join(process.cwd(), "components", "landing-intro-overlay.tsx"), "utf8");
    expect(source).toContain("leaguepilot-intro-seen:v1");
    expect(source).toContain("prefers-reduced-motion");
    expect(source).toContain("Skip intro");
    expect(source).toContain("Escape");
  });

  it("leaves the dedication to the landing page, which shows through the transparent overlay", () => {
    const overlay = readFileSync(join(process.cwd(), "components", "landing-intro-overlay.tsx"), "utf8");
    const page = readFileSync(join(process.cwd(), "app", "page.tsx"), "utf8");
    // Rendered once, by the page — repeating it in the overlay would double the text.
    expect(page).toContain("Built in honor of Pearl River Youth Sport Administrators and Volunteers");
    expect(overlay).not.toContain("Built in honor of Pearl River");
  });

  it("keeps the sky, the rain-delay ticker, and the mascot flip — and drops the stick-figure chaos, photo interludes, and falling rain", () => {
    const source = readFileSync(join(process.cwd(), "components", "landing-intro-overlay.tsx"), "utf8");
    expect(source).toContain("li-clouds");
    expect(source).toContain("li-sun");
    expect(source).toContain("li-mascots");
    expect(source).toContain("li-badge-final");
    expect(source).toContain("li-ticker");
    expect(source).toContain("GAME POSTPONED");
    expect(source).not.toContain("li-chaos");
    expect(source).not.toContain("li-cinema");
    expect(source).not.toContain("li-rain");
    expect(source).not.toContain("next/image");
  });

  it("shows eight cheery, full-color sport badges outside the grayscale world", () => {
    const source = readFileSync(join(process.cwd(), "components", "landing-intro-overlay.tsx"), "utf8");
    expect(source).toContain("li-joy-badge");
    const joySportsBlock = source.slice(source.indexOf("const JOY_SPORTS"), source.indexOf("const TICKER_ITEMS"));
    const sportCount = (joySportsBlock.match(/key: "/g) ?? []).length;
    expect(sportCount).toBe(8);
  });

  it("tells the story in accessible text and keeps child privacy rules on the schedule board", () => {
    const source = readFileSync(join(process.cwd(), "components", "landing-intro-overlay.tsx"), "utf8");
    expect(source).toContain("sr-only");
    expect(source).toContain("Nobody gets paid");
    // Board names are volunteer coaches (first name + last initial), never players.
    expect(source).toMatch(/Coach [A-Z][a-z]+ [A-Z]\./);
  });
});
