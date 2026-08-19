import { randomUUID } from "node:crypto";
import type {
  FulfillmentRequirement,
  SponsorPaymentLedgerEntry,
  SponsorProgramRecords,
  SponsorshipAgreement,
  SponsorshipAgreementStatus,
  SponsorshipInvoice,
  SponsorshipInvoiceStatus,
  SponsorshipPackage,
  SponsorshipPackageBenefit
} from "@/lib/domain";
import { requireActiveOrganizationAdmin } from "./access-control";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Sponsor program tables are staged ahead of a generated-types refresh.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

type Result<T> = { data: T | null; error: { code?: string; message?: string } | null };

/** Postgres unique-violation SQLSTATE. A ledger replay lands here and is treated as success. */
const UNIQUE_VIOLATION = "23505";

function adminDb() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

function run<T>(operation: PromiseLike<unknown>) {
  return withSupabaseTimeout(operation as PromiseLike<Result<T>>, 7000);
}

export interface SponsorProgramData extends SponsorProgramRecords {
  organizationId: string;
  isSupabaseBacked: boolean;
  message: string;
}

function unavailableProgramData(
  organizationId: string,
  message = "Sponsor program records are unavailable for the selected organization. No amount, payment state, or delivery is claimed."
): SponsorProgramData {
  return {
    organizationId,
    packages: [],
    agreements: [],
    invoices: [],
    ledgerEntries: [],
    fulfillmentRequirements: [],
    isSupabaseBacked: false,
    message
  };
}

function toBenefits(value: unknown): SponsorshipPackageBenefit[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const candidate = entry as Partial<SponsorshipPackageBenefit>;
    if (typeof candidate.kind !== "string" || typeof candidate.label !== "string") return [];
    return [{
      kind: candidate.kind as SponsorshipPackageBenefit["kind"],
      label: candidate.label,
      quantity: typeof candidate.quantity === "number" && candidate.quantity > 0 ? candidate.quantity : 1
    }];
  });
}

/**
 * Load every persisted sponsor program record for one organization. Reads fail closed: a degraded
 * read returns empty collections and `isSupabaseBacked: false` rather than partial rows, so callers
 * render "no agreement on record" instead of an invented commercial state.
 */
