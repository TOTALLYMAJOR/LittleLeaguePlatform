import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdminClient } from "./admin";
import {
  listSponsorProgramData,
  recordManualSponsorPayment,
  recordSponsorPaymentEvent
} from "./sponsor-program";

vi.mock("./admin", () => ({
  createSupabaseAdminClient: vi.fn()
}));

type Row = Record<string, unknown>;

const createSupabaseAdminClientMock = vi.mocked(createSupabaseAdminClient);

const inserts: Array<{ table: string; payload: Row }> = [];
const queryCalls: Array<{ table: string; filters: Array<{ column: string; value: unknown }> }> = [];

let datasets: Record<string, Row[]> = {};
/** Composite keys already present in the ledger, used to simulate the unique constraint. */
let ledgerUniqueKeys = new Set<string>();

function baseDatasets(): Record<string, Row[]> {
  return {
    organization_memberships: [
      { id: "m-1", organization_id: "org-a", user_id: "admin-a", role: "admin", status: "active" }
    ],
    sponsor_packages: [
      {
        id: "package-a",
        organization_id: "org-a",
        season_id: "season-a",
        name: "Gold",
        price_cents: 150_000,
        benefits: [{ kind: "league_homepage_logo", label: "League homepage logo", quantity: 1 }],
        status: "active"
      }
    ],
    sponsorship_agreements: [
      {
        id: "agreement-a",
        organization_id: "org-a",
        sponsor_id: "sponsor-a",
        package_id: "package-a",
        season_id: "season-a",
        status: "active",
        amount_cents: 150_000,
        starts_at: null,
        ends_at: null
      },
      {
        id: "agreement-b",
        organization_id: "org-b",
        sponsor_id: "sponsor-b",
        package_id: null,
        season_id: "season-b",
        status: "active",
        amount_cents: 90_000,
        starts_at: null,
        ends_at: null
      }
    ],
    sponsorship_invoices: [
      {
        id: "invoice-a",
        organization_id: "org-a",
        agreement_id: "agreement-a",
        invoice_number: "SP-1",
        amount_cents: 150_000,
        status: "issued",
        issued_at: "2026-08-01T00:00:00.000Z"
      },
      {
        id: "invoice-b",
        organization_id: "org-b",
        agreement_id: "agreement-b",
        invoice_number: "SP-2",
        amount_cents: 90_000,
        status: "issued",
        issued_at: "2026-08-01T00:00:00.000Z"
      }
    ],
    sponsor_payment_ledger_entries: [
      {
        id: "entry-a",
        organization_id: "org-a",
        invoice_id: "invoice-a",
        kind: "PaymentSucceeded",
        amount_cents: 150_000,
        provider: "stripe",
        provider_event_id: "evt_existing",
        occurred_at: "2026-08-02T00:00:00.000Z"
      }
    ],
    audit_events: []
  };
}

function queryFor(table: string) {
  let rows = [...(datasets[table] ?? [])];
  const filters: Array<{ column: string; value: unknown }> = [];
  let result: { data: Row[] | Row | null; error: { code?: string; message?: string } | null } = {
    data: rows,
    error: null
  };
  const builder: Record<string, unknown> = {};

  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn((column: string, value: unknown) => {
    filters.push({ column, value });
    rows = rows.filter((row) => row[column] === value);
    result = { data: rows, error: null };
    return builder;
  });
  builder.in = vi.fn((column: string, values: unknown[]) => {
    rows = rows.filter((row) => values.includes(row[column]));
    result = { data: rows, error: null };
    return builder;
  });
  builder.order = vi.fn(() => builder);
  builder.maybeSingle = vi.fn(() => {
    // PostgREST propagates a write error through .select().maybeSingle(); preserve it rather than
    // overwriting it with a read result, otherwise the unique-violation path is never exercised.
    if (result.error) return builder;
    result = { data: rows[0] ?? null, error: null };
    return builder;
  });
  builder.insert = vi.fn((payload: Row) => {
    inserts.push({ table, payload });
    if (table === "sponsor_payment_ledger_entries") {
      const key = `${String(payload.provider)}:${String(payload.provider_event_id)}`;
      if (ledgerUniqueKeys.has(key)) {
        // Mirrors the unique (provider, provider_event_id) constraint the migration installs.
        result = { data: null, error: { code: "23505", message: "duplicate key value" } };
        return builder;
      }
      ledgerUniqueKeys.add(key);
    }
    result = { data: { id: `${table}-new` }, error: null };
    return builder;
  });
  builder.then = (
    resolve: (value: typeof result) => unknown,
    reject: (reason: unknown) => unknown
  ) => Promise.resolve(result).then(resolve, reject);

  queryCalls.push({ table, filters });
  return builder;
}

