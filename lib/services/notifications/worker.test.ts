import { describe, expect, it, vi } from "vitest";
import type { NotificationDeliveryPayload } from "./types";
import {
  buildNotificationIdempotencyKey,
  deliveryOutcomeFromSendResult,
  runNotificationSendWorker,
  sendNotificationDeliveryAttempt
} from "./worker";

const now = new Date("2026-07-16T12:00:00.000Z");

function payload(overrides: Partial<NotificationDeliveryPayload> = {}): NotificationDeliveryPayload {
  return {
    attemptId: "attempt-1",
    notificationId: "notification-1",
    organizationId: "org-1",
    teamId: "team-1",
    eventId: null,
    provider: "email",
    channel: "email",
    notificationType: "schedule_changed",
    title: "Practice moved",
    body: "Practice moved to Field 2.",
    recipient: {
      userId: "user-parent",
      email: "parent@example.com",
      phone: "+15555550100",
      pushSubscriptions: []
    },
    idempotencyKey: "notification-1:email",
    retryCount: 0,
    maxRetries: 3,
    createdAt: "2026-07-16T11:59:00.000Z",
    ...overrides
  };
}

describe("notification send worker foundation", () => {
  it("builds stable provider idempotency keys", () => {
    expect(buildNotificationIdempotencyKey({ notificationId: "notification-1", provider: "email" })).toBe("notification-1:email");
  });

  it("records provider accepted sends without assuming webhook delivery", () => {
    const outcome = deliveryOutcomeFromSendResult({
      payload: payload(),
      result: {
        ok: true,
        providerMessageId: "provider-message-1",
        providerStatus: "accepted",
        providerResponse: { status: 202 }
      },
      now
    });

    expect(outcome).toMatchObject({
      status: "sent",
      providerMessageId: "provider-message-1",
      providerStatus: "accepted",
      retryCount: 0,
      nextAttemptAt: null,
      deadLetteredAt: null
    });
  });

  it("keeps retryable failures as failed outcomes with next-attempt metadata", () => {
    const outcome = deliveryOutcomeFromSendResult({
      payload: payload({ retryCount: 0, maxRetries: 2 }),
      result: {
        ok: false,
        errorCode: "provider_503",
        errorMessage: "Provider unavailable.",
        retryable: true
      },
      now,
      retryDelaysMs: [1000]
    });

    expect(outcome.status).toBe("failed");
    expect(outcome.retryCount).toBe(1);
    expect(outcome.nextAttemptAt).toBe("2026-07-16T12:00:01.000Z");
    expect(outcome.deadLetteredAt).toBeNull();
  });

  it("dead-letters exhausted attempts without adding a new status", () => {
    const outcome = deliveryOutcomeFromSendResult({
      payload: payload({ retryCount: 2, maxRetries: 2 }),
      result: {
        ok: false,
        errorCode: "provider_503",
        retryable: true
      },
      now
    });

    expect(outcome.status).toBe("failed");
    expect(outcome.retryCount).toBe(3);
    expect(outcome.nextAttemptAt).toBeNull();
    expect(outcome.deadLetteredAt).toBe("2026-07-16T12:00:00.000Z");
  });

  it("fails permanently when no provider adapter is registered", async () => {
    const outcome = await sendNotificationDeliveryAttempt({
      payload: payload({ provider: "sms", channel: "sms", idempotencyKey: "notification-1:sms" }),
      adapters: [],
      now
    });

    expect(outcome).toMatchObject({
      status: "failed",
      errorCode: "provider_adapter_missing",
      retryCount: 1,
      nextAttemptAt: null,
      deadLetteredAt: "2026-07-16T12:00:00.000Z"
    });
  });

  it("loads, sends, and records claimed attempts in order", async () => {
    const recordOutcome = vi.fn();
    const adapter = {
      provider: "email" as const,
      send: vi.fn().mockResolvedValue({
        ok: true,
        providerMessageId: "provider-message-1",
        providerStatus: "accepted"
      })
    };

    const result = await runNotificationSendWorker({
      loadAttempts: async () => [payload()],
      recordOutcome,
      adapters: [adapter],
      now
    });

    expect(adapter.send).toHaveBeenCalledTimes(1);
    expect(recordOutcome).toHaveBeenCalledWith(expect.objectContaining({
      attemptId: "attempt-1",
      status: "sent"
    }));
    expect(result).toMatchObject({
      claimed: 1,
      sent: 1,
      failed: 0,
      retrying: 0,
      deadLettered: 0
    });
  });
});
