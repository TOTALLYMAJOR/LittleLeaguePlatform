import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Family component acceptance contracts", () => {
  it("defines changed-state tokens once in the canonical root source", () => {
    const globals = source("app/globals.css");
    const family = source("app/parent/parent-weekly.css");
    expect(globals.match(/--status-changed:/g)).toHaveLength(1);
    expect(globals.match(/--status-changed-soft:/g)).toHaveLength(1);
    expect(family).not.toMatch(/--status-changed(?:-soft)?:/);
  });

  it("provides explicit forced-colors boundaries for every new Family component", () => {
    const family = source("app/parent/parent-weekly.css");
    const forcedColors = family.slice(family.lastIndexOf("@media (forced-colors: active)"));
    for (const selector of [
      ".family-status-chip",
      ".family-filter button",
      ".family-change-band",
      ".family-event-passport",
      ".family-readiness-strip",
      ".family-rsvp-options button",
      ".family-child-readiness"
    ]) {
      expect(forcedColors).toContain(selector);
    }
    expect(forcedColors).toContain("CanvasText");
    expect(forcedColors).toContain("Highlight");
    expect(forcedColors).toContain("GrayText");
    expect(forcedColors).not.toContain("forced-color-adjust: none");
  });

  it("retires the raw-green RSVP glow selector from Family routes", () => {
    expect(source("app/globals.css")).not.toContain(".parent-rsvp-glow");
    expect(source("components/feature-panels.tsx")).not.toContain("parent-rsvp-glow");
  });

  it("keeps Schedule date and Event Passport controls at the family touch-target floor", () => {
    const globals = source("app/globals.css");
    const scheduleActions = globals.slice(
      globals.indexOf(".parent-schedule-directions,"),
      globals.indexOf(".parent-schedule-card-actions")
    );
    const weekHeaderButton = globals.slice(
      globals.indexOf(".parent-week-ribbon > header button {"),
      globals.indexOf('.parent-week-ribbon > header button[aria-pressed="true"]')
    );
    expect(scheduleActions).toContain("min-height: 44px");
    expect(weekHeaderButton).toContain("min-height: 44px");
    expect(globals).toContain("grid-template-columns: repeat(7, minmax(44px, 1fr))");
    expect(globals).toContain("overflow-x: auto");
  });

  it("keeps RSVP hover and focus paints inside the shared status grammar", () => {
    const family = source("app/parent/parent-weekly.css");
    const interactionPaints = family.slice(
      family.indexOf(".family-rsvp-options button:hover:not(:disabled)"),
      family.indexOf(".family-rsvp-options button:disabled")
    );

    expect(interactionPaints).toContain("background: var(--accent-soft)");
    expect(interactionPaints).toContain("color: var(--accent-strong)");
    expect(interactionPaints).toContain('button.is-selected[data-response="going"]');
    expect(interactionPaints).toContain('button.is-selected[data-response="maybe"]');
    expect(interactionPaints).toContain('button.is-selected[data-response="not_going"]');
  });
});
