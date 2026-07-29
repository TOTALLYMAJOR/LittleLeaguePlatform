import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyPingramWebhook } from "./webhook-verification";

const secret = "pingram_whsecret_test-only";
const eventId = "evt_123";
const timestamp = "1785193200000";
const rawBody = JSON.stringify({
  eventType: "SMS_DELIVERED",
  trackingId: "track_123",
  channel: "SMS"
});

function signature(body = rawBody, observedAt = timestamp) {
  const digest = createHmac("sha256", secret)
    .update(`${eventId}.${observedAt}.${body}`, "utf8")
    .digest("hex");
  return `v1,${digest}`;
}

describe("Pingram webhook verification", () => {
  it("accepts an authentic raw body within the documented timestamp window", () => {
    expect(verifyPingramWebhook({
      rawBody,
      eventId,
      timestamp,
      signature: signature(),
      secret,
      nowMs: Number(timestamp)
    })).toBe(true);
  });

  it("rejects altered bodies, stale or future timestamps, and malformed signatures", () => {
    const common = {
      rawBody,
      eventId,
      timestamp,
      signature: signature(),
      secret
    };

    expect(verifyPingramWebhook({
      ...common,
      rawBody: `${rawBody} `,
      nowMs: Number(timestamp)
    })).toBe(false);
    expect(verifyPingramWebhook({
      ...common,
      nowMs: Number(timestamp) + 300_001
    })).toBe(false);
    expect(verifyPingramWebhook({
      ...common,
      nowMs: Number(timestamp) - 300_001
    })).toBe(false);
    expect(verifyPingramWebhook({
      ...common,
      signature: signature().slice(3),
      nowMs: Number(timestamp)
    })).toBe(false);
    expect(verifyPingramWebhook({
      ...common,
      timestamp: "not-milliseconds",
      nowMs: Number(timestamp)
    })).toBe(false);
  });

  it("requires the Pingram webhook-secret shape and complete event identity", () => {
    expect(verifyPingramWebhook({
      rawBody,
      eventId: "",
      timestamp,
      signature: signature(),
      secret,
      nowMs: Number(timestamp)
    })).toBe(false);
    expect(verifyPingramWebhook({
      rawBody,
      eventId,
      timestamp,
      signature: signature(),
      secret: "wrong-secret-shape",
      nowMs: Number(timestamp)
    })).toBe(false);
  });
});
