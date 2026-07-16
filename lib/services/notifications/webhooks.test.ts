import { generateKeyPairSync, createSign } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  computeTwilioSignature,
  dedupeProviderWebhookEvents,
  normalizeSendGridEvent,
  normalizeTwilioStatusCallback,
  verifySendGridWebhookSignature,
  verifyTwilioWebhookSignature
} from "./webhooks";

describe("provider webhook verification and normalization", () => {
  it("verifies SendGrid ECDSA signatures over timestamp plus raw body", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    const rawBody = JSON.stringify([{ event: "delivered", sg_event_id: "event-1" }]);
    const timestamp = "1790000000";
    const signer = createSign("sha256");
    signer.update(timestamp);
    signer.update(rawBody);
    signer.end();
    const signature = signer.sign(privateKey).toString("base64");

    expect(verifySendGridWebhookSignature({
      publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
      timestamp,
      signature,
      rawBody
    })).toBe(true);
    expect(verifySendGridWebhookSignature({
      publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
      timestamp,
      signature,
      rawBody: "[]"
    })).toBe(false);
  });

  it("verifies Twilio status callback signatures", () => {
    const params = new URLSearchParams({
      MessageSid: "SM123",
      MessageStatus: "delivered"
    });
    const signature = computeTwilioSignature({
      authToken: "token",
      url: "https://www.leaguepilot.us/api/provider-webhooks/twilio",
      params
    });

    expect(verifyTwilioWebhookSignature({
      authToken: "token",
      url: "https://www.leaguepilot.us/api/provider-webhooks/twilio",
      params,
      signature
    })).toBe(true);
    expect(verifyTwilioWebhookSignature({
      authToken: "wrong",
      url: "https://www.leaguepilot.us/api/provider-webhooks/twilio",
      params,
      signature
    })).toBe(false);
  });

  it("maps SendGrid delivery, open, and bounce states without treating accepted as delivery", () => {
    expect(normalizeSendGridEvent({
      event: "processed",
      sg_event_id: "event-processed",
      sg_message_id: "sg-message-1"
    })).toMatchObject({
      notificationStatus: "pending",
      attemptStatus: "sent",
      providerStatus: "processed"
    });
    expect(normalizeSendGridEvent({
      event: "delivered",
      sg_event_id: "event-delivered",
      sg_message_id: "sg-message-1"
    })).toMatchObject({
      notificationStatus: "sent",
      attemptStatus: "sent"
    });
    expect(normalizeSendGridEvent({
      event: "open",
      sg_event_id: "event-open",
      sg_message_id: "sg-message-1"
    })).toMatchObject({
      notificationStatus: "read",
      attemptStatus: "sent"
    });
    expect(normalizeSendGridEvent({
      event: "bounce",
      sg_event_id: "event-bounce",
      sg_message_id: "sg-message-1"
    })).toMatchObject({
      notificationStatus: "failed",
      attemptStatus: "failed"
    });
  });

  it("maps Twilio delivered and failed callbacks", () => {
    expect(normalizeTwilioStatusCallback(new URLSearchParams({
      MessageSid: "SM123",
      MessageStatus: "delivered"
    }))).toMatchObject({
      eventId: expect.stringContaining("SM123:delivered"),
      providerMessageId: "SM123",
      notificationStatus: "sent",
      attemptStatus: "sent"
    });
    expect(normalizeTwilioStatusCallback(new URLSearchParams({
      MessageSid: "SM123",
      MessageStatus: "undelivered"
    }))).toMatchObject({
      notificationStatus: "failed",
      attemptStatus: "failed"
    });
    expect(normalizeTwilioStatusCallback(new URLSearchParams({
      MessageSid: "SM123",
      MessageStatus: "sent"
    }))).toMatchObject({
      notificationStatus: "pending",
      attemptStatus: "sent"
    });
  });

  it("dedupes repeated provider events in the same batch", () => {
    const event = normalizeSendGridEvent({
      event: "bounce",
      sg_event_id: "event-bounce",
      sg_message_id: "sg-message-1"
    });
    const { deduped, duplicateEventIds } = dedupeProviderWebhookEvents([event, event]);

    expect(deduped).toHaveLength(1);
    expect(duplicateEventIds).toEqual(["event-bounce"]);
  });
});