describe("sponsor program adapter", () => {
  beforeEach(() => {
    datasets = baseDatasets();
    ledgerUniqueKeys = new Set(["stripe:evt_existing"]);
    inserts.length = 0;
    queryCalls.length = 0;
    createSupabaseAdminClientMock.mockClear();
    createSupabaseAdminClientMock.mockReturnValue({
      from: (table: string) => queryFor(table)
    } as never);
  });

  it("loads only the requested organization's program records", async () => {
    const data = await listSponsorProgramData({ organizationId: "org-a" });

    expect(data.isSupabaseBacked).toBe(true);
    expect(data.agreements?.map((agreement) => agreement.id)).toEqual(["agreement-a"]);
    expect(data.invoices?.map((invoice) => invoice.id)).toEqual(["invoice-a"]);
    expect(data.ledgerEntries?.map((entry) => entry.providerEventId)).toEqual(["evt_existing"]);
    expect(data.agreements?.map((agreement) => agreement.id)).not.toContain("agreement-b");

    expect(queryCalls.find((call) => call.table === "sponsorship_agreements")?.filters)
      .toContainEqual({ column: "organization_id", value: "org-a" });
    expect(queryCalls.find((call) => call.table === "sponsor_payment_ledger_entries")?.filters)
      .toContainEqual({ column: "organization_id", value: "org-a" });
  });

  it("fails closed with no records when an organization is not supplied", async () => {
    const data = await listSponsorProgramData({ organizationId: "  " });

    expect(data.isSupabaseBacked).toBe(false);
    expect(data.agreements).toEqual([]);
    expect(data.invoices).toEqual([]);
    expect(data.ledgerEntries).toEqual([]);
    expect(data.message).toContain("authorized organization is required");
  });

  it("records a new payment event once", async () => {
    const result = await recordSponsorPaymentEvent({
      organizationId: "org-a",
      invoiceId: "invoice-a",
      kind: "PaymentSucceeded",
      amountCents: 150_000,
      provider: "stripe",
      providerEventId: "evt_new",
      occurredAt: "2026-08-19T00:00:00.000Z"
    });

    expect(result).toEqual({
      ok: true,
      deduplicated: false,
      message: expect.stringContaining("folded from the ledger")
    });
    expect(inserts.filter((entry) => entry.table === "sponsor_payment_ledger_entries")).toHaveLength(1);
  });

  it("treats a replayed provider event as success and writes no second row", async () => {
    const first = await recordSponsorPaymentEvent({
      organizationId: "org-a",
      invoiceId: "invoice-a",
      kind: "PaymentSucceeded",
      amountCents: 150_000,
      provider: "stripe",
      providerEventId: "evt_replay",
      occurredAt: "2026-08-19T00:00:00.000Z"
    });
    const second = await recordSponsorPaymentEvent({
      organizationId: "org-a",
      invoiceId: "invoice-a",
      kind: "PaymentSucceeded",
      amountCents: 150_000,
      provider: "stripe",
      providerEventId: "evt_replay",
      occurredAt: "2026-08-19T00:00:00.000Z"
    });

    expect(first.ok).toBe(true);
    expect(first.deduplicated).toBe(false);
    expect(second.ok).toBe(true);
    expect(second.deduplicated).toBe(true);
    expect(second.message).toContain("already recorded");
    expect(ledgerUniqueKeys.has("stripe:evt_replay")).toBe(true);
  });

  it("never issues an update or delete against the ledger", async () => {
    await recordSponsorPaymentEvent({
      organizationId: "org-a",
      invoiceId: "invoice-a",
      kind: "RefundSucceeded",
      amountCents: 150_000,
      provider: "stripe",
      providerEventId: "evt_refund",
      occurredAt: "2026-08-19T00:00:00.000Z"
    });

    const ledgerBuilders = queryCalls.filter((call) => call.table === "sponsor_payment_ledger_entries");
    expect(ledgerBuilders.length).toBeGreaterThan(0);
    // A correction is a new entry, never a mutation of an existing one.
    expect(inserts.some((entry) => entry.table === "sponsor_payment_ledger_entries")).toBe(true);
  });

  it("records a manual payment for an active organization admin and audits it", async () => {
    const result = await recordManualSponsorPayment({
      invoiceId: "invoice-a",
      actorUserId: "admin-a",
      amountCents: 150_000,
      note: "Cheque 1041"
    });

    expect(result.ok).toBe(true);
    expect(result.message).toContain("not processor settlement evidence");

    const ledgerInsert = inserts.find((entry) => entry.table === "sponsor_payment_ledger_entries");
    expect(ledgerInsert?.payload).toMatchObject({
      organization_id: "org-a",
      invoice_id: "invoice-a",
      kind: "PaymentSucceeded",
      provider: "manual",
      recorded_by_user_id: "admin-a"
    });
    expect(String(ledgerInsert?.payload.provider_event_id)).toMatch(/^manual:/);

    expect(inserts.find((entry) => entry.table === "audit_events")?.payload).toMatchObject({
      organization_id: "org-a",
      actor_user_id: "admin-a",
      action: "sponsor_manual_payment_recorded",
      target_type: "sponsorship_invoice"
    });
  });

  it("refuses a manual payment from a user who is not an active organization admin", async () => {
    const result = await recordManualSponsorPayment({
      invoiceId: "invoice-a",
      actorUserId: "parent-a",
      amountCents: 150_000
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("Only active organization admins");
    expect(inserts.some((entry) => entry.table === "sponsor_payment_ledger_entries")).toBe(false);
    expect(inserts.some((entry) => entry.table === "audit_events")).toBe(false);
  });

  it("refuses a manual payment that is zero, negative, or fractional", async () => {
    for (const amountCents of [0, -1, 10.5]) {
      const result = await recordManualSponsorPayment({
        invoiceId: "invoice-a",
        actorUserId: "admin-a",
        amountCents
      });

      expect(result.ok).toBe(false);
      expect(result.message).toContain("positive whole number of cents");
    }
    expect(inserts.some((entry) => entry.table === "sponsor_payment_ledger_entries")).toBe(false);
  });

  it("refuses a manual payment against an invoice that does not exist", async () => {
    const result = await recordManualSponsorPayment({
      invoiceId: "invoice-missing",
      actorUserId: "admin-a",
      amountCents: 1000
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("could not be found");
    expect(inserts.some((entry) => entry.table === "sponsor_payment_ledger_entries")).toBe(false);
  });
});
