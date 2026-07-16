import type { NormalizedProviderWebhookEvent } from "@/lib/services/notifications/webhooks";
import { dedupeProviderWebhookEvents } from "@/lib/services/notifications/webhooks";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Provider webhook tables are staged until generated types are refreshed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

type AttemptProvider = "email" | "sms";

function adminDb() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

function attemptProviderForWebhook(provider: NormalizedProviderWebhookEvent["provider"]): AttemptProvider {
  return provider === "sendgrid" ? "email" : "sms";
}

async function findWebhookAttempt(db: UnsafeSupabase, event: NormalizedProviderWebhookEvent) {
  if (event.attemptId) {
    const { data } = await withSupabaseTimeout(db
      .from("notification_delivery_attempts")
      .select("id,notification_id")
      .eq("id", event.attemptId)
      .maybeSingle(), 7000) as {
        data: { id: string; notification_id: string } | null;
      };
    if (data) return data;
  }

  if (!event.providerMessageId) return null;
  const { data } = await withSupabaseTimeout(db
    .from("notification_delivery_attempts")
    .select("id,notification_id")
    .eq("provider", attemptProviderForWebhook(event.provider))
    .eq("provider_message_id", event.providerMessageId)
    .maybeSingle(), 7000) as {
      data: { id: string; notification_id: string } | null;
    };
  return data ?? null;
}

async function insertWebhookEvent(db: UnsafeSupabase, event: NormalizedProviderWebhookEvent, attempt: { id: string; notification_id: string } | null) {
  const { data, error } = await withSupabaseTimeout(db
    .from("notification_provider_webhook_events")
    .upsert({
      provider: event.provider,
      event_id: event.eventId,
      provider_message_id: event.providerMessageId,
      notification_id: event.notificationId ?? attempt?.notification_id ?? null,
      attempt_id: event.attemptId ?? attempt?.id ?? null,
      event_type: event.eventType,
      provider_status: event.providerStatus,
      notification_status: event.notificationStatus,
      payload_json: event.payload,
      processed_at: new Date().toISOString()
    }, { onConflict: "provider,event_id", ignoreDuplicates: true })
    .select("id")
    .maybeSingle(), 7000) as {
      data: { id: string } | null;
      error: { message?: string } | null;
    };

  if (error) return { ok: false as const, duplicate: false, message: "Provider webhook event could not be recorded." };
  if (!data) return { ok: true as const, duplicate: true };
  return { ok: true as const, duplicate: false };
}

async function updateAttemptFromWebhook(db: UnsafeSupabase, event: NormalizedProviderWebhookEvent, attempt: { id: string; notification_id: string } | null) {
  if (!attempt) return;

  await withSupabaseTimeout(db
    .from("notification_delivery_attempts")
    .update({
      status: event.attemptStatus,
      provider_status: event.providerStatus,
      provider_response_json: event.payload,
      last_webhook_event_id: event.eventId,
      error_code: event.attemptStatus === "failed" ? `provider_${event.providerStatus}` : null,
      error_message: event.attemptStatus === "failed" ? `Provider webhook reported ${event.providerStatus}.` : null
    })
    .eq("id", attempt.id), 7000);
}

async function updateNotificationFromWebhook(db: UnsafeSupabase, event: NormalizedProviderWebhookEvent, notificationId: string | null | undefined) {
  if (!notificationId || event.notificationStatus === "pending") return;

  const now = new Date().toISOString();
  const update = event.notificationStatus === "read"
    ? { status: "read", read_at: now, sent_at: now }
    : event.notificationStatus === "sent"
      ? { status: "sent", sent_at: now }
      : { status: "failed" };

  await withSupabaseTimeout(db
    .from("notifications")
    .update(update)
    .eq("id", notificationId), 7000);
}

export async function reconcileProviderWebhookEvents(events: NormalizedProviderWebhookEvent[]) {
  if (!events.length) {
    return { ok: true, message: "No provider webhook events to reconcile.", processed: 0, duplicates: 0, failed: 0 };
  }

  const db = adminDb();
  const { deduped, duplicateEventIds } = dedupeProviderWebhookEvents(events);
  let processed = 0;
  let duplicates = duplicateEventIds.length;
  let failed = 0;

  for (const event of deduped) {
    try {
      const attempt = await findWebhookAttempt(db, event);
      const inserted = await insertWebhookEvent(db, event, attempt);
      if (!inserted.ok) {
        failed += 1;
        continue;
      }
      if (inserted.duplicate) {
        duplicates += 1;
        continue;
      }

      await updateAttemptFromWebhook(db, event, attempt);
      await updateNotificationFromWebhook(db, event, event.notificationId ?? attempt?.notification_id);
      processed += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    ok: failed === 0,
    message: `${processed} provider webhook event(s) reconciled; ${duplicates} duplicate(s) skipped.`,
    processed,
    duplicates,
    failed
  };
}
