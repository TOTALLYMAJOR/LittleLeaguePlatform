import { createHash } from "node:crypto";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

type ProviderWebhook = {
  provider: "sendgrid" | "twilio";
  providerEventId: string;
  providerMessageId: string;
  eventType: string;
  payload: Record<string, unknown>;
  signatureVerifiedAt: string;
};

function evidenceUpdate(event: ProviderWebhook) {
  const observedAt = event.signatureVerifiedAt;
  if (event.provider === "sendgrid") {
    if (event.eventType === "delivered") return { delivered_at: observedAt };
    if (event.eventType === "bounce" || event.eventType === "dropped" || event.eventType === "deferred") {
      return { bounced_at: observedAt, status: "failed" };
    }
    if (event.eventType === "spamreport") return { complained_at: observedAt, status: "failed" };
    if (event.eventType === "open") return { read_at: observedAt };
    if (event.eventType === "processed") return { provider_accepted_at: observedAt };
  }
  if (event.provider === "twilio") {
    if (event.eventType === "delivered") return { delivered_at: observedAt };
    if (event.eventType === "read") return { read_at: observedAt };
    if (["failed", "undelivered"].includes(event.eventType)) return { status: "failed" };
    if (["accepted", "queued", "sending", "sent"].includes(event.eventType)) return { provider_accepted_at: observedAt };
  }
  return {};
}

export async function recordVerifiedProviderWebhook(event: ProviderWebhook) {
  const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
  const payloadHash = createHash("sha256").update(JSON.stringify(event.payload)).digest("hex");
  try {
    const { data: attempt } = await withSupabaseTimeout(db
      .from("notification_delivery_attempts")
      .select("id,notification_id")
      .eq("provider_message_id", event.providerMessageId)
      .maybeSingle(), 7000) as {
        data: { id: string; notification_id: string } | null;
      };

    const { data: webhookRecord, error } = await withSupabaseTimeout(db
      .from("provider_webhook_events")
      .insert({
        provider: event.provider,
        provider_event_id: event.providerEventId,
        notification_delivery_attempt_id: attempt?.id ?? null,
        signature_verified_at: event.signatureVerifiedAt,
        payload_hash: payloadHash,
        received_at: event.signatureVerifiedAt
      })
      .select("id")
      .single(), 7000) as {
        data: { id: string } | null;
        error: { code?: string; message?: string } | null;
      };
    if (error?.code === "23505") {
      return { ok: true, duplicate: true, message: "Duplicate provider webhook ignored." };
    }
    if (error || !webhookRecord) {
      return { ok: false, message: "Provider webhook evidence could not be recorded." };
    }
    if (!attempt) {
      await withSupabaseTimeout(db.from("provider_webhook_events").update({
        processed_at: new Date().toISOString(),
        processing_error: "Matching delivery attempt was not found."
      }).eq("id", webhookRecord.id), 7000);
      return { ok: true, duplicate: false, matched: false, message: "Verified provider event recorded for later reconciliation." };
    }

    const update = {
      ...evidenceUpdate(event),
      webhook_verified_at: event.signatureVerifiedAt,
      provider_status: event.eventType
    };
    await withSupabaseTimeout(db.from("notification_delivery_attempts").update(update).eq("id", attempt.id), 7000);
    if (event.eventType === "read") {
      await withSupabaseTimeout(db.from("notifications").update({
        status: "read",
        read_at: event.signatureVerifiedAt
      }).eq("id", attempt.notification_id), 7000);
    } else if (["failed", "undelivered", "bounce", "dropped", "spamreport"].includes(event.eventType)) {
      await withSupabaseTimeout(db.from("notifications").update({ status: "failed" }).eq("id", attempt.notification_id), 7000);
    }
    await withSupabaseTimeout(db.from("provider_webhook_events").update({
      processed_at: new Date().toISOString(),
      processing_error: null
    }).eq("id", webhookRecord.id), 7000);
    return {
      ok: true,
      duplicate: false,
      matched: true,
      message: "Verified provider evidence recorded without collapsing delivery, read, or acknowledgment."
    };
  } catch {
    return { ok: false, message: "Provider webhook evidence could not reach team records." };
  }
}
