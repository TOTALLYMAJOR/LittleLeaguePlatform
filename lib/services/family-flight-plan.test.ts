import { describe, expect, it } from "vitest";
import { familyEventGear, findFamilyFlightConflicts } from "./family-flight-plan";

describe("family flight plan rules", () => {
  it("detects overlaps only across different linked children", () => {
    const conflicts = findFamilyFlightConflicts([
      {
        playerId: "player-a",
        playerName: "Avery A.",
        event: { id: "event-a", startsAt: "2026-07-20T15:00:00.000Z", endsAt: "2026-07-20T16:30:00.000Z" }
      },
      {
        playerId: "player-b",
        playerName: "Mason M.",
        event: { id: "event-b", startsAt: "2026-07-20T16:00:00.000Z", endsAt: "2026-07-20T17:00:00.000Z" }
      },
      {
        playerId: "player-a",
        playerName: "Avery A.",
        event: { id: "event-c", startsAt: "2026-07-20T15:30:00.000Z", endsAt: "2026-07-20T16:15:00.000Z" }
      }
    ]);

    expect(conflicts).toHaveLength(2);
    expect(conflicts.every((conflict) => conflict.leftPlayerId !== conflict.rightPlayerId)).toBe(true);
  });

  it("keeps gear guidance tied to event type", () => {
    expect(familyEventGear("game")).toContain("Uniform");
    expect(familyEventGear("practice")).toContain("Practice gear");
  });
});
