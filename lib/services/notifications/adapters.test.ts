import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWebPushAdapter } from "./adapters";
import type { NotificationDeliveryPayload } from "./types";

const webPushMocks = vi.hoisted(() => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn()
}));
const pushEndpoint = "https://push.example/subscription-1";

vi.mock("web-push", () => webPushMocks);

const payload: NotificationDeliveryPayload = {
  attemptId: "attempt-push-1",
  notificationId: "notification-push-1",
  provider: "web_push",
  transportProvider: "web_push",
  channel: "push",
  organizationId: "org-1",
  organizationProviderSendsEnabled: true,
  teamId: "team-1",
  title: "Schedule changed",
  body: "Practice is now at Field 2.",
  notificationType: "schedule_changed",
  recipient: {
    userId: "parent-1",
    pushEndpoint,
    pushP256dh: "p256dh",
    pushAuth: "auth"
  },
  idempotencyKey: "notification-push-1:web_push",
  retryCount: 0,
  maxRetries: 2
};

function pushEnv(publicKeys: Partial<NodeJS.ProcessEnv>) {
  return {
    PROVIDER_SENDS_ENABLED: "true",
    PROVIDER_DELIVERY_MODE: "qa",
    PROVIDER_QA_RECIPIENT_ALLOWLIST: pushEndpoint,
    VAPID_PRIVATE_KEY: "private-key",
    VAPID_SUBJECT: "mailto:ops@example.com",
    ...publicKeys
  };
}

describe("Web Push adapter VAPID configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    webPushMocks.sendNotification.mockResolvedValue({ statusCode: 201 });
  });

  it("uses the canonical server-side VAPID public key", async () => {
    const result = await createWebPushAdapter(pushEnv({
      VAPID_PUBLIC_KEY: "server-public-key",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "browser-public-key"
    })).send(payload);

    expect(result.ok).toBe(true);
    expect(webPushMocks.setVapidDetails).toHaveBeenCalledWith(
      "mailto:ops@example.com",
      "server-public-key",
      "private-key"
    );
  });

  it("retains NEXT_PUBLIC VAPID key compatibility for browser subscriptions", async () => {
    const result = await createWebPushAdapter(pushEnv({
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "browser-public-key"
    })).send(payload);

    expect(result.ok).toBe(true);
    expect(webPushMocks.setVapidDetails).toHaveBeenCalledWith(
      "mailto:ops@example.com",
      "browser-public-key",
      "private-key"
    );
  });
});
