import { describe, expect, it, vi } from "vitest";
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

const allowCurrentAttempt = async (currentPayload: NotificationDeliveryPayload) => ({
  allowed: true as const,
  payload: currentPayload
});

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
      authorizeAttempt: allowCurrentAttempt,
      now: new Date("2026-07-16T12:00:00.000Z")
    });

    expect(outcome).toMatchObject({
      status: "failed",
      errorCode: "provider_adapter_missing",
      deadLetteredAt: "2026-07-16T12:00:00.000Z"
    });
  });

  it("never automatically retries an indeterminate provider outcome", () => {
    const outcome = deliveryOutcomeFromSendResult({
      payload,
      now: new Date("2026-07-16T12:00:00.000Z"),
      result: {
        ok: false,
        requestOutcome: "indeterminate",
        retryable: true,
        errorCode: "provider_outcome_indeterminate"
      }
    });

    expect(outcome).toMatchObject({
      status: "failed",
      requestOutcome: "indeterminate",
      nextAttemptAt: null,
      deadLetteredAt: null
    });
  });

  it("matches a durable SMS transport only to its exact adapter", async () => {
    const calls: string[] = [];
    const smsPayload: NotificationDeliveryPayload = {
      ...payload,
      provider: "sms",
      channel: "sms",
      transportProvider: "pingram",
      recipient: {
        userId: "user-parent",
        phone: "+13125551234"
      }
    };
    const outcome = await sendNotificationDeliveryAttempt({
      payload: smsPayload,
      adapters: [
        {
          provider: "sms",
          transportProvider: "twilio",
          send: async () => {
            calls.push("twilio");
            return { ok: true };
          }
        },
        {
          provider: "sms",
          transportProvider: "pingram",
          send: async () => {
            calls.push("pingram");
            return { ok: true, providerMessageId: "track-1" };
          }
        }
      ],
      authorizeAttempt: allowCurrentAttempt
    });

    expect(calls).toEqual(["pingram"]);
    expect(outcome).toMatchObject({
      status: "sent",
      transportProvider: "pingram",
      providerMessageId: "track-1"
    });
  });

  it("fails closed when the durable SMS transport adapter is unavailable", async () => {
    const send = vi.fn();
    const outcome = await sendNotificationDeliveryAttempt({
      payload: {
        ...payload,
        provider: "sms",
        channel: "sms",
        transportProvider: "twilio",
        recipient: {
          userId: "user-parent",
          phone: "+13125551234"
        }
      },
      adapters: [{
        provider: "sms",
        transportProvider: "pingram",
        send
      }],
      authorizeAttempt: allowCurrentAttempt,
      now: new Date("2026-07-16T12:00:00.000Z")
    });

    expect(send).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({
      status: "failed",
      transportProvider: "twilio",
      errorCode: "provider_adapter_missing"
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
      },
      authorizeAttempt: allowCurrentAttempt
    });

    expect(summary.attempted).toBe(1);
    expect(summary.sent).toBe(1);
    expect(recorded).toEqual(["sent"]);
  });

  it("suppresses a claimed attempt when last-moment durable authority is denied", async () => {
    const send = vi.fn(async () => ({ ok: true }));
    const recorded: string[] = [];
    let claimed = false;

    const summary = await runNotificationSendWorker({
      loadAttempts: async () => {
        claimed = true;
        return [payload];
      },
      adapters: [{
        provider: "email",
        transportProvider: "sendgrid",
        send
      }],
      authorizeAttempt: async () => {
        expect(claimed).toBe(true);
        return {
          allowed: false,
          errorCode: "recipient_preference_disabled",
          errorMessage: "Recipient preference changed after claim."
        };
      },
      recordOutcome: async (outcome) => {
        recorded.push(`${outcome.status}:${outcome.requestOutcome}:${outcome.errorCode}`);
      }
    });

    expect(send).not.toHaveBeenCalled();
    expect(summary).toMatchObject({
      attempted: 1,
      sent: 0,
      failed: 0
    });
    expect(recorded).toEqual([
      "suppressed:suppressed:recipient_preference_disabled"
    ]);
  });

  it("fails closed without a provider call when the authority recheck errors", async () => {
    const send = vi.fn(async () => ({ ok: true }));
    const outcome = await sendNotificationDeliveryAttempt({
      payload,
      adapters: [{
        provider: "email",
        transportProvider: "sendgrid",
        send
      }],
      authorizeAttempt: async () => {
        throw new Error("database timeout");
      }
    });

    expect(send).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({
      status: "suppressed",
      requestOutcome: "suppressed",
      errorCode: "delivery_authority_unavailable",
      nextAttemptAt: null
    });
  });
});
