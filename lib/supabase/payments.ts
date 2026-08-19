import Stripe from "stripe";
import { featureGateDecision } from "@/lib/services/feature-gates";
import { stripeClient, stripeConnectReadiness } from "@/lib/services/stripe-connect";
import { requireActiveOrganizationAdmin } from "./access-control";
import { recordSponsorPaymentEvent } from "./sponsor-program";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

type Result<T> = { data: T | null; error: { code?: string; message?: string } | null };

function dbClient() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

function run<T>(operation: PromiseLike<unknown>) {
  return withSupabaseTimeout(operation as PromiseLike<Result<T>>, 10000);
}

async function loadPaymentGate(db: UnsafeSupabase, organizationId: string) {
  const organization = await run<{ payments_enabled: boolean }>(db.from("organizations")
    .select("payments_enabled")
    .eq("id", organizationId)
    .maybeSingle());
  const gate = featureGateDecision({
    feature: "payments",
    organizationEnabled: organization.data?.payments_enabled
  });
  const readiness = stripeConnectReadiness();
  return readiness.configured
    ? gate
    : { ...gate, enabled: false, reason: readiness.reason };
}

export async function createStripeConnectOnboarding(input: {
  organizationId: string;
  actorUserId: string;
}) {
  try {
    const db = dbClient();
    const access = await requireActiveOrganizationAdmin({
      db,
      organizationId: input.organizationId,
      userId: input.actorUserId,
      action: "configure league payment processing"
    });
    if (!access.ok) return { ok: false, message: access.message };
    const gate = await loadPaymentGate(db, input.organizationId);
    if (!gate.enabled) return { ok: false, code: "feature_disabled", message: gate.reason };
    const stripe = stripeClient();
    const existing = await run<{ stripe_account_id: string }>(db.from("organization_stripe_accounts")
      .select("stripe_account_id")
      .eq("organization_id", input.organizationId)
      .maybeSingle());
    const accountId = existing.data?.stripe_account_id ?? (await stripe.accounts.create({
      type: "standard",
      metadata: { leaguepilot_organization_id: input.organizationId }
    })).id;
    if (!existing.data) {
      const stored = await run(db.from("organization_stripe_accounts").insert({
        organization_id: input.organizationId,
        stripe_account_id: accountId,
        dashboard_access: "full",
        onboarding_started_at: new Date().toISOString()
      }).select("id").single());
      if (stored.error) return { ok: false, message: "Stripe account was created but league evidence could not be stored." };
    }
    const link = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      return_url: process.env.STRIPE_CONNECT_RETURN_URL!,
      refresh_url: process.env.STRIPE_CONNECT_REFRESH_URL!
    });
    return {
      ok: true,
      message: "Stripe Standard onboarding link created. Account activation and payment readiness are not yet confirmed.",
      onboardingUrl: link.url,
      expiresAt: new Date(link.expires_at * 1000).toISOString()
    };
  } catch {
    return { ok: false, message: "Stripe Connect onboarding could not be created." };
  }
}

export async function createFamilyFeeCheckout(input: {
  familyObligationId: string;
  guardianUserId: string;
}) {
  try {
    const db = dbClient();
    const obligation = await run<{
      id: string;
      organization_id: string;
      guardian_user_id: string;
      amount_cents: number;
      currency: string;
      confirmed_at: string | null;
      fee_definitions: { label: string } | null;
    }>(db.from("family_obligations")
      .select("id,organization_id,guardian_user_id,amount_cents,currency,confirmed_at,fee_definitions(label)")
      .eq("id", input.familyObligationId)
      .eq("guardian_user_id", input.guardianUserId)
      .maybeSingle());
    if (obligation.error || !obligation.data) return { ok: false, message: "Family obligation was not found for this guardian." };
    if (obligation.data.confirmed_at) return { ok: false, message: "Payment is already confirmed by provider evidence." };
    const gate = await loadPaymentGate(db, obligation.data.organization_id);
    if (!gate.enabled) return { ok: false, code: "feature_disabled", message: gate.reason };
    const account = await run<{ stripe_account_id: string; charges_enabled_at: string | null }>(db.from("organization_stripe_accounts")
      .select("stripe_account_id,charges_enabled_at")
      .eq("organization_id", obligation.data.organization_id)
      .maybeSingle());
    if (!account.data?.stripe_account_id || !account.data.charges_enabled_at) {
      return { ok: false, message: "League payment account is not verified for charges." };
    }
    const stripe = stripeClient();
    const baseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "");
    if (!baseUrl) return { ok: false, message: "Hosted return URL is not configured." };
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: obligation.data.currency,
          unit_amount: obligation.data.amount_cents,
          product_data: {
            name: obligation.data.fee_definitions?.label ?? "League fee"
          }
        }
      }],
      success_url: `${baseUrl}/parent?payment_return=received&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/parent?payment_return=cancelled`,
      metadata: {
        leaguepilot_kind: "family_obligation",
        leaguepilot_obligation_id: obligation.data.id,
        leaguepilot_organization_id: obligation.data.organization_id
      },
      payment_intent_data: {
        metadata: {
          leaguepilot_kind: "family_obligation",
          leaguepilot_obligation_id: obligation.data.id,
          leaguepilot_organization_id: obligation.data.organization_id
        }
      }
    }, {
      stripeAccount: account.data.stripe_account_id,
      idempotencyKey: `family-obligation:${obligation.data.id}`
    });
    await run(db.from("family_obligations").update({
      stripe_checkout_session_id: session.id,
      payment_link_issued_at: new Date().toISOString()
    }).eq("id", obligation.data.id));
    return {
      ok: true,
      message: "Payment link issued. Returning from Stripe will not mark payment confirmed.",
      checkoutUrl: session.url
    };
  } catch {
    return { ok: false, message: "Family payment link could not be created." };
  }
}

