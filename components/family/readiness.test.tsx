import { describe, expect, it } from "vitest";
import type { FamilyMissionChild, FamilyMissionEvent } from "@/lib/family-mission-control";
import type { NotificationReceipt } from "@/lib/supabase/notification-receipts";
import type { ParentTransportationData } from "@/lib/supabase/transportation";
import { buildChildSaturdayReadiness } from "./readiness";

const child: FamilyMissionChild = {
  id: "player-1",
  label: "Mason T.",
  teamId: "team-1",
  teamName: "Tiny Tigers"
};

const event: FamilyMissionEvent = {
  projectionId: "event-1:player-1",
  eventId: "event-1",
  scheduleVersion: 3,
  childId: "player-1",
  childLabel: "Mason T.",
  teamId: "team-1",
  teamName: "Tiny Tigers",
  title: "Tiny Tigers game",
  activityLabel: "Game",
  dateLabel: "Sat, Apr 4",
  startLabel: "10:00 AM",
  startsAt: "2026-04-04T15:00:00.000Z",
  endsAt: "2026-04-04T17:00:00.000Z",
  arrivalLabel: "9:30 AM",
  leaveLabel: "9:00 AM",
  opponentLabel: "Rockets",
  venueLabel: "North Park",
  addressLabel: "100 Main St",
  fieldLabel: "Field 1",
  status: "scheduled",
  statusLabel: "Scheduled",
  rsvpLabel: "Going",
  rsvpNeedsAction: false,
  rsvpOutdated: false,
  responsibleAdultLabel: "Not assigned",
  transportationAssigned: false,
  outboundResponsibilityLabel: "Not assigned",
  returnResponsibilityLabel: "Not assigned",
  bringLabel: "Glove",
  changed: false,
  changedLabel: "No changes",
  sourceLabel: "Official schedule",
  freshnessLabel: "Loaded live",
  primaryAction: { label: "Open schedule", href: "/parent/schedule?eventId=event-1" },
  unresolved: []
};

const transportation: ParentTransportationData = {
  ok: true,
  message: "Loaded.",
  events: [],
  requests: [],
  responsibilities: []
};

function criticalReceipt(acknowledgedAt?: string): NotificationReceipt {
  return {
    notificationId: "notice-1",
    organizationId: "org-1",
    teamId: "team-1",
    eventId: "event-1",
    recipientUserId: "parent-1",
    title: "Weather delay",
    body: "Start time is under review.",
    channel: "email",
    notificationType: "weather_alert",
    notificationStatus: "read",
    providerApprovalStatus: "approved",
    createdAt: "2026-04-03T12:00:00.000Z",
    evidence: {
      attemptStatus: "sent",
      acknowledgedAt
    }
  };
}

function build(overrides: Partial<Parameters<typeof buildChildSaturdayReadiness>[0]> = {}) {
  return buildChildSaturdayReadiness({
    child,
    event,
    currentRsvp: "going",
    notificationReceipts: [],
    notificationLoadOk: true,
    transportationData: transportation,
    visibleChanges: [],
    eventChangeLoadOk: true,
    ...overrides
  });
}

