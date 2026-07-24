import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ParentTransportationData } from "@/lib/supabase/transportation";
import { ParentTransportationClient } from "./family-transportation";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() })
}));

const data: ParentTransportationData = {
  ok: true,
  message: "Current records loaded.",
  events: [{
    projectionId: "event-1:player-1",
    eventId: "event-1",
    playerId: "player-1",
    childLabel: "Mason T.",
    teamName: "Tiny Tigers",
    title: "Tiny Tigers vs Rockets",
    startsAt: "2026-04-04T09:00:00.000Z",
    scheduleVersion: 2
  }],
  requests: [{
    id: "request-1",
    assignmentId: "assignment-1",
    eventId: "event-1",
    playerId: "player-1",
    childLabel: "Mason T.",
    teamName: "Tiny Tigers",
    eventTitle: "Tiny Tigers vs Rockets",
    startsAt: "2026-04-04T09:00:00.000Z",
    direction: "outbound",
    state: "awaiting_requester_acceptance",
    stateLabel: "Awaiting requesting guardian",
    scheduleVersion: 2,
    currentScheduleVersion: 2,
    requestedByLabel: "Jordan Taylor",
    driverLabel: "Riley Parker",
    seats: 2,
    requestedAt: "2026-04-01T12:00:00.000Z",
    canOffer: false,
    canAccept: true,
    canWithdrawRequest: false,
    canWithdrawAssignment: true,
    explanation: "Riley Parker offered and accepted the driver side. Responsibility remains unassigned until Jordan accepts."
  }],
  responsibilities: [{
    eventId: "event-1",
    playerId: "player-1",
    direction: "outbound",
    state: "unassigned"
  }]
};

describe("ParentTransportationClient", () => {
  it("keeps outbound and return explicit and does not imply one-sided assignment", () => {
    const html = renderToStaticMarkup(<ParentTransportationClient data={data} />);
    expect(html).toContain("Who is getting this child there and home?");
    expect(html).toContain("Outbound · getting there");
    expect(html).toContain("Return · getting home");
    expect(html).toContain("Awaiting requesting guardian");
    expect(html).toContain("Not assigned");
    expect(html).toContain("Two adults, two explicit decisions");
    expect(html).toContain("Accept and assign responsibility");
    expect(html).toContain("No home address is displayed or requested");
    expect(html).toContain("No automation, coach note, or chat reply can assign a driver");
  });

  it("fails closed when migration-backed coordination is unavailable", () => {
    const html = renderToStaticMarkup(<ParentTransportationClient data={{
      ok: false,
      message: "Transportation coordination is temporarily unavailable. No responsibility changed.",
      events: [],
      requests: [],
      responsibilities: []
    }} />);
    expect(html).toContain("No responsibility changed");
    expect(html).toContain("No upcoming event");
    expect(html).toContain("No transportation records yet");
    expect(html).not.toContain("Riley Parker");
  });
});
