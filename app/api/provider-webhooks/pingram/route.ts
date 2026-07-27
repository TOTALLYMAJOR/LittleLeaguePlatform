import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { verifyPingramWebhook } from "@/lib/services/notifications/webhook-verification";
import { smsContactDigestSecretReady } from "@/lib/services/notifications/sms-contact-suppression";
import { recordVerifiedProviderWebhook } from "@/lib/supabase/provider-webhooks";

const MAX_WEBHOOK_BYTES = 64 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PINGRAM_SMS_EVENTS = new Set([
  "SMS_DELIVERED",
  "SMS_FAILED",
  "SMS_UNSUBSCRIBE",
  "SMS_SUBSCRIBE",
  "SMS_INBOUND"
]);

function stringField(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parseRecipientAuthority(value: unknown) {
  const userId = stringField(value);
  const match = /^lp:([^:]+):([^:]+)$/.exec(userId);
  if (!match || !UUID_PATTERN.test(match[1]) || !UUID_PATTERN.test(match[2])) {
    return null;
  }
  return {
    organizationId: match[1],
    userId: match[2]
  };
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json(
      { ok: false, message: "Pingram webhook payload is too large." },
      { status: 413 }
    );
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) {
    return NextResponse.json(
      { ok: false, message: "Pingram webhook payload is too large." },
      { status: 413 }
    );
  }

  const callbackId = request.headers.get("x-pingram-id") ?? "";
  const signature = request.headers.get("x-pingram-signature") ?? "";
  const timestamp = request.headers.get("x-pingram-timestamp") ?? "";
  const secret = process.env.PINGRAM_WEBHOOK_SECRET ?? "";
  if (!verifyPingramWebhook({
    rawBody,
    eventId: callbackId,
    signature,
    timestamp,
    secret
  })) {
    return NextResponse.json(
      { ok: false, message: "Pingram webhook signature verification failed." },
      { status: 401 }
    );
  }

  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("invalid payload");
    }
    payload = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, message: "Pingram webhook payload must be a JSON object." },
      { status: 400 }
    );
  }

  const eventType = stringField(payload.eventType);
  if (!PINGRAM_SMS_EVENTS.has(eventType)) {
    return NextResponse.json(
      { ok: false, message: "Unsupported Pingram webhook event." },
      { status: 400 }
    );
  }

  const providerMessageId = stringField(payload.trackingId);
  if (["SMS_DELIVERED", "SMS_FAILED"].includes(eventType) && !providerMessageId) {
    return NextResponse.json(
      { ok: false, message: "Pingram delivery evidence is incomplete." },
      { status: 400 }
    );
  }

  const smsRecipientAuthority = parseRecipientAuthority(payload.userId);
  if (["SMS_UNSUBSCRIBE", "SMS_SUBSCRIBE"].includes(eventType) && !smsRecipientAuthority) {
    return NextResponse.json(
      { ok: false, message: "Pingram SMS consent authority is incomplete." },
      { status: 400 }
    );
  }
  if (
    ["SMS_UNSUBSCRIBE", "SMS_SUBSCRIBE"].includes(eventType) &&
    !smsContactDigestSecretReady(process.env.PINGRAM_CONTACT_DIGEST_SECRET)
  ) {
    return NextResponse.json(
      { ok: false, message: "Pingram SMS consent persistence is not configured." },
      { status: 503 }
    );
  }

  // Pingram documents X-Pingram-Id as tracking identity for some SMS events.
  // Include the lifecycle type so DELIVERED and FAILED cannot collapse into
  // one replay key while preserving stable retries of the same callback.
  const providerEventId = createHash("sha256")
    .update(`${callbackId}.${eventType}`, "utf8")
    .digest("hex");
  const result = await recordVerifiedProviderWebhook({
    provider: "pingram",
    providerEventId,
    providerCallbackId: callbackId,
    providerMessageId: providerMessageId || undefined,
    eventType,
    payload,
    rawBody,
    signatureVerifiedAt: new Date().toISOString(),
    smsRecipientAuthority: smsRecipientAuthority ?? undefined
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
