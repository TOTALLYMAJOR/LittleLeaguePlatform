import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

export type FamilyBalanceEvidenceStatus =
  | "invoice_created"
  | "payment_link_issued"
  | "processing"
  | "confirmed"
  | "failed"
  | "credit_applied"
  | "status_unavailable";

function evidenceStatus(row: {
  confirmed_at: string | null;
  credit_applied_at: string | null;
  failed_at: string | null;
  processing_at: string | null;
  payment_link_issued_at: string | null;
  invoice_created_at: string | null;
}): FamilyBalanceEvidenceStatus {
  if (row.confirmed_at) return "confirmed";
  if (row.credit_applied_at) return "credit_applied";
  if (row.failed_at) return "failed";
  if (row.processing_at) return "processing";
  if (row.payment_link_issued_at) return "payment_link_issued";
  if (row.invoice_created_at) return "invoice_created";
  return "status_unavailable";
}

export async function listFamilyBalanceSummary(parentUserId: string) {
  if (!parentUserId) return { ok: false, message: "Family Balance Summary requires a guardian session.", items: [] };
  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const { data, error } = await withSupabaseTimeout(db.from("family_obligations")
      .select("id,organization_id,season_id,player_id,guardian_user_id,amount_cents,currency,invoice_created_at,payment_link_issued_at,processing_at,confirmed_at,failed_at,credit_applied_at,fee_definitions(label),players(first_name,last_initial,team_id)")
      .eq("guardian_user_id", parentUserId)
      .order("created_at", { ascending: false }), 7000) as {
        data: Array<{
          id: string;
          organization_id: string;
          season_id: string;
          player_id: string;
          guardian_user_id: string;
          amount_cents: number;
          currency: string;
          invoice_created_at: string | null;
          payment_link_issued_at: string | null;
          processing_at: string | null;
          confirmed_at: string | null;
          failed_at: string | null;
          credit_applied_at: string | null;
          fee_definitions: { label: string } | null;
          players: { first_name: string; last_initial: string; team_id: string } | null;
        }> | null;
        error: { message?: string } | null;
      };
    if (error) {
      return {
        ok: false,
        message: "Family balance evidence is unavailable. No amount or payment status was inferred.",
        items: []
      };
    }
    const items = (data ?? []).map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      seasonId: row.season_id,
      playerId: row.player_id,
      teamId: row.players?.team_id,
      label: row.fee_definitions?.label ?? `${row.players?.first_name ?? "Player"} ${row.players?.last_initial ?? ""}. fee`,
      amountCents: row.amount_cents,
      currency: row.currency,
      status: evidenceStatus(row),
      evidence: {
        invoiceCreatedAt: row.invoice_created_at,
        paymentLinkIssuedAt: row.payment_link_issued_at,
        processingAt: row.processing_at,
        confirmedAt: row.confirmed_at,
        failedAt: row.failed_at,
        creditAppliedAt: row.credit_applied_at
      }
    }));
    return {
      ok: true,
      message: items.length
        ? "Family balance evidence loaded for the signed-in guardian."
        : "No evidence-backed family obligations are recorded. No amount or payment status was inferred.",
      items,
      totalDueCents: items
        .filter((item) => !["confirmed", "credit_applied"].includes(item.status))
        .reduce((total, item) => total + item.amountCents, 0),
      confirmedCents: items
        .filter((item) => item.status === "confirmed")
        .reduce((total, item) => total + item.amountCents, 0),
      proofBoundary: "Only verified records and Stripe webhook evidence can show payment confirmation."
    };
  } catch {
    return {
      ok: false,
      message: "Family balance evidence could not reach team records. No status was inferred.",
      items: []
    };
  }
}
