import { createHmac, createVerify } from "node:crypto";

export interface NormalizedProviderWebhookEvent {
  provider: "sendgrid" | "twilio";
  eventId: string;
  providerMessageId: string | null;
  attemptId?: string | null;
  notificationId?: string | null;
  eventType: string;
  providerStatus: string;
  notificationStatus: "pending" | "sent" | "failed" | "read";
  attemptStatus: "sent" | "failed";
  payload: Record<string, unknown>;
}

export function verifySendGridWebhookSignature(input: {
  publicKey: string;
  timestamp: string;
  signature: string;
  rawBody: string;
}) {
  if (!input.publicKey || !input.timestamp || !input.signature || !input.rawBody) return false;
  try {
    const verifier = createVerify("sha256");
    verifier.update(input.timestamp);
    verifier.update(input.rawBody);
    verifier.end();
    return verifier.verify(input.publicKey, Buffer.from(input.signature, "base64"));
  } catch {
    return false;
  }
}

export function twilioSignatureBaseString(url: string, params: URLSearchParams) {
  const pairs = Array.from(params.entries()).sort(([left], [right]) => left.localeCompare(right));
  return pairs.reduce((base, [key, value]) => `${base}${key}${value}`, url);
}

export function computeTwilioSignature(input: {
  authToken: string;
  url: string;
  params: URLSearchParams;
}) {
  return createHmac("sha1", input.authToken)
    .update(twilioSignatureBaseString(input.url, input.params))
    .digest("base64");
}

export function verifyTwilioWebhookSignature(input: {
  authToken: string;
  url: string;
  params: URLSearchParams;
  signature: string;
}) {
  if (!input.authToken || !input.url || !input.signature) return false;
  return computeTwilioSignature(input) === input.signature;
}

function valueAsString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function sendGridNotificationStatus(eventType: string): NormalizedProviderWebhookEvent["notificationStatus"] {
  if (eventType === "open" || eventType === "click") return "read";
  if (eventType === "bounce" || eventType === "dropped" || eventType === "spamreport") return "failed";
  if (eventType === "delivered") return "sent";
  return "pending";
}

function twilioNotificationStatus(status: string): NormalizedProviderWebhookEvent["notificationStatus"] {
  if (status === "delivered") return "sent";
  if (status === "failed" || status === "undelivered") return "failed";
  return "pending";
}

export function normalizeSendGridEvent(event: Record<string, unknown>): NormalizedProviderWebhookEvent {
  const eventType = valueAsString(event.event) ?? "unknown";
  const providerMessageId = valueAsString(event.sg_message_id) ?? valueAsString(event.smtp_id);
  const eventId = valueAsString(event.sg_event_id)
    ?? `${providerMessageId ?? "unknown"}:${eventType}:${valueAsString(event.timestamp) ?? "0"}`;
  const attemptId = valueAsString(event.attempt_id);
  const notificationId = valueAsString(event.notification_id);
  const notificationStatus = sendGridNotificationStatus(eventType);

  return {
    provider: "sendgrid",
    eventId,
    providerMessageId,
    attemptId,
    notificationId,
    eventType,
    providerStatus: eventType,
    notificationStatus,
    attemptStatus: notificationStatus === "failed" ? "failed" : "sent",
    payload: event
  };
}

export function normalizeTwilioStatusCallback(params: URLSearchParams): NormalizedProviderWebhookEvent {
  const status = params.get("MessageStatus") ?? params.get("SmsStatus") ?? "unknown";
  const providerMessageId = params.get("MessageSid") ?? params.get("SmsSid");
  const eventId = params.get("EventSid")
    ?? `${providerMessageId ?? "unknown"}:${status}:${params.get("Timestamp") ?? Date.now()}`;
  const notificationStatus = twilioNotificationStatus(status);

  return {
    provider: "twilio",
    eventId,
    providerMessageId,
    attemptId: params.get("AttemptId"),
    notificationId: params.get("NotificationId"),
    eventType: status,
    providerStatus: status,
    notificationStatus,
    attemptStatus: notificationStatus === "failed" ? "failed" : "sent",
    payload: Object.fromEntries(params.entries())
  };
}

export function dedupeProviderWebhookEvents(events: NormalizedProviderWebhookEvent[]) {
  const seen = new Set<string>();
  const deduped: NormalizedProviderWebhookEvent[] = [];
  const duplicateEventIds: string[] = [];

  for (const event of events) {
    const key = `${event.provider}:${event.eventId}`;
    if (seen.has(key)) {
      duplicateEventIds.push(event.eventId);
      continue;
    }
    seen.add(key);
    deduped.push(event);
  }

  return { deduped, duplicateEventIds };
}
