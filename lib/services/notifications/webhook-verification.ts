import { createHmac, createPublicKey, timingSafeEqual, verify } from "node:crypto";
import twilio from "twilio";

const PINGRAM_WEBHOOK_TOLERANCE_MS = 5 * 60 * 1000;

export function verifySendGridEventWebhook(input: {
  rawBody: string;
  timestamp: string;
  signature: string;
  publicKey: string;
}) {
  try {
    const key = createPublicKey(input.publicKey.replace(/\\n/g, "\n"));
    const signedPayload = Buffer.concat([
      Buffer.from(input.timestamp, "utf8"),
      Buffer.from(input.rawBody, "utf8")
    ]);
    return verify(
      "sha256",
      signedPayload,
      key,
      Buffer.from(input.signature, "base64")
    );
  } catch {
    return false;
  }
}

export function verifyTwilioStatusWebhook(input: {
  authToken: string;
  signature: string;
  url: string;
  parameters: Record<string, string>;
}) {
  if (!input.authToken || !input.signature || !input.url) return false;
  return twilio.validateRequest(
    input.authToken,
    input.signature,
    input.url,
    input.parameters
  );
}

export function verifyPingramWebhook(input: {
  rawBody: string;
  eventId: string;
  timestamp: string;
  signature: string;
  secret: string;
  nowMs?: number;
  toleranceMs?: number;
}) {
  if (
    !input.eventId ||
    !input.secret.startsWith("pingram_whsecret_") ||
    !/^\d{13}$/.test(input.timestamp)
  ) {
    return false;
  }

  const signatureMatch = /^v1,([a-f0-9]{64})$/i.exec(input.signature);
  if (!signatureMatch) return false;

  const timestampMs = Number(input.timestamp);
  const nowMs = input.nowMs ?? Date.now();
  const toleranceMs = input.toleranceMs ?? PINGRAM_WEBHOOK_TOLERANCE_MS;
  if (
    !Number.isSafeInteger(timestampMs) ||
    Math.abs(nowMs - timestampMs) > toleranceMs
  ) {
    return false;
  }

  const expected = createHmac("sha256", input.secret)
    .update(`${input.eventId}.${input.timestamp}.${input.rawBody}`, "utf8")
    .digest();
  const received = Buffer.from(signatureMatch[1], "hex");

  return received.length === expected.length && timingSafeEqual(received, expected);
}
