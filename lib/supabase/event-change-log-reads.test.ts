import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdminClient } from "./admin";
import { listParentEventChangeLogs } from "./event-change-log-reads";

vi.mock("server-only", () => ({}));
vi.mock("./admin", () => ({
  createSupabaseAdminClient: vi.fn()
}));

const createSupabaseAdminClientMock = vi.mocked(createSupabaseAdminClient);

function query(result: { data: unknown[] | null; error?: { message?: string } | null }, calls: Array<{ table: string; method: string; args: unknown[] }>, table: string) {
  const builder = {
    select(...args: unknown[]) { calls.push({ table, method: "select", args }); return builder; },
    eq(...args: unknown[]) { calls.push({ table, method: "eq", args }); return builder; },
    in(...args: unknown[]) { calls.push({ table, method: "in", args }); return builder; },
    gte(...args: unknown[]) { calls.push({ table, method: "gte", args }); return builder; },
    lte(...args: unknown[]) { calls.push({ table, method: "lte", args }); return builder; },
    order(...args: unknown[]) { calls.push({ table, method: "order", args }); return builder; },
    limit(...args: unknown[]) { calls.push({ table, method: "limit", args }); return builder; },
    then(resolve: (value: typeof result) => unknown, reject: (reason: unknown) => unknown) {
      return Promise.resolve(result).then(resolve, reject);
    }
  };
  return builder;
}

function client(results: Record<string, Array<{ data: unknown[] | null; error?: { message?: string } | null }>>) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  return {
    calls,
    from(table: string) {
      const next = results[table]?.shift() ?? { data: [], error: null };
      return query(next, calls, table);
    }
  };
}

describe("listParentEventChangeLogs", () => {
  beforeEach(() => {
    createSupabaseAdminClientMock.mockReset();
  });

  it("returns deterministic parent-scoped field diffs without raw audit payload", async () => {
    const db = client({
      player_guardians: [{ data: [{ player_id: "player-1", parent_user_id: "parent-1", status: "active" }] }],
      players: [{ data: [{ id: "player-1", organization_id: "org-1", season_id: "season-1", team_id: "team-1", first_name: "Mason", last_initial: "T" }] }],
      teams: [{ data: [{ id: "team-1", organization_id: "org-1", season_id: "season-1", name: "Tiny Tigers" }] }],
      events: [{ data: [{ id: "event-1", organization_id: "org-1", season_id: "season-1", team_id: "team-1", title: "Tiny Tigers Practice" }] }],
      event_change_logs: [{
        data: [{
          id: "change-1",
          event_id: "event-1",
          organization_id: "org-1",
          team_id: "team-1",
          actor_user_id: "coach-1",
          change_type: "time_changed",
          before_json: {
            starts_at: "2026-04-04T23:00:00.000Z",
            internal_notes: "do not return",
            guardian_phone: "private"
          },
          after_json: {
            starts_at: "2026-04-04T22:30:00.000Z",
            internal_notes: "still private",
            authorization_metadata: { role: "coach" }
          },
          created_at: "2026-04-03T12:00:00.000Z"
        }, {
          id: "change-other-team",
          event_id: "event-other",
          organization_id: "org-other",
          team_id: "team-other",
          actor_user_id: "coach-other",
          change_type: "cancelled",
          before_json: { status: "scheduled" },
          after_json: { status: "cancelled", private_child_name: "Do not expose" },
          created_at: "2026-04-03T13:00:00.000Z"
        }]
      }],
      profiles: [{ data: [{ id: "coach-1", display_name: "Coach Taylor" }] }],
      field_locations: [{ data: [] }]
    });
    createSupabaseAdminClientMock.mockReturnValue(db as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const result = await listParentEventChangeLogs({ parentUserId: "parent-1", limit: 200 });

    expect(result.ok).toBe(true);
    expect(result.scope).toMatchObject({ organizationId: "org-1", seasonId: "season-1", limit: 50 });
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toMatchObject({
      eventId: "event-1",
      eventTitle: "Tiny Tigers Practice",
      actorLabel: "Coach Taylor",
      canonicalHref: "/parent/schedule?eventId=event-1",
      childIds: ["player-1"],
      childLabels: ["Mason T."]
    });
    expect(result.changes[0].diffs).toEqual([{
      field: "start_time",
      label: "Start time",
      previousValue: "6:00 PM",
      currentValue: "5:30 PM"
    }]);
    expect(JSON.stringify(result)).not.toContain("internal_notes");
    expect(JSON.stringify(result)).not.toContain("guardian_phone");
    expect(JSON.stringify(result)).not.toContain("authorization_metadata");
    expect(JSON.stringify(result)).not.toContain("change-other-team");
    expect(JSON.stringify(result)).not.toContain("private_child_name");
    expect(db.calls.filter((call) => call.table === "event_change_logs" && call.method === "order")).toHaveLength(2);
    expect(db.calls.find((call) => call.table === "event_change_logs" && call.method === "limit")?.args).toEqual([50]);
    expect(db.calls.some((call) => call.table === "events" && call.method === "gte" && call.args[0] === "ends_at")).toBe(true);
    expect(db.calls.some((call) => call.table === "events" && call.method === "lte" && call.args[0] === "starts_at")).toBe(true);
  });

  it("returns a legitimate empty family scope without presenting a read failure", async () => {
    const db = client({
      player_guardians: [{ data: [] }]
    });
    createSupabaseAdminClientMock.mockReturnValue(db as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const result = await listParentEventChangeLogs({ parentUserId: "parent-1" });

    expect(result.ok).toBe(true);
    expect(result.scope.familyContextKey).toBe("no-linked-children");
    expect(result.changes).toEqual([]);
    expect(db.calls.some((call) => call.table === "event_change_logs")).toBe(false);
  });

  it("keeps a location change visible when the writer omits a field-level location value", async () => {
    const db = client({
      player_guardians: [{ data: [{ player_id: "player-1", parent_user_id: "parent-1", status: "active" }] }],
      players: [{ data: [{ id: "player-1", organization_id: "org-1", season_id: "season-1", team_id: "team-1", first_name: "Mason", last_initial: "T" }] }],
      teams: [{ data: [{ id: "team-1", organization_id: "org-1", season_id: "season-1", name: "Tiny Tigers" }] }],
      events: [{ data: [{ id: "event-1", organization_id: "org-1", season_id: "season-1", team_id: "team-1", title: "Tiny Tigers Practice" }] }],
      event_change_logs: [{
        data: [{
          id: "change-location",
          event_id: "event-1",
          organization_id: "org-1",
          team_id: "team-1",
          actor_user_id: null,
          change_type: "location_changed",
          before_json: { location_name: "North Park" },
          after_json: { location_name: "North Park" },
          created_at: "2026-04-03T12:00:00.000Z"
        }]
      }],
      profiles: [{ data: [] }],
      field_locations: [{ data: [] }]
    });
    createSupabaseAdminClientMock.mockReturnValue(db as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const result = await listParentEventChangeLogs({
      parentUserId: "parent-1",
      timeZone: "America/Chicago"
    });

    expect(result.ok).toBe(true);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toMatchObject({
      changeType: "location_changed",
      diffs: [{
        field: "field",
        label: "Location",
        previousValue: "Previous published location",
        currentValue: "Updated published location"
      }]
    });
  });
});
