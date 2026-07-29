import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildRecurringScheduleOccurrences,
  findScheduleConflicts
} from "./schedule-management";

describe("schedule management helpers", () => {
  it("expands bounded weekly recurring schedule occurrences", () => {
    const occurrences = buildRecurringScheduleOccurrences({
      startsAt: "2026-07-01T22:00:00.000Z",
      endsAt: "2026-07-01T23:00:00.000Z",
      recurrence: {
        frequency: "weekly",
        count: 3,
        intervalWeeks: 2
      }
    });

    expect(occurrences).toEqual([
      {
        startsAt: "2026-07-01T22:00:00.000Z",
        endsAt: "2026-07-01T23:00:00.000Z",
        instanceIndex: 0
      },
      {
        startsAt: "2026-07-15T22:00:00.000Z",
        endsAt: "2026-07-15T23:00:00.000Z",
        instanceIndex: 1
      },
      {
        startsAt: "2026-07-29T22:00:00.000Z",
        endsAt: "2026-07-29T23:00:00.000Z",
        instanceIndex: 2
      }
    ]);
  });

  it("detects team conflicts and managed venue conflicts across occurrences", () => {
    const conflicts = findScheduleConflicts({
      teamId: "team-1",
      fieldLocationId: "field-1",
      locationName: "Field 1",
      locationAddress: "100 League Way",
      occurrences: [
        {
          startsAt: "2026-07-01T22:30:00.000Z",
          endsAt: "2026-07-01T23:30:00.000Z",
          instanceIndex: 0
        }
      ],
      existingEvents: [
        {
          id: "same-team",
          title: "Same team practice",
          team_id: "team-1",
          field_location_id: "field-2",
          location_name: "Field 2",
          location_address: "100 League Way",
          starts_at: "2026-07-01T22:00:00.000Z",
          ends_at: "2026-07-01T23:00:00.000Z",
          status: "scheduled"
        },
        {
          id: "same-field",
          title: "Other team game",
          team_id: "team-2",
          field_location_id: "field-1",
          location_name: "Different label",
          location_address: "100 League Way",
          starts_at: "2026-07-01T23:00:00.000Z",
          ends_at: "2026-07-02T00:00:00.000Z",
          status: "scheduled"
        },
        {
          id: "cancelled",
          title: "Cancelled hold",
          team_id: "team-3",
          field_location_id: "field-1",
          location_name: "Field 1",
          location_address: "100 League Way",
          starts_at: "2026-07-01T22:30:00.000Z",
          ends_at: "2026-07-01T23:30:00.000Z",
          status: "cancelled"
        }
      ]
    });

    expect(conflicts.map((conflict) => conflict.id)).toEqual(["same-team", "same-field"]);
    expect(conflicts[0]?.reasons).toEqual(["team overlap"]);
    expect(conflicts[1]?.reasons).toEqual(["venue overlap"]);
  });

  it("checks conflicts before creating a recurring series and cleans up failed saves", () => {
    const implementation = readFileSync(
      join(process.cwd(), "lib/supabase/schedule-management.ts"),
      "utf8"
    );
    const conflictGuard = implementation.indexOf("if (conflicts.length)");
    const seriesInsert = implementation.indexOf('.from("event_series")');

    expect(conflictGuard).toBeGreaterThan(0);
    expect(seriesInsert).toBeGreaterThan(conflictGuard);
    expect(implementation).toContain("if (createdEventSeries)");
    expect(implementation).toContain('.from("event_series").delete().eq("id", eventSeriesId)');
  });
});