export async function createSponsorInvoiceCheckout(input: {
  /** Preferred: a public.sponsorship_invoices id. */
  invoiceId?: string;
  /**
   * Migration-window fallback: a legacy public.sponsor_billing_records id, resolved through
   * sponsorship_invoices.legacy_billing_record_id. Retained so an in-flight admin session issued
   * before migration 20260819161500 keeps working.
   */
  sponsorBillingRecordId?: string;
  actorUserId: string;
}) {
  try {
    const db = dbClient();
    const invoiceId = input.invoiceId?.trim();
    const legacyId = input.sponsorBillingRecordId?.trim();
    if (!invoiceId && !legacyId) {
      return { ok: false, message: "A sponsor invoice is required." };
    }

    const invoiceQuery = db.from("sponsorship_invoices")
      .select("id,organization_id,amount_cents,currency,status,legacy_billing_record_id,sponsorship_agreements(sponsors(name))");
    const billing = await run<{
      id: string;
      organization_id: string;
      amount_cents: number;
      currency: string;
      status: string;
      legacy_billing_record_id: string | null;
      sponsorship_agreements: { sponsors: { name: string } | null } | null;
    }>(invoiceId
      ? invoiceQuery.eq("id", invoiceId).maybeSingle()
      : invoiceQuery.eq("legacy_billing_record_id", legacyId).maybeSingle());
    if (billing.error || !billing.data) return { ok: false, message: "Sponsor invoice was not found." };
    const access = await requireActiveOrganizationAdmin({
      db,
      organizationId: billing.data.organization_id,
      userId: input.actorUserId,
      action: "create a sponsor payment link"
    });
    if (!access.ok) return { ok: false, message: access.message };
    if (billing.data.status === "paid") return { ok: false, message: "This sponsor invoice is already paid according to the payment ledger." };
    if (billing.data.status === "void") return { ok: false, message: "This sponsor invoice is void." };
    const gate = await loadPaymentGate(db, billing.data.organization_id);
    if (!gate.enabled) return { ok: false, code: "feature_disabled", message: gate.reason };
    const account = await run<{ stripe_account_id: string; charges_enabled_at: string | null }>(db.from("organization_stripe_accounts")
      .select("stripe_account_id,charges_enabled_at")
      .eq("organization_id", billing.data.organization_id)
      .maybeSingle());
    if (!account.data?.stripe_account_id || !account.data.charges_enabled_at) {
      return { ok: false, message: "League payment account is not verified for charges." };
    }
    const baseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "");
    if (!baseUrl) return { ok: false, message: "Hosted return URL is not configured." };
    const stripe = stripeClient();
    const sponsorName = billing.data.sponsorship_agreements?.sponsors?.name ?? "Sponsor";
    const metadata = {
      leaguepilot_kind: "sponsor_billing",
      leaguepilot_sponsor_invoice_id: billing.data.id,
      // Retained so a webhook for a session created before this change still resolves.
      leaguepilot_sponsor_billing_id: billing.data.legacy_billing_record_id ?? "",
      leaguepilot_organization_id: billing.data.organization_id
    };
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        quantity: 1,
        price_data: {
          currency: billing.data.currency,
          unit_amount: billing.data.amount_cents,
          product_data: { name: `${sponsorName} league sponsorship` }
        }
      }],
      success_url: `${baseUrl}/admin/sponsors?payment_return=received&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/admin/sponsors?payment_return=cancelled`,
      metadata,
      payment_intent_data: { metadata }
    }, {
      stripeAccount: account.data.stripe_account_id,
      // Migrated invoices keep the legacy key so an in-flight session is never duplicated.
      idempotencyKey: billing.data.legacy_billing_record_id
        ? `sponsor-billing:${billing.data.legacy_billing_record_id}`
        : `sponsor-invoice:${billing.data.id}`
    });
    await run(db.from("sponsorship_invoices").update({
      stripe_checkout_session_id: session.id,
      payment_link_issued_at: new Date().toISOString(),
      status: "issued",
      issued_at: new Date().toISOString()
    }).eq("id", billing.data.id));
    if (billing.data.legacy_billing_record_id) {
      await run(db.from("sponsor_billing_records").update({
        stripe_checkout_session_id: session.id,
        payment_link_issued_at: new Date().toISOString()
      }).eq("id", billing.data.legacy_billing_record_id));
    }
    return {
      ok: true,
      message: "Sponsor payment link issued. Sponsor placement remains independent from payment state.",
      checkoutUrl: session.url
    };
  } catch {
    return { ok: false, message: "Sponsor payment link could not be created." };
  }
}

