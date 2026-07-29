import { describe, expect, it } from "vitest";
import { isOfflineActionAllowed, outboxDisplayState, type OfflineGameDayAction } from "./game-day-outbox";

function action(overrides: Partial<OfflineGameDayAction> = {}): OfflineGameDayAction {
  return {
    actionId: "action-1",
    actionType: "rsvp",
    contextKey: "parent:org:season:team",
    endpoint: "/api/rsvps",
    payload: {},
    queuedAt: "2026-07-19T10:00:00.000Z",
    retryCount: 0,
    baseRecordVersion: 0,
    baseScheduleVersion: 1,
    ...overrides
  };
}

describe("game-day offline outbox policy", () => {
  it("queues only the three approved low-authority action types", () => {
    expect(isOfflineActionAllowed("rsvp")).toBe(true);
    expect(isOfflineActionAllowed("attendance")).toBe(true);
    expect(isOfflineActionAllowed("coach_note")).toBe(true);
    expect(isOfflineActionAllowed("publish")).toBe(false);
    expect(isOfflineActionAllowed("volunteer_claim")).toBe(false);
  });

  it("keeps response state separate from sync evidence", () => {
    expect(outboxDisplayState(action())).toBe("Waiting to sync");
    expect(outboxDisplayState(action({ attemptedAt: "2026-07-19T10:01:00.000Z", retryCount: 1 }))).toBe("Retry online");
    expect(outboxDisplayState(action({ conflictDetail: "Schedule changed." }))).toBe("Sync conflict");
    expect(outboxDisplayState(action({ succeededAt: "2026-07-19T10:02:00.000Z" }))).toBe("Synced");
  });
});
