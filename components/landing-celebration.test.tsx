import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LandingCelebration } from "./landing-celebration";

describe("LandingCelebration", () => {
  it("renders the opaque opening curtain in the server response", () => {
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

  it("contains reduced-motion, interaction containment, and fallback release safeguards", () => {
    const source = readFileSync(join(process.cwd(), "components", "landing-celebration.tsx"), "utf8");
    const styles = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8");

    expect(source).toContain("prefers-reduced-motion");
    expect(source).toContain('setAttribute("inert", "")');
    expect(source).toContain('removeAttribute("inert")');
    expect(source).toContain("setTimeout(dismiss, FALLBACK_MS)");
    expect(source).toContain('event.animationName === "landing-celebration-curtain"');
    expect(styles).toContain("z-index: calc(var(--z-modal) + 1)");
    expect(styles).toContain("99.9% {");
    expect(styles).toContain("pointer-events: none");
  });
});