/**
 * Resolve the sponsorship invoice a Stripe event belongs to. Sessions created after migration
 * 20260819161500 carry the invoice id directly; sessions created before it carry only the legacy
 * sponsor_billing_records id, which maps through sponsorship_invoices.legacy_billing_record_id.
 */
async function resolveSponsorInvoice(db: UnsafeSupabase, input: {
  sponsorInvoiceId: string | null;
  sponsorBillingId: string | null;
}) {
  const query = db.from("sponsorship_invoices").select("id,organization_id,amount_cents,status");
  const result = await run<{ id: string; organization_id: string; amount_cents: number; status: string }>(
    input.sponsorInvoiceId
      ? query.eq("id", input.sponsorInvoiceId).maybeSingle()
      : query.eq("legacy_billing_record_id", input.sponsorBillingId).maybeSingle()
  );
  return result.error ? null : result.data;
}

export async function processVerifiedStripeEvent(event: Stripe.Event) {
  const db = dbClient();
  const connectedAccountId = event.account ?? "";
  if (!connectedAccountId) return { ok: false, message: "Connected account evidence is missing." };
  const account = await run<{ organization_id: string }>(db.from("organization_stripe_accounts")
    .select("organization_id")
    .eq("stripe_account_id", connectedAccountId)
    .maybeSingle());
  if (!account.data) return { ok: false, message: "Stripe event does not match a known league account." };
  const duplicate = await run<{ id: string }>(db.from("payment_evidence")
    .select("id")
    .eq("stripe_event_id", event.id)
    .maybeSingle());
  if (duplicate.data) return { ok: true, duplicate: true, message: "Duplicate Stripe event ignored." };

  const object = event.data.object as Stripe.Checkout.Session | Stripe.Account | Stripe.PaymentIntent | Stripe.Charge | Stripe.Dispute;
  const metadata = "metadata" in object && object.metadata ? object.metadata : {};
  const obligationId = metadata.leaguepilot_obligation_id || null;
  const sponsorBillingId = metadata.leaguepilot_sponsor_billing_id || null;
  const sponsorInvoiceId = metadata.leaguepilot_sponsor_invoice_id || null;
  const evidence = await run(db.from("payment_evidence").insert({
    organization_id: account.data.organization_id,
    family_obligation_id: obligationId,
    sponsor_billing_record_id: sponsorBillingId,
    stripe_account_id: connectedAccountId,
    stripe_event_id: event.id,
    stripe_checkout_session_id: object.object === "checkout.session" ? object.id : null,
    stripe_payment_intent_id: object.object === "payment_intent" ? object.id : null,
    amount_cents: "amount_total" in object ? object.amount_total : "amount" in object ? object.amount : null,
    currency: "currency" in object ? object.currency : null,
    provider_event_type: event.type,
    signature_verified_at: new Date().toISOString(),
    evidence_json: {
      livemode: event.livemode,
      requestId: event.request?.id ?? null,
      pendingWebhooks: event.pending_webhooks
    }
  }).select("id").single());
  if (evidence.error) return { ok: false, message: "Stripe payment evidence could not be recorded." };

  if (event.type === "checkout.session.completed" && object.object === "checkout.session" && obligationId) {
    const paymentConfirmed = object.payment_status === "paid";
    await run(db.from("family_obligations").update({
      processing_at: paymentConfirmed ? null : new Date().toISOString(),
      confirmed_at: paymentConfirmed ? new Date().toISOString() : null,
      stripe_checkout_session_id: object.id,
      stripe_payment_intent_id: typeof object.payment_intent === "string" ? object.payment_intent : null
    }).eq("id", obligationId));
  } else if (event.type === "checkout.session.completed" && object.object === "checkout.session" && (sponsorInvoiceId || sponsorBillingId)) {
    const paymentConfirmed = object.payment_status === "paid";
    const invoice = await resolveSponsorInvoice(db, { sponsorInvoiceId, sponsorBillingId });
    if (invoice) {
      // Settlement becomes a ledger entry. No paid/outstanding total is written anywhere: those are
      // folded from the ledger on read by lib/domain/sponsor-program.ts (ADR 0003).
      await recordSponsorPaymentEvent({
        organizationId: invoice.organization_id,
        invoiceId: invoice.id,
        kind: paymentConfirmed ? "PaymentSucceeded" : "PaymentFailed",
        amountCents: typeof object.amount_total === "number" ? object.amount_total : invoice.amount_cents,
        provider: "stripe",
        providerEventId: event.id,
        occurredAt: new Date(event.created * 1000).toISOString()
      });
      await run(db.from("sponsorship_invoices").update({
        stripe_checkout_session_id: object.id,
        stripe_payment_intent_id: typeof object.payment_intent === "string" ? object.payment_intent : null,
        status: paymentConfirmed ? "paid" : "issued"
      }).eq("id", invoice.id));
    }
    if (sponsorBillingId) {
      await run(db.from("sponsor_billing_records").update({
        processing_at: paymentConfirmed ? null : new Date().toISOString(),
        confirmed_at: paymentConfirmed ? new Date().toISOString() : null,
        stripe_checkout_session_id: object.id,
        stripe_payment_intent_id: typeof object.payment_intent === "string" ? object.payment_intent : null,
        status: paymentConfirmed ? "payment_recorded" : "invoice_ready",
        payment_proof_status: paymentConfirmed ? "paid" : "awaiting_invoice"
      }).eq("id", sponsorBillingId));
    }
  } else if (event.type === "payment_intent.payment_failed" && object.object === "payment_intent" && obligationId) {
    await run(db.from("family_obligations").update({
      failed_at: new Date().toISOString(),
      stripe_payment_intent_id: object.id
    }).eq("id", obligationId));
  } else if (event.type === "payment_intent.payment_failed" && object.object === "payment_intent" && (sponsorInvoiceId || sponsorBillingId)) {
    const invoice = await resolveSponsorInvoice(db, { sponsorInvoiceId, sponsorBillingId });
    if (invoice) {
      await recordSponsorPaymentEvent({
        organizationId: invoice.organization_id,
        invoiceId: invoice.id,
        kind: "PaymentFailed",
        amountCents: typeof object.amount === "number" ? object.amount : 0,
        provider: "stripe",
        providerEventId: event.id,
        occurredAt: new Date(event.created * 1000).toISOString()
      });
    }
    if (sponsorBillingId) {
      await run(db.from("sponsor_billing_records").update({
        failed_at: new Date().toISOString(),
        stripe_payment_intent_id: object.id
      }).eq("id", sponsorBillingId));
    }
  } else if ((event.type === "charge.refunded" || event.type === "charge.dispute.created") && (sponsorInvoiceId || sponsorBillingId)) {
    // A refund or dispute must reach the ledger, otherwise the folded payment state would keep
    // reporting "paid" after the money was reversed.
    const invoice = await resolveSponsorInvoice(db, { sponsorInvoiceId, sponsorBillingId });
    if (invoice) {
      const amountCents = "amount" in object && typeof object.amount === "number" ? object.amount : invoice.amount_cents;
      await recordSponsorPaymentEvent({
        organizationId: invoice.organization_id,
        invoiceId: invoice.id,
        kind: event.type === "charge.refunded" ? "RefundSucceeded" : "DisputeOpened",
        amountCents,
        provider: "stripe",
        providerEventId: event.id,
        occurredAt: new Date(event.created * 1000).toISOString()
      });
      if (event.type === "charge.refunded" && amountCents >= invoice.amount_cents) {
        await run(db.from("sponsorship_invoices").update({ status: "refunded" }).eq("id", invoice.id));
      }
    }
  } else if (event.type === "account.updated" && object.object === "account") {
    await run(db.from("organization_stripe_accounts").update({
      requirements_due_json: object.requirements?.currently_due ?? [],
      onboarding_completed_at: object.details_submitted ? new Date().toISOString() : null,
      charges_enabled_at: object.charges_enabled ? new Date().toISOString() : null,
      payouts_enabled_at: object.payouts_enabled ? new Date().toISOString() : null,
      last_verified_at: new Date().toISOString()
    }).eq("stripe_account_id", object.id));
  }
  return {
    ok: true,
    duplicate: false,
    message: "Verified Stripe webhook evidence recorded. Browser return state was not used."
  };
}
