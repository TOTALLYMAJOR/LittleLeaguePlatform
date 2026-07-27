import { createHash, randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";
import {
  createSmsContactFingerprint,
  normalizeSmsRecipient,
  smsContactDigestSecretReady
} from "@/lib/services/notifications/sms-contact-suppression";

type UnsafeSupabase = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(name: string, args: Record<string, unknown>): any;
};

type ProviderWebhook = {
  provider: "sendgrid" | "twilio" | "pingram";
  providerEventId: string;
  providerCallbackId?: string;
  providerMessageId?: string;
  eventType: string;
  payload: Record<string, unknown>;
  rawBody?: string;
  signatureVerifiedAt: string;
  smsRecipientAuthority?: {
    organizationId: string;
    userId: string;
  };
};

type DeliveryAttemptEvidence = {
  deliveredAt?: string | null;
  providerAcceptedAt?: string | null;
  requestOutcome?: string | null;
};

export function providerWebhookAttemptEvidenceUpdate(
  event: Pick<ProviderWebhook, "provider" | "eventType" | "signatureVerifiedAt">,
  attempt: DeliveryAttemptEvidence = {}
) {
  const observedAt = event.signatureVerifiedAt;
  if (event.provider === "sendgrid") {
    if (event.eventType === "delivered") return { delivered_at: observedAt, status: "sent" };
    if (event.eventType === "bounce" || event.eventType === "dropped" || event.eventType === "deferred") {
      return { bounced_at: observedAt, status: "failed" };
    }
    if (event.eventType === "spamreport") return { complained_at: observedAt, status: "failed" };
    if (event.eventType === "open") return { read_at: observedAt };
    if (event.eventType === "processed") return { provider_accepted_at: observedAt };
  }
  if (event.provider === "twilio") {
    if (event.eventType === "delivered") return { delivered_at: observedAt, status: "sent" };
    if (event.eventType === "read") return { read_at: observedAt };
    if (["failed", "undelivered"].includes(event.eventType)) return { status: "failed" };
    if (["accepted", "queued", "sending", "sent"].includes(event.eventType)) return { provider_accepted_at: observedAt };
  }
  if (event.provider === "pingram") {
    const terminalReconciliation = ["SMS_DELIVERED", "SMS_FAILED"].includes(event.eventType)
      ? {
        reconciliation_required_at: null,
        ...(attempt.requestOutcome === "indeterminate"
          ? {
            request_outcome: "provider_accepted",
            provider_accepted_at: attempt.providerAcceptedAt ?? observedAt,
            error_code: null,
            error_message: null
          }
          : {})
      }
      : {};
    if (event.eventType === "SMS_DELIVERED") {
      return {
        delivered_at: observedAt,
        status: "sent",
        ...terminalReconciliation
      };
    }
    if (event.eventType === "SMS_FAILED") {
      return {
        ...(!attempt.deliveredAt ? { status: "failed" } : {}),
        ...terminalReconciliation
      };
    }
  }
  return {};
}

async function applyPingramSmsContactState(
  db: UnsafeSupabase,
  event: ProviderWebhook,
  webhookRecordId: string,
  processingLeaseId: string
) {
  if (
    event.provider !== "pingram" ||
    !["SMS_UNSUBSCRIBE", "SMS_SUBSCRIBE"].includes(event.eventType) ||
    !event.smsRecipientAuthority
  ) {
    return { applied: false, relevant: false };
  }

  const secret = process.env.PINGRAM_CONTACT_DIGEST_SECRET ?? "";
  if (!smsContactDigestSecretReady(secret)) {
    return {
      applied: false,
      relevant: true,
      error: "Pingram contact-digest verification is not configured."
    };
  }

  const authority = event.smsRecipientAuthority;
  const { data: profile } = await withSupabaseTimeout(db
    .from("profiles")
    .select("id,phone")
    .eq("id", authority.userId)
    .maybeSingle(), 7000) as {
      data: { id: string; phone: string | null } | null;
    };

  const phone = normalizeSmsRecipient(profile?.phone);
  if (!profile || !phone) {
    return {
      applied: false,
      relevant: true,
      error: "Pingram recipient authority could not be matched."
    };
  }

  const observedAt = event.signatureVerifiedAt;
  const state = event.eventType === "SMS_UNSUBSCRIBE" ? "suppressed" : "subscribed";
  const fingerprint = createSmsContactFingerprint({
    organizationId: authority.organizationId,
    userId: authority.userId,
    phone,
    secret
  });
  const { data: result, error } = await withSupabaseTimeout(db.rpc(
    "apply_pingram_sms_contact_state_transaction",
    {
      p_provider_event_id: event.providerEventId,
      p_processing_lease_id: processingLeaseId,
      p_organization_id: authority.organizationId,
      p_user_id: authority.userId,
      p_contact_fingerprint: fingerprint,
      p_state: state,
      p_observed_at: observedAt
    }
  ), 7000) as {
    data: { ok?: boolean; code?: string } | null;
    error: { message?: string } | null;
  };
  if (error || !result?.ok) {
    return {
      applied: false,
      relevant: true,
      error: "Pingram SMS consent state could not be committed atomically."
    };
  }

  return { applied: true, relevant: true, webhookRecordId };
}

