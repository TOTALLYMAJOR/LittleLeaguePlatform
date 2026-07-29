import { beforeEach, describe, expect, it, vi } from "vitest";
import twilio from "twilio";
import { POST } from "./route";
import { recordVerifiedProviderWebhook } from "@/lib/supabase/provider-webhooks";

vi.mock("@/lib/supabase/provider-webhooks", () => ({
  recordVerifiedProviderWebhook: vi.fn()
}));

const recordWebhookMock = vi.mocked(recordVerifiedProviderWebhook);

function request(input: { token?: string; params?: URLSearchParams } = {}) {
  const params = input.params ?? new URLSearchParams({
    MessageSid: "SM123",
    MessageStatus: "delivered"
  });
  const url = "https://www.leaguepilot.us/api/provider-webhooks/twilio";
  const signature = input.token
    ? twilio.getExpectedTwilioSignature(input.token, url, Object.fromEntries(params.entries()))
    : "bad-signature";

  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-twilio-signature": signature
    },
    body: params.toString()
  });
}

describe("Twilio webhook route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("rejects invalid Twilio signatures", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", "token");

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(recordWebhookMock).not.toHaveBeenCalled();
  });

  it("verifies signatures and reconciles status callbacks", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", "token");
    recordWebhookMock.mockResolvedValue({ ok: true, message: "ok" });

    const response = await POST(request({ token: "token" }));

    expect(response.status).toBe(200);
    expect(recordWebhookMock).toHaveBeenCalledWith(expect.objectContaining({
      provider: "twilio",
      providerMessageId: "SM123",
      eventType: "delivered"
    }));
  });
});
