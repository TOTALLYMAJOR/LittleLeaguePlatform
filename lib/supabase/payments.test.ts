import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdminClient } from "./admin";
import { processVerifiedStripeEvent } from "./payments";
import { recordSponsorStripeEvent } from "./sponsor-program";

vi.mock("./admin", () => ({ createSupabaseAdminClient: vi.fn() }));
vi.mock("./sponsor-program", () => ({ recordSponsorStripeEvent: vi.fn() }));
vi.mock("@/lib/services/stripe-connect", () => ({
  stripeClient: vi.fn(),
  stripeConnectReadiness: () => ({ configured: false, reason: "disabled in tests" })
}));

type Row = Record<string, unknown>;
type DbResult = { data: Row | Row[] | null; error: { code?: string; message?: string } | null };

const createSupabaseAdminClientMock = vi.mocked(createSupabaseAdminClient);
const recordSponsorStripeEventMock = vi.mocked(recordSponsorStripeEvent);
const queryFilters: Array<{ table: string; column: string; value: unknown }> = [];

const invoices: Row[] = [{
  id: "invoice-a",
  organization_id: "org-a",
  amount_cents: 150_000,
  status: "paid",
  legacy_billing_record_id: "billing-a",
  stripe_payment_intent_id: "pi_a"
}];