describe("buildChildSaturdayReadiness", () => {
  it("keeps transportation neutral when no ride help was requested", () => {
    const summary = build();
    expect(summary.lanes.find((lane) => lane.id === "transportation")).toMatchObject({
      status: "neutral",
      detail: "No ride help requested"
    });
    expect(summary.lanes.find((lane) => lane.id === "critical-message")).toMatchObject({
      status: "neutral",
      detail: "No critical message exists"
    });
    const noEvent = build({
      event: undefined,
      notificationLoadOk: false,
      transportationData: { ...transportation, ok: false },
      eventChangeLoadOk: false
    });
    expect(noEvent.lanes.find((lane) => lane.id === "transportation")).toMatchObject({
      status: "neutral",
      detail: "Transportation is not required"
    });
    expect(noEvent.lanes.find((lane) => lane.id === "critical-message")).toMatchObject({ status: "neutral" });
    expect(noEvent.lanes.find((lane) => lane.id === "changes")).toMatchObject({ status: "neutral" });
    expect(noEvent.unresolvedItems).toEqual([]);
  });

  it("marks an accepted ride responsibility resolved and a pending request unresolved", () => {
    const resolved = build({
      transportationData: {
        ...transportation,
        responsibilities: [
          { eventId: "event-1", playerId: "player-1", direction: "outbound", state: "assigned", adultLabel: "Jordan P." },
          { eventId: "event-1", playerId: "player-1", direction: "return", state: "assigned", adultLabel: "Riley P." }
        ]
      }
    });
    expect(resolved.lanes.find((lane) => lane.id === "transportation")).toMatchObject({
      status: "resolved",
      detail: "Outbound: Jordan P. · Return: Riley P."
    });

    const unresolved = build({
      transportationData: {
        ...transportation,
        requests: [{
          id: "ride-1",
          eventId: "event-1",
          playerId: "player-1",
          childLabel: "Mason T.",
          teamName: "Tiny Tigers",
          eventTitle: "Tiny Tigers game",
          startsAt: event.startsAt,
          direction: "outbound",
          state: "open",
          stateLabel: "Needs a driver",
          scheduleVersion: 3,
          currentScheduleVersion: 3,
          requestedByLabel: "Jordan P.",
          requestedAt: "2026-04-03T10:00:00.000Z",
          canOffer: false,
          canAccept: false,
          canWithdrawRequest: true,
          canWithdrawAssignment: false,
          explanation: "Waiting for an offer."
        }]
      }
    });
    expect(unresolved.lanes.find((lane) => lane.id === "transportation")).toMatchObject({
      status: "unresolved",
      href: expect.stringContaining("#transportation-request-ride-1")
    });
  });

  it("requires an exact acknowledgement link only for an unacknowledged critical message", () => {
    const unresolved = build({ notificationReceipts: [criticalReceipt()] });
    expect(unresolved.lanes.find((lane) => lane.id === "critical-message")).toMatchObject({
      status: "unresolved",
      href: expect.stringContaining("#communication-message-notice-1")
    });

    const resolved = build({ notificationReceipts: [criticalReceipt("2026-04-03T13:00:00.000Z")] });
    expect(resolved.lanes.find((lane) => lane.id === "critical-message")).toMatchObject({
      status: "resolved",
      detail: "Acknowledged by you"
    });
  });

  it("keeps accepted transportation resolved and invalidated transportation unresolved", () => {
    const request = {
      id: "ride-1",
      eventId: "event-1",
      playerId: "player-1",
      childLabel: "Mason T.",
      teamName: "Tiny Tigers",
      eventTitle: "Tiny Tigers game",
      startsAt: event.startsAt,
      direction: "outbound" as const,
      state: "assigned" as const,
      stateLabel: "Accepted",
      scheduleVersion: 3,
      currentScheduleVersion: 3,
      requestedByLabel: "Jordan P.",
      driverLabel: "Riley P.",
      requestedAt: "2026-04-03T10:00:00.000Z",
      canOffer: false,
      canAccept: false,
      canWithdrawRequest: false,
      canWithdrawAssignment: true,
      explanation: "Accepted by the requester."
    };
    expect(build({
      transportationData: { ...transportation, requests: [request] }
    }).lanes.find((lane) => lane.id === "transportation")).toMatchObject({
      status: "resolved",
      detail: "Accepted responsibility is recorded"
    });
    expect(build({
      transportationData: {
        ...transportation,
        requests: [{
          ...request,
          state: "schedule_changed",
          stateLabel: "Schedule changed",
          explanation: "Review after the event changed."
        }]
      }
    }).lanes.find((lane) => lane.id === "transportation")).toMatchObject({
      status: "unresolved",
      detail: "Ride request needs review after the event changed"
    });
  });
});