export async function recordVerifiedProviderWebhook(event: ProviderWebhook) {
  const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
  const payloadHash = createHash("sha256")
    .update(event.rawBody ?? JSON.stringify(event.payload))
    .digest("hex");
  const processingLeaseId = randomUUID();
  let webhookRecordId: string | null = null;
  try {
    let attempt: {
      id: string;
      notification_id: string;
      delivered_at: string | null;
      provider_accepted_at: string | null;
      request_outcome: string | null;
    } | null = null;
    if (event.providerMessageId) {
      let attemptQuery = db
        .from("notification_delivery_attempts")
        .select("id,notification_id,delivered_at,provider_accepted_at,request_outcome")
        .eq("provider_message_id", event.providerMessageId);
      if (event.provider === "pingram") {
        attemptQuery = attemptQuery.eq("transport_provider", "pingram");
      }
      const attemptResult = await withSupabaseTimeout(attemptQuery.maybeSingle(), 7000) as {
        data: {
          id: string;
          notification_id: string;
          delivered_at: string | null;
          provider_accepted_at: string | null;
          request_outcome: string | null;
        } | null;
      };
      attempt = attemptResult.data;
    }

    const { data: claim, error: claimError } = await withSupabaseTimeout(db.rpc(
      "claim_provider_webhook_event",
      {
        p_provider: event.provider,
        p_provider_event_id: event.providerEventId,
        p_provider_callback_id: event.providerCallbackId ?? null,
        p_notification_delivery_attempt_id: attempt?.id ?? null,
        p_event_type: event.eventType,
        p_provider_message_id: event.providerMessageId ?? null,
        p_signature_verified_at: event.signatureVerifiedAt,
        p_payload_hash: payloadHash,
        p_received_at: event.signatureVerifiedAt,
        p_processing_lease_id: processingLeaseId
      }
    ), 7000) as {
      data: {
        ok?: boolean;
        claimed?: boolean;
        duplicate?: boolean;
        in_progress?: boolean;
        id?: string;
      } | null;
      error: { message?: string } | null;
    };
    if (claimError || !claim?.ok) {
      return { ok: false, message: "Provider webhook evidence could not be recorded." };
    }
    if (!claim.claimed) {
      return claim.duplicate
        ? { ok: true, duplicate: true, message: "Duplicate provider webhook ignored." }
        : { ok: false, duplicate: true, message: "Provider webhook processing is already in progress." };
    }
    webhookRecordId = claim.id ?? null;
    if (!webhookRecordId) {
      return { ok: false, message: "Provider webhook evidence could not be recorded." };
    }

    const contactState = await applyPingramSmsContactState(
      db,
      event,
      webhookRecordId,
      processingLeaseId
    );
    if (contactState.relevant && !contactState.applied) {
      throw new Error(contactState.error ?? "Pingram SMS contact state could not be applied.");
    }
    if (contactState.applied) {
      return {
        ok: true,
        duplicate: false,
        matched: Boolean(attempt),
        message: "Verified Pingram SMS consent evidence recorded."
      };
    }

    if (
      event.provider === "pingram" &&
      event.eventType === "SMS_INBOUND"
    ) {
      const { data: processed, error: processedError } = await withSupabaseTimeout(db.from("provider_webhook_events").update({
        processed_at: new Date().toISOString(),
        processing_error: null,
        processing_started_at: null,
        processing_lease_id: null
      })
        .eq("id", webhookRecordId)
        .eq("processing_lease_id", processingLeaseId)
        .is("processed_at", null)
        .select("id")
        .maybeSingle(), 7000) as {
        data: { id: string } | null;
        error: { message?: string } | null;
      };
      if (processedError || !processed) {
        throw new Error("Pingram webhook processing state could not be finalized");
      }
      return {
        ok: true,
        duplicate: false,
        matched: Boolean(attempt),
        message: "Verified Pingram inbound evidence recorded without automated reply handling."
      };
    }

    if (!attempt) {
      const { data: pendingRecord, error: unmatchedError } = await withSupabaseTimeout(db.from("provider_webhook_events").update({
        processing_error: "Matching delivery attempt is pending reconciliation.",
        processing_started_at: null,
        processing_lease_id: null
      })
        .eq("id", webhookRecordId)
        .eq("processing_lease_id", processingLeaseId)
        .is("processed_at", null)
        .select("id")
        .maybeSingle(), 7000) as {
        data: { id: string } | null;
        error: { message?: string } | null;
      };
      if (unmatchedError) {
        throw new Error("Unmatched provider webhook evidence could not be held for reconciliation");
      }
      if (!pendingRecord) {
        return {
          ok: true,
          duplicate: false,
          matched: true,
          message: "Verified provider event was reconciled concurrently."
        };
      }
      return {
        ok: false,
        duplicate: false,
        matched: false,
        message: "Verified provider event is pending delivery-attempt reconciliation."
      };
    }

    const update = {
      ...providerWebhookAttemptEvidenceUpdate(event, {
        deliveredAt: attempt.delivered_at,
        providerAcceptedAt: attempt.provider_accepted_at,
        requestOutcome: attempt.request_outcome
      }),
      webhook_verified_at: event.signatureVerifiedAt,
      provider_status: event.eventType,
      last_webhook_event_id: event.providerEventId
    };
    const { error: attemptError } = await withSupabaseTimeout(
      db.from("notification_delivery_attempts").update(update).eq("id", attempt.id),
      7000
    ) as {
      error: { message?: string } | null;
    };
    if (attemptError) {
      throw new Error("provider attempt evidence update failed");
    }
    if (event.eventType === "read") {
      const { error: notificationError } = await withSupabaseTimeout(db.from("notifications").update({
        status: "read",
        read_at: event.signatureVerifiedAt
      }).eq("id", attempt.notification_id), 7000) as {
        error: { message?: string } | null;
      };
      if (notificationError) {
        throw new Error("notification read evidence update failed");
      }
    } else if (["delivered", "SMS_DELIVERED"].includes(event.eventType)) {
      const { error: notificationError } = await withSupabaseTimeout(
        db.from("notifications")
          .update({
            status: "sent",
            sent_at: event.signatureVerifiedAt
          })
          .eq("id", attempt.notification_id)
          .neq("status", "read"),
        7000
      ) as {
        error: { message?: string } | null;
      };
      if (notificationError) {
        throw new Error("notification delivery evidence update failed");
      }
    } else if (
      !attempt.delivered_at &&
      ["failed", "undelivered", "bounce", "dropped", "spamreport", "SMS_FAILED"].includes(event.eventType)
    ) {
      const { error: notificationError } = await withSupabaseTimeout(
        db.from("notifications")
          .update({ status: "failed" })
          .eq("id", attempt.notification_id)
          .neq("status", "read"),
        7000
      ) as {
        error: { message?: string } | null;
      };
      if (notificationError) {
        throw new Error("notification failure evidence update failed");
      }
    }
    const { data: processed, error: processedError } = await withSupabaseTimeout(db.from("provider_webhook_events").update({
      processed_at: new Date().toISOString(),
      processing_error: null,
      processing_started_at: null,
      processing_lease_id: null
    })
      .eq("id", webhookRecordId)
      .eq("processing_lease_id", processingLeaseId)
      .is("processed_at", null)
      .select("id")
      .maybeSingle(), 7000) as {
      data: { id: string } | null;
      error: { message?: string } | null;
    };
    if (processedError || !processed) {
      throw new Error("provider webhook processing state update failed");
    }
    return {
      ok: true,
      duplicate: false,
      matched: true,
      message: "Verified provider evidence recorded without collapsing delivery, read, or acknowledgment."
    };
  } catch {
    if (webhookRecordId) {
      try {
        await withSupabaseTimeout(db.from("provider_webhook_events").update({
          processing_error: "Provider webhook processing requires retry.",
          processing_started_at: null,
          processing_lease_id: null
        })
          .eq("id", webhookRecordId)
          .eq("processing_lease_id", processingLeaseId)
          .is("processed_at", null), 7000);
      } catch {
        // The verified event record remains unprocessed and fails closed.
      }
    }
    return { ok: false, message: "Provider webhook evidence could not reach team records." };
  }
}
