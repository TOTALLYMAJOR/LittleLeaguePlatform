import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mapParentTransportationData } from "./transportation";

const baseInput = {
  parentUserId: "parent-requester",
  linkedPlayers: [{ id: "player-1", team_id: "team-1", first_name: "Mason", last_initial: "T" }],
  teams: [{ id: "team-1", name: "Tiny Tigers" }],
  events: [{
    id: "event-1",
    team_id: "team-1",
    title: "Tiny Tigers vs Rockets",
    starts_at: "2026-04-04T09:00:00.000Z",
    ends_at: "2026-04-04T10:00:00.000Z",
    status: "scheduled" as const,
    schedule_version: 1
  }],
  requests: [{
    id: "request-1",
    organization_id: "org-1",
    team_id: "team-1",
    event_id: "event-1",
    player_id: "player-1",
    requested_by_user_id: "parent-requester",
    direction: "outbound" as const,
    schedule_version: 1,
    status: "open" as const,
    requested_at: "2026-04-01T12:00:00.000Z"
  }],
  requestPlayers: [{ id: "player-1", team_id: "team-1", first_name: "Mason", last_initial: "T" }],
  assignments: [],
  profiles: [
    { id: "parent-requester", display_name: "Jordan Taylor" },
    { id: "parent-driver", display_name: "Riley Parker" }
  ],
  now: "2026-04-01T12:00:00.000Z"
};

describe("transportation responsibility", () => {
  const sql = readFileSync(
    join(process.cwd(), "supabase/migrations/0028_transportation_responsibility.sql"),
    "utf8"
  );
  const adapter = readFileSync(join(process.cwd(), "lib/supabase/transportation.ts"), "utf8");

  it("keeps an open request unassigned", () => {
    const data = mapParentTransportationData(baseInput);
    expect(data.requests[0]).toMatchObject({
      state: "open",
      stateLabel: "Requested",
      canOffer: false,
      canWithdrawRequest: true
    });
    expect(data.responsibilities[0]).toMatchObject({ state: "unassigned", adultLabel: undefined });
  });

  it("does not assign responsibility after only the driver offers", () => {
    const data = mapParentTransportationData({
      ...baseInput,
      assignments: [{
        id: "assignment-1",
        request_id: "request-1",
        requested_by_user_id: "parent-requester",
        driver_user_id: "parent-driver",
        direction: "outbound",
        seats: 2,
        schedule_version: 1,
        status: "awaiting_requester_acceptance"
      }]
    });
    expect(data.requests[0]).toMatchObject({
      state: "awaiting_requester_acceptance",
      driverLabel: "Riley Parker",
      canAccept: true
    });
    expect(data.responsibilities[0]?.state).toBe("unassigned");
  });

  it("shows an adult only after both approvals exist at the current version", () => {
    const data = mapParentTransportationData({
      ...baseInput,
      requests: [{ ...baseInput.requests[0], status: "matched" }],
      assignments: [{
        id: "assignment-1",
        request_id: "request-1",
        requested_by_user_id: "parent-requester",
        driver_user_id: "parent-driver",
        direction: "outbound",
        seats: 2,
        schedule_version: 1,
        status: "assigned"
      }]
    });
    expect(data.requests[0]?.state).toBe("assigned");
    expect(data.responsibilities[0]).toMatchObject({
      state: "assigned",
      adultLabel: "Riley Parker",
      scheduleVersion: 1
    });
  });

  it("makes accepted responsibility need review after an official version change", () => {
    const data = mapParentTransportationData({
      ...baseInput,
      events: [{ ...baseInput.events[0], schedule_version: 2 }],
      requests: [{ ...baseInput.requests[0], status: "matched" }],
      assignments: [{
        id: "assignment-1",
        request_id: "request-1",
        requested_by_user_id: "parent-requester",
        driver_user_id: "parent-driver",
        direction: "outbound",
        seats: 2,
        schedule_version: 1,
        status: "assigned"
      }]
    });
    expect(data.requests[0]?.state).toBe("schedule_changed");
    expect(data.responsibilities[0]).toMatchObject({ state: "needs_review", adultLabel: undefined });
  });

  it("requires guardian scope, mutual acceptance, current schedule version, and restriction checks in SQL", () => {
    expect(sql).toContain("guardian.parent_user_id = requesting_user_id");
    expect(sql).toContain("Only an active guardian on this team can offer transportation.");
    expect(sql).toContain("driver_accepted_at");
    expect(sql).toContain("requester_accepted_at = now()");
    expect(sql).toContain("status = 'assigned'");
    expect(sql).toContain("expected_schedule_version");
    expect(sql).toContain("transportation_pickup_restriction_exists");
    expect(sql).toContain("Responsibility remains unassigned");
  });

  it("keeps mutation entry points service-only, attributed, reversible, and provider-free", () => {
    expect(sql).toContain("to service_role");
    expect(sql).toContain("transportation_assignment_accepted");
    expect(sql).toContain("transportation_assignment_withdrawn");
    expect(sql).toContain("withdrawal_reason");
    expect(sql).toContain("No provider message was sent.");
    expect(adapter).toContain("safeMessages");
    expect(adapter).not.toContain("sendEmail");
    expect(adapter).not.toContain("sendSms");
    expect(adapter).not.toContain("message: error.message");
  });
});
