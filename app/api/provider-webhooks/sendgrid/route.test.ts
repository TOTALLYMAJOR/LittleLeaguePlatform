import { createSign, generateKeyPairSync, type KeyObject } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { recordVerifiedProviderWebhook } from "@/lib/supabase/provider-webhooks";

vi.mock("@/lib/supabase/provider-webhooks", () => ({
  recordVerifiedProviderWebhook: vi.fn()
}));

const recordWebhookMock = vi.mocked(recordVerifiedProviderWebhook);

function signedRequest(input: {
  publicKey: string;
  privateKey: KeyObject;
  rawBody: string;
  timestamp?: string;
}) {
  const timestamp = input.timestamp ?? "1790000000";
  const signer = createSign("sha256");
  signer.update(timestamp);
  signer.update(input.rawBody);
  signer.end();
  const signature = signer.sign(input.privateKey).toString("base64");
  vi.stubEnv("SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY", input.publicKey);

  return new Request("http://localhost/api/provider-webhooks/sendgrid", {
    method: "POST",
    headers: {
      "x-twilio-email-event-webhook-timestamp": timestamp,
      "x-twilio-email-event-webhook-signature": signature
    },
    body: input.rawBody
  });
}

describe("SendGrid webhook route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("rejects unsigned webhook requests", async () => {
    vi.stubEnv("SENDGRID_EVENT_WEBHOOK_PUBLIC_KEY", "not-a-key");

    const response = await POST(new Request("http://localhost/api/provider-webhooks/sendgrid", {
      method: "POST",
      body: "[]"
    }));

    expect(response.status).toBe(401);
    expect(recordWebhookMock).not.toHaveBeenCalled();
  });

  it("verifies signatures and reconciles batched events", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    recordWebhookMock.mockResolvedValue({ ok: true, message: "ok" });
    const rawBody = JSON.stringify([{
      event: "bounce",
      sg_event_id: "event-bounce",
      sg_message_id: "sg-message-1",
      attempt_id: "attempt-1",
      notification_id: "notification-1"
    }]);

    const response = await POST(signedRequest({
      publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
      privateKey,
      rawBody
    }));

    expect(response.status).toBe(200);
    expect(recordWebhookMock).toHaveBeenCalledWith(expect.objectContaining({
      provider: "sendgrid",
      providerEventId: "event-bounce",
      providerMessageId: "sg-message-1",
      eventType: "bounce"
    }));
  });
});