export async function listSponsorProgramData(input: {
  organizationId: string;
}): Promise<SponsorProgramData> {
  const organizationId = input.organizationId.trim();
  if (!organizationId) {
    return unavailableProgramData("", "An authorized organization is required before sponsor program records can be loaded.");
  }

  try {
    const db = adminDb();
    const [packagesResult, agreementsResult] = await withSupabaseTimeout(Promise.all([
      db.from("sponsor_packages")
        .select("id,organization_id,season_id,name,price_cents,benefits,status")
        .eq("organization_id", organizationId),
      db.from("sponsorship_agreements")
        .select("id,organization_id,sponsor_id,package_id,season_id,status,amount_cents,starts_at,ends_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
    ]), 7000);

    if (packagesResult.error || agreementsResult.error) {
      return unavailableProgramData(organizationId, "Supabase sponsor program rows are not available for this organization.");
    }

    const agreementIds = (agreementsResult.data ?? []).map((row: { id: string }) => row.id);
    const emptyResult = Promise.resolve({ data: [], error: null });
    const [invoicesResult, requirementsResult] = await withSupabaseTimeout(Promise.all([
      agreementIds.length
        ? db.from("sponsorship_invoices")
          .select("id,agreement_id,invoice_number,amount_cents,status,issued_at")
          .eq("organization_id", organizationId)
          .in("agreement_id", agreementIds)
          .order("created_at", { ascending: false })
        : emptyResult,
      // Fulfillment requirements arrive in Phase 2. Reading them now keeps the adapter contract
      // stable, and a missing table degrades to an empty list rather than failing the whole read.
      emptyResult
    ]), 7000);

    if (invoicesResult.error) {
      return unavailableProgramData(organizationId, "Sponsor invoice records could not be loaded safely.");
    }

    const invoiceIds = (invoicesResult.data ?? []).map((row: { id: string }) => row.id);
    const ledgerResult = invoiceIds.length
      ? await run<Array<{
        id: string;
        invoice_id: string;
        kind: SponsorPaymentLedgerEntry["kind"];
        amount_cents: number;
        provider: SponsorPaymentLedgerEntry["provider"];
        provider_event_id: string;
        occurred_at: string;
      }>>(db.from("sponsor_payment_ledger_entries")
        .select("id,invoice_id,kind,amount_cents,provider,provider_event_id,occurred_at")
        .eq("organization_id", organizationId)
        .in("invoice_id", invoiceIds)
        .order("occurred_at", { ascending: true }))
      : { data: [], error: null };

    if (ledgerResult.error) {
      return unavailableProgramData(organizationId, "Sponsor payment ledger entries could not be loaded safely.");
    }

    const packages: SponsorshipPackage[] = (packagesResult.data ?? []).map((row: {
      id: string;
      season_id: string | null;
      name: string;
      price_cents: number | null;
      benefits: unknown;
    }) => ({
      id: row.id,
      name: row.name,
      seasonId: row.season_id ?? "",
      amountCents: row.price_cents ?? 0,
      currency: "usd" as const,
      benefits: toBenefits(row.benefits)
    }));

    const agreements: SponsorshipAgreement[] = (agreementsResult.data ?? []).map((row: {
      id: string;
      organization_id: string;
      sponsor_id: string;
      package_id: string | null;
      season_id: string;
      status: SponsorshipAgreementStatus;
      starts_at: string | null;
      ends_at: string | null;
    }) => ({
      id: row.id,
      sponsorId: row.sponsor_id,
      packageId: row.package_id ?? "",
      organizationId: row.organization_id,
      seasonId: row.season_id,
      status: row.status,
      startsAt: row.starts_at ?? undefined,
      endsAt: row.ends_at ?? undefined
    }));

    const invoices: SponsorshipInvoice[] = (invoicesResult.data ?? []).map((row: {
      id: string;
      agreement_id: string;
      invoice_number: string;
      amount_cents: number;
      status: SponsorshipInvoiceStatus;
      issued_at: string | null;
    }) => ({
      id: row.id,
      agreementId: row.agreement_id,
      invoiceNumber: row.invoice_number,
      amountCents: row.amount_cents,
      currency: "usd" as const,
      status: row.status,
      issuedAt: row.issued_at ?? undefined
    }));

    const ledgerEntries: SponsorPaymentLedgerEntry[] = (ledgerResult.data ?? []).map((row) => ({
      id: row.id,
      invoiceId: row.invoice_id,
      kind: row.kind,
      amountCents: row.amount_cents,
      currency: "usd" as const,
      provider: row.provider,
      providerEventId: row.provider_event_id,
      occurredAt: row.occurred_at
    }));

    const fulfillmentRequirements: FulfillmentRequirement[] = (requirementsResult.data ?? []) as FulfillmentRequirement[];

    return {
      organizationId,
      packages,
      agreements,
      invoices,
      ledgerEntries,
      fulfillmentRequirements,
      isSupabaseBacked: true,
      message: "Sponsor agreements, invoices, and payment ledger entries are loaded from Supabase. Paid and outstanding totals are folded from the ledger, never stored."
    };
  } catch {
    return unavailableProgramData(organizationId, "Supabase sponsor program records could not be loaded safely.");
  }
}

/**
 * Append one payment ledger entry. The write is idempotent by `(provider, provider_event_id)`:
 * a redelivered processor event inserts nothing and returns success with `deduplicated: true`,
 * matching the acknowledgment semantics ADR 0002 established.
 */
export async function recordSponsorPaymentEvent(input: {
  organizationId: string;
  invoiceId: string;
  kind: SponsorPaymentLedgerEntry["kind"];
  amountCents: number;
  provider: SponsorPaymentLedgerEntry["provider"];
  providerEventId: string;
  occurredAt: string;
  recordedByUserId?: string;
  note?: string;
}): Promise<{ ok: boolean; deduplicated: boolean; message: string }> {
  if (!input.organizationId || !input.invoiceId || !input.providerEventId.trim()) {
    return { ok: false, deduplicated: false, message: "Ledger entries require an organization, invoice, and provider event id." };
  }

  try {
    const db = adminDb();
    const insert = await run<{ id: string }>(db.from("sponsor_payment_ledger_entries").insert({
      organization_id: input.organizationId,
      invoice_id: input.invoiceId,
      kind: input.kind,
      amount_cents: Math.max(0, input.amountCents),
      currency: "usd",
      provider: input.provider,
      provider_event_id: input.providerEventId,
      occurred_at: input.occurredAt,
      recorded_by_user_id: input.recordedByUserId ?? null,
      note: input.note ?? null
    }).select("id").maybeSingle());

    if (insert.error) {
      if (insert.error.code === UNIQUE_VIOLATION) {
        return { ok: true, deduplicated: true, message: "This payment event was already recorded. No second ledger entry was created." };
      }
      return { ok: false, deduplicated: false, message: "The payment ledger entry could not be recorded." };
    }

    return { ok: true, deduplicated: false, message: "Payment ledger entry recorded. Balances are folded from the ledger on read." };
  } catch {
    return { ok: false, deduplicated: false, message: "The payment ledger entry could not be recorded." };
  }
}

/**
 * Record a payment a league collected outside a processor - a cheque, cash, or a bank transfer.
 * `provider: "manual"` is a first-class ledger provider, not a placeholder: it is how a league that
 * has not enabled live collection keeps a truthful paid total.
 */
export async function recordManualSponsorPayment(input: {
  invoiceId: string;
  actorUserId: string;
  amountCents: number;
  occurredAt?: string;
  note?: string;
}) {
  if (!input.invoiceId || !input.actorUserId) {
    return { ok: false, message: "Manual payment recording requires an invoice and an authenticated actor." };
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    return { ok: false, message: "Manual payment amount must be a positive whole number of cents." };
  }

  try {
    const db = adminDb();
    const invoice = await run<{ id: string; organization_id: string; amount_cents: number }>(db.from("sponsorship_invoices")
      .select("id,organization_id,amount_cents")
      .eq("id", input.invoiceId)
      .maybeSingle());
    if (invoice.error || !invoice.data) return { ok: false, message: "The sponsor invoice could not be found." };

    const access = await requireActiveOrganizationAdmin({
      db,
      organizationId: invoice.data.organization_id,
      userId: input.actorUserId,
      action: "record a sponsor payment"
    });
    if (!access.ok) return { ok: false, message: access.message };

    const occurredAt = input.occurredAt ?? new Date().toISOString();
    const providerEventId = `manual:${randomUUID()}`;
    const ledger = await recordSponsorPaymentEvent({
      organizationId: invoice.data.organization_id,
      invoiceId: invoice.data.id,
      kind: "PaymentSucceeded",
      amountCents: input.amountCents,
      provider: "manual",
      providerEventId,
      occurredAt,
      recordedByUserId: input.actorUserId,
      note: input.note
    });
    if (!ledger.ok) return { ok: false, message: ledger.message };

    await run(db.from("audit_events").insert({
      organization_id: invoice.data.organization_id,
      actor_user_id: input.actorUserId,
      action: "sponsor_manual_payment_recorded",
      target_type: "sponsorship_invoice",
      target_id: invoice.data.id,
      summary: `Manual sponsor payment of ${input.amountCents} cents recorded against invoice ${invoice.data.id}. No processor settlement evidence is claimed for this entry.`
    }));

    return {
      ok: true,
      message: "Manual sponsor payment recorded. This is a league-recorded payment, not processor settlement evidence."
    };
  } catch {
    return { ok: false, message: "The manual sponsor payment could not be recorded." };
  }
}
