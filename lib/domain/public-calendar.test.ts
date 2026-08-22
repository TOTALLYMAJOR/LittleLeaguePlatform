import { describe, expect, it } from "vitest";
import { seedState } from "./seed";
import { buildPublicEventCalendarActions, formatPublicEventDateParts, publicArrivalLabel } from "./public-calendar";

describe("public calendar actions", () => {
  const event = seedState.events[0];

  it("builds provider actions without changing event truth", () => {
    const actions = buildPublicEventCalendarActions(event, "Tiny Tigers");

    expect(actions.googleUrl).toContain("calendar.google.com");
    expect(actions.outlookUrl).toContain("outlook.live.com");
    expect(decodeURIComponent(actions.downloadUrl)).toContain("PRODID:-//LeaguePilot//Public Schedule//EN");
    expect(decodeURIComponent(actions.appleUrl)).toContain("STATUS:CONFIRMED");
    expect(actions.fileName).toBe(`${event.id}.ics`);
    expect(event.status).toBe("scheduled");
  });

  it("does not invent an official arrival time", () => {
    expect(publicArrivalLabel(event)).toBe("Not published");
    expect(publicArrivalLabel({ ...event, status: "cancelled" })).toBe("Do not travel");
  });

  it("formats public event text in the league timezone instead of the server timezone", () => {
    const originalTimeZone = process.env.TZ;
    process.env.TZ = "UTC";

    try {
      expect(formatPublicEventDateParts("2026-08-22T00:30:00.000Z")).toEqual({
        date: "Fri, Aug 21",
        time: "7:30 PM"
      });
    } finally {
      if (originalTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimeZone;
    }
  });
});
