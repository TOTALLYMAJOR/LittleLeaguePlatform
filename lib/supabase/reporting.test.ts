import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminExport } from "./reporting";
import { createSupabaseAdminClient } from "./admin";

vi.mock("./admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

type Row = Record<string, unknown>;

const createSupabaseAdminClientMock = vi.mocked(createSupabaseAdminClient);

const datasets: Record<string, Row[]> = {
  organization_memberships: [
    {
      id: "membership-a",
      organization_id: "org-a",
      user_id: "admin-a",
      role: "admin",
      status: "active",
    },
  ],
  teams: [
    {
      id: "team-a",
      organization_id: "org-a",
      name: "Tiny Tigers",
      division: "8U",
    },
  ],
  players: [
    {
      id: "player-a",
      organization_id: "org-a",
      team_id: "team-a",
      first_name: "Mason",
      last_initial: "M",
      jersey: "7",
    },
  ],
  events: [
    {
      id: "event-a",
      organization_id: "org-a",
      team_id: "team-a",
      title: "Practice",
      event_type: "practice",
      starts_at: "2026-07-16T18:00:00.000Z",
      location_name: "Field 1",
      status: "scheduled",
    },
  ],
  player_guardians: [
    {
      player_id: "player-a",
      parent_user_id: "parent-a",
      relationship: "guardian",
      status: "active",
    },
    {
      player_id: "player-other-tenant",
      parent_user_id: "parent-b",
      relationship: "guardian",
      status: "active",
    },
  ],
  profiles: [
    {
      id: "parent-a",
      display_name: "Avery Parent",
      email: "avery@example.com",
      phone: "555-0100",
    },
    {
      id: "parent-b",
      display_name: "Other Tenant Parent",
      email: "other@example.com",
      phone: "555-0199",
    },
  ],
};

const queryCalls: Array<{
  table: string;
  filters: Array<{ kind: string; column: string; value: unknown }>;
}> = [];

function queryFor(table: string) {
  let rows = [...(datasets[table] ?? [])];
  const filters: Array<{ kind: string; column: string; value: unknown }> = [];
  let result: { data: Row[] | null; error: null } = { data: rows, error: null };
  const builder: Record<string, any> = {};

  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn((column: string, value: unknown) => {
    filters.push({ kind: "eq", column, value });
    rows = rows.filter((row) => row[column] === value);
    result = { data: rows, error: null };
    return builder;
  });
  builder.in = vi.fn((column: string, values: unknown[]) => {
    filters.push({ kind: "in", column, value: values });
    rows = rows.filter((row) => values.includes(row[column]));
    result = { data: rows, error: null };
    return builder;
  });
  builder.insert = vi.fn(() => {
    result = { data: null, error: null };
    return builder;
  });
  builder.then = (
    resolve: (value: typeof result) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);

  queryCalls.push({ table, filters });
  return builder;
}

describe("admin reporting tenant isolation", () => {
  beforeEach(() => {
    queryCalls.length = 0;
    createSupabaseAdminClientMock.mockReturnValue({
      from: (table: string) => queryFor(table),
    } as never);
  });

  it("scopes related rows and profiles to the selected organization before creating a contacts export", async () => {
    const result = await createAdminExport({
      organizationId: "org-a",
      actorUserId: "admin-a",
      kind: "contacts",
    });

    expect(result.ok).toBe(true);
    expect(result.csv).toContain("Avery Parent");
    expect(result.csv).not.toContain("Other Tenant Parent");
    expect(result.csv).not.toContain("other@example.com");

    const guardianQuery = queryCalls.find(
      (call) => call.table === "player_guardians",
    );
    expect(guardianQuery?.filters).toContainEqual({
      kind: "in",
      column: "player_id",
      value: ["player-a"],
    });

    const profileQuery = queryCalls.find((call) => call.table === "profiles");
    expect(profileQuery?.filters).toContainEqual({
      kind: "in",
      column: "id",
      value: ["parent-a"],
    });
  });

  it("rejects an actor who is an admin in a different organization", async () => {
    const result = await createAdminExport({
      organizationId: "org-b",
      actorUserId: "admin-a",
      kind: "roster",
    });

    expect(result).toEqual({
      ok: false,
      message: "Only active organization admins can export league reports.",
    });
    expect(
      queryCalls.filter((call) => call.table !== "organization_memberships"),
    ).toHaveLength(0);
  });
});
