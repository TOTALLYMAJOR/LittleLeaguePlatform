import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./api/provider-webhooks/pingram/route";
import { verifyPingramWebhook } from "@/lib/services/notifications/webhook-verification";
import { recordVerifiedProviderWebhook } from "@/lib/supabase/provider-webhooks";

vi.mock("@/lib/services/notifications/webhook-verification", () => ({
  verifyPingramWebhook: vi.fn()
}));
vi.mock("@/lib/supabase/provider-webhooks", () => ({
  recordVerifiedProviderWebhook: vi.fn()
}));

const verifyMock = vi.mocked(verifyPingramWebhook);
const recordMock = vi.mocked(recordVerifiedProviderWebhook);

function request(body: string, headers: Record<string, string> = {}) {
  return new Request("https://leaguepilot.example/api/provider-webhooks/pingram", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-pingram-id": "evt_123",
      "x-pingram-signature": `v1,${"a".repeat(64)}`,
      "x-pingram-timestamp": "1785193200000",
      ...headers
    },
    body
  });
}

describe("Pingram provider webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyMock.mockReturnValue(true);
    recordMock.mockResolvedValue({
      ok: true,
      duplicate: false,
      matched: true,
      message: "recorded"
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects oversized payloads before signature verification", async () => {
    const response = await POST(request("{}", {
      "content-length": String(64 * 1024 + 1)
    }));

    expect(response.status).toBe(413);
    expect(verifyMock).not.toHaveBeenCalled();
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("verifies the exact raw body before attempting JSON parsing", async () => {
    verifyMock.mockReturnValue(false);
    const rawBody = "{not-json";
    const response = await POST(request(rawBody));

    expect(response.status).toBe(401);
    expect(verifyMock).toHaveBeenCalledWith(expect.objectContaining({ rawBody }));
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("keeps the callback event ID separate from the outbound tracking ID", async () => {
    const rawBody = JSON.stringify({
      eventType: "SMS_DELIVERED",
      trackingId: "tracking_456",
      notificationId: "leaguepilot_schedule_changed",
      channel: "SMS",
      userId: "lp:d1000000-0000-4000-8000-000000000001:11111111-1111-4111-8111-111111111111"
    });
    const response = await POST(request(rawBody));

    expect(response.status).toBe(200);
    expect(recordMock).toHaveBeenCalledWith(expect.objectContaining({
      provider: "pingram",
      providerEventId: createHash("sha256")
        .update("evt_123.SMS_DELIVERED", "utf8")
        .digest("hex"),
      providerCallbackId: "evt_123",
      providerMessageId: "tracking_456",
      eventType: "SMS_DELIVERED",
      rawBody
    }));
  });

  it("uses distinct replay keys for different lifecycle events sharing one callback ID", async () => {
    const delivered = JSON.stringify({
      eventType: "SMS_DELIVERED",
      trackingId: "evt_123",
      channel: "SMS"
    });
    const failed = JSON.stringify({
      eventType: "SMS_FAILED",
      trackingId: "evt_123",
      channel: "SMS",
      failureCode: "carrier_rejected"
    });

    expect((await POST(request(delivered))).status).toBe(200);
    expect((await POST(request(failed))).status).toBe(200);

    const first = recordMock.mock.calls[0]?.[0];
    const second = recordMock.mock.calls[1]?.[0];
    expect(first?.providerCallbackId).toBe("evt_123");
    expect(second?.providerCallbackId).toBe("evt_123");
    expect(first?.providerEventId).not.toBe(second?.providerEventId);
  });

  it("requires tenant-bound recipient authority for STOP and START events", async () => {
    const response = await POST(request(JSON.stringify({
      eventType: "SMS_UNSUBSCRIBE",
      channel: "SMS",
      userId: "untrusted-user"
    })));

    expect(response.status).toBe(400);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("fails closed when verified STOP evidence cannot be persisted locally", async () => {
    const response = await POST(request(JSON.stringify({
      eventType: "SMS_UNSUBSCRIBE",
      channel: "SMS",
      userId: "lp:d1000000-0000-4000-8000-000000000001:11111111-1111-4111-8111-111111111111"
    })));

    expect(response.status).toBe(503);
    expect(recordMock).not.toHaveBeenCalled();
  });

  it("passes verified STOP evidence with tenant authority to durable processing", async () => {
    vi.stubEnv(
      "PINGRAM_CONTACT_DIGEST_SECRET",
      "test-only-contact-digest-secret-123456"
    );
    const rawBody = JSON.stringify({
      eventType: "SMS_UNSUBSCRIBE",
      channel: "SMS",
      userId: "lp:d1000000-0000-4000-8000-000000000001:11111111-1111-4111-8111-111111111111"
    });
    const response = await POST(request(rawBody));

    expect(response.status).toBe(200);
    expect(recordMock).toHaveBeenCalledWith(expect.objectContaining({
      provider: "pingram",
      providerEventId: createHash("sha256")
        .update("evt_123.SMS_UNSUBSCRIBE", "utf8")
        .digest("hex"),
      providerCallbackId: "evt_123",
      providerMessageId: undefined,
      eventType: "SMS_UNSUBSCRIBE",
      smsRecipientAuthority: {
        organizationId: "d1000000-0000-4000-8000-000000000001",
        userId: "11111111-1111-4111-8111-111111111111"
      }
    }));
  });
});
