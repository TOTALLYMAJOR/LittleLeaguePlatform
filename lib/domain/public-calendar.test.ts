import { describe, expect, it } from "vitest";
import { seedState } from "./seed";
import { buildPublicEventCalendarActions, publicArrivalLabel } from "./public-calendar";

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
});
