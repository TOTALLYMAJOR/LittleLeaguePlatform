import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LandingCelebration } from "./landing-celebration";

describe("LandingCelebration", () => {
  it("renders the decorative celebration in the server response", () => {
    const html = renderToStaticMarkup(<LandingCelebration />);

    expect(html).toContain("data-landing-celebration");
    expect(html).toContain("landing-celebration-ball");
    expect(html).toContain("landing-celebration-crowd");
    expect(html).not.toContain("<button");
  });

  it("keeps the decorative scene out of the accessibility tree", () => {
    const html = renderToStaticMarkup(<LandingCelebration />);

    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
  });

  it("keeps the celebration non-blocking while preserving reduced-motion and fallback safeguards", () => {
    const source = readFileSync(join(process.cwd(), "components", "landing-celebration.tsx"), "utf8");
    const styles = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");
    const curtainStart = styles.indexOf("@keyframes landing-celebration-curtain");
    const curtainEnd = styles.indexOf("@media (max-width: 760px)", curtainStart);
    const curtainStyles = styles.slice(curtainStart, curtainEnd);

    expect(source).toContain("prefers-reduced-motion");
    expect(source).not.toContain('setAttribute("inert", "")');
    expect(source).not.toContain('removeAttribute("inert")');
    expect(source).not.toContain('root.style.overflow = "hidden"');
    expect(source).toContain("setTimeout(dismiss, FALLBACK_MS)");
    expect(source).toContain('event.animationName === "landing-celebration-curtain"');
    expect(styles).toContain("z-index: calc(var(--z-modal) + 1)");
    expect(styles).toMatch(/\.landing-celebration\s*\{[\s\S]*?background:\s*transparent;[\s\S]*?pointer-events:\s*none;/);
    expect(styles).toContain("99.9% {");
    expect(curtainStyles).not.toContain("pointer-events: auto");
    expect(styles).toMatch(/@media \(forced-colors: active\)[\s\S]*?\.landing-celebration\s*\{[\s\S]*?background:\s*transparent;/);
  });
});
