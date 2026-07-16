import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { computeTwilioSignature } from "@/lib/services/notifications/webhooks";
import { reconcileProviderWebhookEvents } from "@/lib/supabase/provider-webhooks";

vi.mock("@/lib/supabase/provider-webhooks", () => ({
  reconcileProviderWebhookEvents: vi.fn()
}));

const reconcileMock = vi.mocked(reconcileProviderWebhookEvents);

function request(input: { token?: string; params?: URLSearchParams } = {}) {
  const params = input.params ?? new URLSearchParams({
    MessageSid: "SM123",
    MessageStatus: "delivered"
  });
  const url = "https://www.leaguepilot.us/api/provider-webhooks/twilio";
  const signature = input.token
    ? computeTwilioSignature({ authToken: input.token, url, params })
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
    expect(reconcileMock).not.toHaveBeenCalled();
  });

  it("verifies signatures and reconciles status callbacks", async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", "token");
    reconcileMock.mockResolvedValue({ ok: true, message: "ok", processed: 1, duplicates: 0, failed: 0 });

    const response = await POST(request({ token: "token" }));

    expect(response.status).toBe(200);
    expect(reconcileMock).toHaveBeenCalledWith([expect.objectContaining({
      provider: "twilio",
      providerMessageId: "SM123",
      providerStatus: "delivered",
      notificationStatus: "sent"
    })]);
  });
});
