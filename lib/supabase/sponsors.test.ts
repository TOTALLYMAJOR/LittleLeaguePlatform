import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdminClient } from "./admin";
import { listSponsorAdminData } from "./sponsors";

vi.mock("./admin", () => ({
  createSupabaseAdminClient: vi.fn()
}));

type Row = Record<string, unknown>;

const createSupabaseAdminClientMock = vi.mocked(createSupabaseAdminClient);
const queryCalls: Array<{
  table: string;
  filters: Array<{ kind: "eq" | "in"; column: string; value: unknown }>;
}> = [];

const datasets: Record<string, Row[]> = {
  organizations: [
    { id: "org-a", name: "League A" },
    { id: "org-b", name: "League B" }
  ],
  teams: [
    {
      id: "team-a",
      organization_id: "org-a",
      season_id: "season-a",
      division: "8U",
      name: "Team A",
      coach_user_id: null,
      mascot: "A",
      primary_color: "#112233",
      secondary_color: "#445566",
      theme_key: "baseball"
    },
    {
      id: "team-b",
      organization_id: "org-b",
      season_id: "season-b",
      division: "10U",
      name: "Team B",
      coach_user_id: null,
      mascot: "B",
      primary_color: "#778899",
      secondary_color: "#aabbcc",
      theme_key: "soccer"
    }
  ],
  sponsors: [
    {
      id: "sponsor-a",
      organization_id: "org-a",
      name: "Sponsor A",
      level: "team",
      team_id: "team-a",
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
  sponsor_placements: [
    {
      sponsor_id: "sponsor-a",
      organization_id: "org-a",
      placement_key: "team_portal",
      status: "active",
      created_at: "2026-07-26T12:00:00.000Z"
    },
    {
      sponsor_id: "sponsor-b",
      organization_id: "org-b",
      placement_key: "registration",
      status: "active",
      created_at: "2026-07-26T12:00:00.000Z"
    }
  ],
  sponsor_assets: [
    {
      sponsor_id: "sponsor-a",
      asset_type: "logo",
      url: "https://a.example/pending.png",
      status: "pending",
      created_at: "2026-07-26T13:00:00.000Z"
    },
    {
      sponsor_id: "sponsor-a",
      asset_type: "logo",
      url: "https://a.example/approved.png",
      status: "approved",
      created_at: "2026-07-26T12:00:00.000Z"
    },
    {
      sponsor_id: "sponsor-b",
      asset_type: "logo",
      url: "https://b.example/approved.png",
      status: "approved",
      created_at: "2026-07-26T12:00:00.000Z"
    }
  ],
  sponsor_billing_records: [
    {
      id: "billing-a",
      organization_id: "org-a",
      sponsor_id: "sponsor-a",
      invoice_reference: "invoice-a",
      amount_cents: 125_000,
      currency: "usd",
      status: "payment_recorded",
      payment_proof_status: "paid",
      confirmed_at: "2026-07-26T14:00:00.000Z",
      created_at: "2026-07-26T14:00:00.000Z"
    },
    {
      id: "billing-b",
      organization_id: "org-b",
      sponsor_id: "sponsor-b",
      invoice_reference: "invoice-b",
      amount_cents: 225_000,
      currency: "usd",
      status: "payment_recorded",
      payment_proof_status: "paid",
      confirmed_at: "2026-07-26T14:00:00.000Z",
      created_at: "2026-07-26T14:00:00.000Z"
    }
  ]
};

function queryFor(table: string) {
  let rows = [...(datasets[table] ?? [])];
  const filters: Array<{ kind: "eq" | "in"; column: string; value: unknown }> = [];
  let result: { data: Row[] | Row | null; error: null } = { data: rows, error: null };
  const builder: Record<string, unknown> = {};

  function updateRows() {
    result = { data: rows, error: null };
  }

  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn((column: string, value: unknown) => {
    filters.push({ kind: "eq", column, value });
    rows = rows.filter((row) => row[column] === value);
    updateRows();
    return builder;
  });
  builder.in = vi.fn((column: string, values: unknown[]) => {
    filters.push({ kind: "in", column, value: values });
    rows = rows.filter((row) => values.includes(row[column]));
    updateRows();
    return builder;
  });
  builder.order = vi.fn(() => builder);
  builder.limit = vi.fn((count: number) => {
    rows = rows.slice(0, count);
    updateRows();
    return builder;
  });
  builder.maybeSingle = vi.fn(() => {
    result = { data: rows[0] ?? null, error: null };
    return builder;
  });
  builder.then = (
    resolve: (value: typeof result) => unknown,
    reject: (reason: unknown) => unknown
  ) => Promise.resolve(result).then(resolve, reject);

  queryCalls.push({ table, filters });
  return builder;
}

describe("sponsor admin data tenant and proof boundaries", () => {
  beforeEach(() => {
    queryCalls.length = 0;
    createSupabaseAdminClientMock.mockClear();
    createSupabaseAdminClientMock.mockReturnValue({
      from: (table: string) => queryFor(table)
    } as never);
  });

  it("returns only the requested organization with approved logos and persisted billing proof", async () => {
    const data = await listSponsorAdminData({ organizationId: "org-a" });

    expect(data.isSupabaseBacked).toBe(true);
    expect(data.organizationId).toBe("org-a");
    expect(data.teams.map((team) => team.id)).toEqual(["team-a"]);
    expect(data.sponsors).toEqual([expect.objectContaining({
      id: "sponsor-a",
      organizationId: "org-a",
      placementKey: "team_portal",
      logoUrl: "https://a.example/approved.png"
    })]);
    expect(data.sponsors.map((sponsor) => sponsor.id)).not.toContain("sponsor-b");
    expect(data.billingRecords).toEqual([expect.objectContaining({
      id: "billing-a",
      sponsorId: "sponsor-a",
      amountCents: 125_000,
      paymentProofStatus: "paid",
      confirmedAt: "2026-07-26T14:00:00.000Z"
    })]);
    expect(data).not.toHaveProperty("users");

    expect(queryCalls.find((call) => call.table === "sponsors")?.filters).toContainEqual({
      kind: "eq",
      column: "organization_id",
      value: "org-a"
    });
    expect(queryCalls.find((call) => call.table === "sponsor_assets")?.filters).toContainEqual({
      kind: "eq",
      column: "status",
      value: "approved"
    });
    expect(queryCalls.find((call) => call.table === "sponsor_billing_records")?.filters).toContainEqual({
      kind: "eq",
      column: "organization_id",
      value: "org-a"
    });
  });

  it("fails closed without an authorized organization instead of returning seed records", async () => {
    const data = await listSponsorAdminData({ organizationId: " " });

    expect(data).toMatchObject({
      organizationId: "",
      teams: [],
      sponsors: [],
      billingRecords: [],
      isSupabaseBacked: false
    });
    expect(createSupabaseAdminClientMock).not.toHaveBeenCalled();
  });
});
