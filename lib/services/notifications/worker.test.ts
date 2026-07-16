import { describe, expect, it } from "vitest";
import {
  buildNotificationIdempotencyKey,
  deliveryOutcomeFromSendResult,
  runNotificationSendWorker,
  sendNotificationDeliveryAttempt
} from "./worker";
import type { NotificationDeliveryPayload } from "./types";

const payload: NotificationDeliveryPayload = {
  attemptId: "attempt-1",
  notificationId: "notification-1",
  provider: "email",
  channel: "email",
  organizationId: "org-1",
  teamId: "team-1",
  title: "Schedule changed",
  body: "Practice is now at Field 2.",
  notificationType: "schedule_changed",
  recipient: {
    userId: "user-parent",
    email: "parent@example.com"
  },
  idempotencyKey: "notification-1:email",
  retryCount: 0,
  maxRetries: 2
};

describe("notification send worker", () => {
  it("builds stable provider idempotency keys", () => {
    expect(buildNotificationIdempotencyKey({ notificationId: "n-1", provider: "sms" })).toBe("n-1:sms");
  });

  it("marks successful sends as sent without retry", () => {
    const outcome = deliveryOutcomeFromSendResult({
      payload,
      now: new Date("2026-07-16T12:00:00.000Z"),
      result: {
        ok: true,
        providerMessageId: "sendgrid-1",
        providerStatus: "accepted"
      }
    });

    expect(outcome).toMatchObject({
      attemptId: "attempt-1",
      status: "sent",
      providerMessageId: "sendgrid-1",
      nextAttemptAt: null
    });
  });

  it("schedules retryable failures before dead-lettering", () => {
    const outcome = deliveryOutcomeFromSendResult({
      payload,
      now: new Date("2026-07-16T12:00:00.000Z"),
      retryDelaysMs: [60_000],
      result: {
        ok: false,
        retryable: true,
        errorCode: "temporary_failure"
      }
    });

    expect(outcome.status).toBe("failed");
    expect(outcome.retryCount).toBe(1);
    expect(outcome.nextAttemptAt).toBe("2026-07-16T12:01:00.000Z");
    expect(outcome.deadLetteredAt).toBeNull();
  });

  it("dead-letters exhausted failures without adding a new status", () => {
    const outcome = deliveryOutcomeFromSendResult({
      payload: { ...payload, retryCount: 2, maxRetries: 2 },
      now: new Date("2026-07-16T12:00:00.000Z"),
      result: {
        ok: false,
        retryable: true,
        errorCode: "temporary_failure"
      }
    });

    expect(outcome.status).toBe("failed");
    expect(outcome.retryCount).toBe(3);
    expect(outcome.nextAttemptAt).toBeNull();
    expect(outcome.deadLetteredAt).toBe("2026-07-16T12:00:00.000Z");
  });

  it("fails permanently when an adapter is missing", async () => {
    const outcome = await sendNotificationDeliveryAttempt({
      payload,
      adapters: [],
      now: new Date("2026-07-16T12:00:00.000Z")
    });

    expect(outcome).toMatchObject({
      status: "failed",
      errorCode: "provider_adapter_missing",
      deadLetteredAt: "2026-07-16T12:00:00.000Z"
    });
  });

  it("loads attempts and records each worker outcome", async () => {
    const recorded: string[] = [];
    const summary = await runNotificationSendWorker({
      loadAttempts: async () => [payload],
      adapters: [{
        provider: "email",
        send: async () => ({ ok: true, providerMessageId: "message-1" })
      }],
      recordOutcome: async (outcome) => {
        recorded.push(outcome.status);
      }
    });

    expect(summary.attempted).toBe(1);
    expect(summary.sent).toBe(1);
    expect(recorded).toEqual(["sent"]);
  });
});
