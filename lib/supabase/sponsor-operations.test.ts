import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdminClient } from "./admin";
import { saveSponsor } from "./operations";

vi.mock("./admin", () => ({
  createSupabaseAdminClient: vi.fn()
}));

type Row = Record<string, unknown>;
type Mutation = {
  kind: "insert" | "update" | "upsert";
  payload: Row;
} | undefined;

const createSupabaseAdminClientMock = vi.mocked(createSupabaseAdminClient);
let datasets: Record<string, Row[]>;
let failingInsertTables: Set<string>;
const mutationCalls: Array<{ table: string; kind: NonNullable<Mutation>["kind"]; payload: Row }> = [];

function queryFor(table: string) {
  const filters: Array<{ column: string; value: unknown }> = [];
  let mutation: Mutation;
  let single = false;
  const builder: Record<string, unknown> = {};

  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn((column: string, value: unknown) => {
    filters.push({ column, value });
    return builder;
  });
  builder.maybeSingle = vi.fn(() => {
    single = true;
    return builder;
  });
  builder.single = vi.fn(() => {
    single = true;
    return builder;
  });
  builder.insert = vi.fn((payload: Row) => {
    mutation = { kind: "insert", payload };
    mutationCalls.push({ table, kind: "insert", payload });
    return builder;
  });
  builder.update = vi.fn((payload: Row) => {
    mutation = { kind: "update", payload };
    mutationCalls.push({ table, kind: "update", payload });
    return builder;
  });
  builder.upsert = vi.fn((payload: Row) => {
    mutation = { kind: "upsert", payload };
    mutationCalls.push({ table, kind: "upsert", payload });
    return builder;
  });
  builder.then = (
    resolve: (value: { data: Row[] | Row | null; error: { message: string } | null }) => unknown,
    reject: (reason: unknown) => unknown
  ) => {
    const execute = () => {
      if (mutation?.kind === "insert" && failingInsertTables.has(table)) {
        return { data: null, error: { message: `${table} insert failed` } };
      }

      const tableRows = datasets[table] ?? (datasets[table] = []);
      const matchingRows = tableRows.filter((row) => (
        filters.every((filter) => row[filter.column] === filter.value)
      ));

      if (mutation?.kind === "update") {
        for (const row of matchingRows) Object.assign(row, mutation.payload);
        return { data: matchingRows, error: null };
      }

      if (mutation?.kind === "insert") {
        const inserted = { id: `${table}-${tableRows.length + 1}`, ...mutation.payload };
        tableRows.push(inserted);
        return { data: inserted, error: null };
      }

      if (mutation?.kind === "upsert") {
        const id = String(mutation.payload.id ?? `sponsor-${tableRows.length + 1}`);
        const existing = tableRows.find((row) => row.id === id);
        if (existing) {
          Object.assign(existing, mutation.payload);
          return { data: existing, error: null };
        }
        const inserted = { id, ...mutation.payload };
        tableRows.push(inserted);
        return { data: inserted, error: null };
      }

      return {
        data: single ? matchingRows[0] ?? null : matchingRows,
        error: null
      };
    };

    return Promise.resolve(execute()).then(resolve, reject);
  };

  return builder;
}

function sponsorInput(overrides: Partial<Parameters<typeof saveSponsor>[0]> = {}) {
  return {
    organizationId: "org-a",
    actorUserId: "admin-a",
    sponsorId: "sponsor-a",
    name: "Sponsor A",
    level: "league" as const,
    url: "https://a.example",
    status: "active" as const,
    placementKey: "weekly_digest" as const,
    ...overrides
  };
}

describe("sponsor mutation integrity", () => {
  beforeEach(() => {
    datasets = {
      organization_memberships: [{
        id: "membership-a",
        organization_id: "org-a",
        user_id: "admin-a",
        role: "admin",
        status: "active"
      }],
      teams: [
        { id: "team-a", organization_id: "org-a" },
        { id: "team-b", organization_id: "org-b" }
      ],
      sponsors: [
        {
          id: "sponsor-a",
          organization_id: "org-a",
          name: "Sponsor A",
          level: "league",
          team_id: null,
          url: "https://a.example",
          status: "active"
        },
        {
          id: "sponsor-b",
          organization_id: "org-b",
          name: "Sponsor B",
          level: "league",
          team_id: null,
          url: "https://b.example",
          status: "active"
        }
      ],
      sponsor_placements: [{
        id: "placement-old",
        sponsor_id: "sponsor-a",
        organization_id: "org-a",
        placement_key: "team_portal",
        status: "active"
      }],
      sponsor_assets: [],
      audit_events: []
    };
    failingInsertTables = new Set();
    mutationCalls.length = 0;
    createSupabaseAdminClientMock.mockReturnValue({
      from: (table: string) => queryFor(table)
    } as never);
  });

  it("rejects a caller-supplied sponsor ID from another organization before upsert", async () => {
    const result = await saveSponsor(sponsorInput({ sponsorId: "sponsor-b" }));

    expect(result).toEqual({
      ok: false,
      message: "The sponsor record could not be found in this organization."
    });
    expect(mutationCalls.find((call) => call.table === "sponsors")).toBeUndefined();
  });

  it("rejects a team sponsor whose team belongs to another organization", async () => {
    const result = await saveSponsor(sponsorInput({
      sponsorId: undefined,
      level: "team",
      teamId: "team-b"
    }));

    expect(result).toEqual({
      ok: false,
      message: "Team sponsors require a team from the same organization."
    });
    expect(mutationCalls.find((call) => call.table === "sponsors")).toBeUndefined();
  });

  it("expires prior active placements, saves one replacement, and queues a new logo for review", async () => {
    const result = await saveSponsor(sponsorInput({
      logoUrl: "https://a.example/new-logo.png"
    }));

    expect(result).toMatchObject({
      ok: true,
      partial: false,
      sponsor: {
        id: "sponsor-a",
        organizationId: "org-a",
        placementKey: "weekly_digest",
        logoUrl: undefined
      }
    });
    expect(datasets.sponsor_placements).toEqual([
      expect.objectContaining({ id: "placement-old", status: "expired" }),
      expect.objectContaining({
        sponsor_id: "sponsor-a",
        organization_id: "org-a",
        placement_key: "weekly_digest",
        status: "active"
      })
    ]);
    expect(datasets.sponsor_assets).toEqual([
      expect.objectContaining({
        sponsor_id: "sponsor-a",
        url: "https://a.example/new-logo.png",
        status: "pending"
      })
    ]);
    expect(datasets.audit_events).toHaveLength(1);
  });

  it("reports secondary-record failure instead of claiming a fully successful save", async () => {
    failingInsertTables.add("sponsor_assets");

    const result = await saveSponsor(sponsorInput({
      logoUrl: "https://a.example/new-logo.png"
    }));

    expect(result).toMatchObject({
      ok: true,
      partial: true,
      message: expect.stringContaining("logo review item was not queued")
    });
    expect(datasets.audit_events).toHaveLength(1);
  });

  it("does not change the sponsor when required audit logging is unavailable", async () => {
    failingInsertTables.add("audit_events");

    const result = await saveSponsor(sponsorInput({
      name: "Sponsor A updated"
    }));

    expect(result).toEqual({
      ok: false,
      message: "Sponsor was not changed because audit logging is unavailable."
    });
    expect(mutationCalls.find((call) => call.table === "sponsors")).toBeUndefined();
    expect(datasets.sponsors.find((sponsor) => sponsor.id === "sponsor-a")?.name).toBe("Sponsor A");
  });
});
