import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { seedState, type AppState } from "@/lib/domain";
import { FamilyFlightPlanClient } from "./coordination-workbenches";

describe("FamilyFlightPlanClient", () => {
  it("starts caregiver coordination blank and does not imply transportation authority", () => {
    const state: AppState = {
      ...seedState,
      events: seedState.events.map((event) => event.id === "event-tigers-game"
        ? {
          ...event,
          startsAt: "2099-04-04T09:00:00.000Z",
          endsAt: "2099-04-04T10:00:00.000Z"
        }
        : event)
    };

    const html = renderToStaticMarkup(
      <FamilyFlightPlanClient
        state={state}
        parentUserId="user-parent-jordan"
        initialHandoffs={[]}
        message="Current coordination notes loaded."
      />
    );

    expect(html).toContain("Family coordination notes");
    expect(html).toContain("does not assign transportation");
    expect(html).toContain("No authorization");
    expect(html).toContain("Save coordination note");
    expect(html).toContain("placeholder=\"Enter a name or relationship\"");
    expect(html).toContain("placeholder=\"Add only the details your family needs for this event\"");
    expect(html).not.toContain("Grandparent pickup");
    expect(html).not.toContain("Meet at the team check-in flag");
  });
});