function queryFor(table: string) {
  let rows: Row[] = table === "organization_stripe_accounts"
    ? [{ organization_id: "org-a", stripe_account_id: "acct_a" }]
    : table === "sponsorship_invoices"
      ? [...invoices]
      : [];
  let result: DbResult = { data: rows, error: null };
  const builder: Record<string, unknown> = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn((column: string, value: unknown) => {
    queryFilters.push({ table, column, value });
    rows = rows.filter((row) => row[column] === value);
    result = { data: rows, error: null };
    return builder;
  });
  builder.maybeSingle = vi.fn(() => {
    result = { data: rows[0] ?? null, error: null };
    return builder;
  });
  builder.then = (
    resolve: (value: DbResult) => unknown,
    reject: (reason: unknown) => unknown
  ) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

function event(type: Stripe.Event.Type, object: Stripe.Event.Data.Object, id = `evt_${type}`): Stripe.Event {
  return {
    id,
    object: "event",
    account: "acct_a",
    api_version: "2026-06-30.basil",
    created: 1_776_729_600,
    data: { object },
    livemode: false,
    pending_webhooks: 1,
    request: { id: "req_a", idempotency_key: null },
    type
  } as Stripe.Event;
}

function refund(overrides: Partial<Stripe.Refund> = {}): Stripe.Refund {
  return {
    id: "re_a",
    object: "refund",
    amount: 10_000,
    balance_transaction: null,
    charge: "ch_a",
    created: 1_776_729_600,
    currency: "usd",
    metadata: {},
    payment_intent: "pi_a",
    reason: null,
    receipt_number: null,
    source_transfer_reversal: null,
    status: "succeeded",
    transfer_reversal: null,
    ...overrides
  } as Stripe.Refund;
}

beforeEach(() => {
  queryFilters.length = 0;
  createSupabaseAdminClientMock.mockReturnValue({ from: (table: string) => queryFor(table) } as never);
  recordSponsorStripeEventMock.mockReset();
  recordSponsorStripeEventMock.mockResolvedValue({
    ok: true,
    deduplicated: false,
    message: "committed"
  });
});

describe("verified sponsor Stripe event processing", () => {
  it("resolves a successful refund through the persisted PaymentIntent and uses the refund amount", async () => {
    const result = await processVerifiedStripeEvent(event("refund.created", refund(), "evt_refund_created"));

    expect(result).toMatchObject({ ok: true, duplicate: false });
    expect(queryFilters).toContainEqual({ table: "sponsorship_invoices", column: "stripe_payment_intent_id", value: "pi_a" });
    expect(recordSponsorStripeEventMock).toHaveBeenCalledWith(expect.objectContaining({
      invoiceId: "invoice-a",
      kind: "RefundSucceeded",
      amountCents: 10_000,
      providerResourceId: "refund:re_a",
      stripeEventId: "evt_refund_created"
    }));
  });

  it("uses the same stable refund resource id for a later successful refund.updated event", async () => {
    await processVerifiedStripeEvent(event("refund.created", refund(), "evt_refund_created"));
    await processVerifiedStripeEvent(event("refund.updated", refund({ amount: 10_000 }), "evt_refund_updated"));

    expect(recordSponsorStripeEventMock.mock.calls.map(([input]) => input.providerResourceId))
      .toEqual(["refund:re_a", "refund:re_a"]);
  });

  it("acknowledges a pending refund without recording money", async () => {
    const result = await processVerifiedStripeEvent(event("refund.updated", refund({ status: "pending" }), "evt_pending"));

    expect(result.ok).toBe(true);
    expect(recordSponsorStripeEventMock).not.toHaveBeenCalled();
  });

  it("resolves a dispute with no LeaguePilot metadata through its PaymentIntent", async () => {
    const dispute = {
      id: "dp_a",
      object: "dispute",
      amount: 150_000,
      currency: "usd",
      metadata: {},
      payment_intent: "pi_a"
    } as unknown as Stripe.Dispute;

    const result = await processVerifiedStripeEvent(event("charge.dispute.created", dispute, "evt_dispute"));

    expect(result.ok).toBe(true);
    expect(recordSponsorStripeEventMock).toHaveBeenCalledWith(expect.objectContaining({
      kind: "DisputeOpened",
      amountCents: 150_000,
      providerResourceId: "dispute:dp_a",
      paymentIntentId: "pi_a"
    }));
  });

  it("returns a retryable failure when the atomic database commit fails", async () => {
    recordSponsorStripeEventMock.mockResolvedValue({
      ok: false,
      deduplicated: false,
      message: "ledger insert failed"
    });

    const result = await processVerifiedStripeEvent(event("refund.created", refund(), "evt_retry"));

    expect(result).toEqual({ ok: false, deduplicated: false, message: "ledger insert failed" });
  });

  it("retries the complete atomic operation after a persistence failure", async () => {
    recordSponsorStripeEventMock
      .mockResolvedValueOnce({ ok: false, deduplicated: false, message: "ledger insert failed" })
      .mockResolvedValueOnce({ ok: true, deduplicated: false, message: "committed on retry" });
    const stripeEvent = event("refund.created", refund(), "evt_retry_then_commit");

    const first = await processVerifiedStripeEvent(stripeEvent);
    const second = await processVerifiedStripeEvent(stripeEvent);

    expect(first.ok).toBe(false);
    expect(second).toEqual({ ok: true, duplicate: false, message: "committed on retry" });
    expect(recordSponsorStripeEventMock).toHaveBeenCalledTimes(2);
  });

  it("acknowledges a duplicate only after the transaction RPC reports it complete", async () => {
    recordSponsorStripeEventMock.mockResolvedValue({
      ok: true,
      deduplicated: true,
      message: "already complete"
    });

    const result = await processVerifiedStripeEvent(event("refund.updated", refund(), "evt_duplicate"));

    expect(result).toEqual({ ok: true, duplicate: true, message: "already complete" });
    expect(recordSponsorStripeEventMock).toHaveBeenCalledTimes(1);
  });

  it("turns an unexpected persistence exception into a retryable failure result", async () => {
    recordSponsorStripeEventMock.mockRejectedValue(new Error("connection dropped"));

    const result = await processVerifiedStripeEvent(event("refund.created", refund(), "evt_exception"));

    expect(result).toEqual({
      ok: false,
      message: "Verified Stripe evidence could not be persisted. Stripe may retry this event."
    });
  });
});
