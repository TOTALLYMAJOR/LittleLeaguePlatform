import { describe, expect, it } from "vitest";
import { validateGameDayResolution } from "./game-day-resolution";

describe("game-day resolution validation", () => {
  const now = Date.parse("2026-07-20T12:00:00.000Z");

  it("requires a future start time only for delay decisions", () => {
    expect(validateGameDayResolution({
      eventId: "event-1",
      decision: "delay",
      reason: "Lightning window requires a delayed start.",
      startsAt: "2026-07-20T14:00:00.000Z",
      idempotencyKey: "resolution-1",
      now
    }).ok).toBe(true);

    expect(validateGameDayResolution({
      eventId: "event-1",
      decision: "delay",
      reason: "Lightning window requires a delayed start.",
      startsAt: "2026-07-20T11:00:00.000Z",
      idempotencyKey: "resolution-2",
      now
    }).ok).toBe(false);
  });

  it("accepts monitor decisions while preserving the human-review receipt", () => {
    expect(validateGameDayResolution({
      eventId: "event-1",
      decision: "monitor",
      reason: "Conditions are below the league threshold.",
      idempotencyKey: "resolution-3",
      now
    })).toEqual({ ok: true, message: "Resolution is ready for human review." });
  });
});
