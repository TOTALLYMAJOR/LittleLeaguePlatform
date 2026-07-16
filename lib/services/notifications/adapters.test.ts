import { describe, expect, it, vi } from "vitest";
import type { NotificationDeliveryPayload } from "./types";
import {
  createSendGridEmailAdapter,
  createTwilioSmsAdapter,
  createWebPushAdapter
} from "./adapters";

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
      pushSubscriptions: [{
        endpoint: "https://push.example/subscription",
        p256dh: "p256dh-key",
        authSecret: "auth-secret"
      }]
    },
    idempotencyKey: "notification-1:email",
    retryCount: 0,
    maxRetries: 3,
    createdAt: "2026-07-16T11:59:00.000Z",
    deliveryPolicy: {
      preferencesAllowed: true,
      timezone: "UTC",
      urgent: false
    },
    ...overrides
  };
}

describe("notification provider adapters", () => {
  it("suppresses SendGrid email when credentials are missing", async () => {
    const fetchMock = vi.fn();
    const adapter = createSendGridEmailAdapter({ env: {}, fetch: fetchMock });

    const result = await adapter.send(payload(), { now });

    expect(result).toMatchObject({
      ok: false,
      suppressed: true,
      errorCode: "sendgrid_not_configured"
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends email through SendGrid with provider idempotency context", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", {
      status: 202,
      headers: { "x-message-id": "sendgrid-message-1" }
    }));
    const adapter = createSendGridEmailAdapter({
      env: {
        SENDGRID_API_KEY: "sendgrid-key",
        SENDGRID_FROM_EMAIL: "league@example.com"
      },
      fetch: fetchMock
    });

    const result = await adapter.send(payload(), { now });

    expect(result).toMatchObject({
      ok: true,
      providerMessageId: "sendgrid-message-1",
      providerStatus: "accepted"
    });
    expect(fetchMock).toHaveBeenCalledWith("https://api.sendgrid.com/v3/mail/send", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        authorization: "Bearer sendgrid-key",
        "x-leaguepilot-idempotency-key": "notification-1:email"
      })
    }));
  });

  it("marks retryable SendGrid failures without suppressing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ errors: [{ message: "down" }] }), {
      status: 503
    }));
    const adapter = createSendGridEmailAdapter({
      env: {
        SENDGRID_API_KEY: "sendgrid-key",
        SENDGRID_FROM_EMAIL: "league@example.com"
      },
      fetch: fetchMock
    });

    const result = await adapter.send(payload(), { now });

    expect(result).toMatchObject({
      ok: false,
      errorCode: "sendgrid_http_error",
      retryable: true
    });
    expect(result.suppressed).toBeUndefined();
  });

  it("suppresses disabled preferences and quiet-hour email before provider calls", async () => {
    const fetchMock = vi.fn();
    const adapter = createSendGridEmailAdapter({
      env: {
        SENDGRID_API_KEY: "sendgrid-key",
        SENDGRID_FROM_EMAIL: "league@example.com"
      },
      fetch: fetchMock
    });

    const disabled = await adapter.send(payload({
      deliveryPolicy: { preferencesAllowed: false }
    }), { now });
    const quietHours = await adapter.send(payload({
      deliveryPolicy: {
        preferencesAllowed: true,
        quietHoursStart: "00:00",
        quietHoursEnd: "23:59",
        timezone: "UTC",
        urgent: false
      }
    }), { now });

    expect(disabled.errorCode).toBe("recipient_preference_disabled");
    expect(quietHours.errorCode).toBe("quiet_hours_active");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps SMS urgent-only even when Twilio is configured", async () => {
    const fetchMock = vi.fn();
    const adapter = createTwilioSmsAdapter({
      env: {
        TWILIO_ACCOUNT_SID: "AC123",
        TWILIO_AUTH_TOKEN: "token",
        TWILIO_MESSAGING_SERVICE_SID: "MG123"
      },
      fetch: fetchMock
    });

    const result = await adapter.send(payload({
      provider: "sms",
      channel: "sms",
      idempotencyKey: "notification-1:sms",
      deliveryPolicy: {
        preferencesAllowed: true,
        urgent: false
      }
    }), { now });

    expect(result).toMatchObject({
      ok: false,
      suppressed: true,
      errorCode: "sms_not_urgent"
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends urgent SMS through Twilio Messaging Service", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      sid: "SM123",
      status: "queued"
    }), { status: 201 }));
    const adapter = createTwilioSmsAdapter({
      env: {
        TWILIO_ACCOUNT_SID: "AC123",
        TWILIO_AUTH_TOKEN: "token",
        TWILIO_MESSAGING_SERVICE_SID: "MG123"
      },
      fetch: fetchMock
    });

    const result = await adapter.send(payload({
      provider: "sms",
      channel: "sms",
      notificationType: "event_cancelled",
      idempotencyKey: "notification-1:sms",
      deliveryPolicy: {
        preferencesAllowed: true,
        urgent: true,
        quietHoursStart: "00:00",
        quietHoursEnd: "23:59",
        timezone: "UTC"
      }
    }), { now });

    expect(result).toMatchObject({
      ok: true,
      providerMessageId: "SM123",
      providerStatus: "queued"
    });
    expect(fetchMock).toHaveBeenCalledWith("https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        authorization: expect.stringMatching(/^Basic /),
        "x-leaguepilot-idempotency-key": "notification-1:sms"
      })
    }));
  });

  it("suppresses Web Push until VAPID is configured", async () => {
    const webPushClient = {
      setVapidDetails: vi.fn(),
      sendNotification: vi.fn()
    };
    const adapter = createWebPushAdapter({ env: {}, webPushClient });

    const result = await adapter.send(payload({
      provider: "web_push",
      channel: "push",
      idempotencyKey: "notification-1:web_push"
    }), { now });

    expect(result).toMatchObject({
      ok: false,
      suppressed: true,
      errorCode: "web_push_not_configured"
    });
    expect(webPushClient.sendNotification).not.toHaveBeenCalled();
  });

  it("sends Web Push to active subscriptions when VAPID is configured", async () => {
    const webPushClient = {
      setVapidDetails: vi.fn(),
      sendNotification: vi.fn().mockResolvedValue({
        statusCode: 201,
        headers: {},
        body: ""
      })
    };
    const adapter = createWebPushAdapter({
      env: {
        WEB_PUSH_VAPID_PUBLIC_KEY: "public",
        WEB_PUSH_VAPID_PRIVATE_KEY: "private",
        WEB_PUSH_VAPID_SUBJECT: "mailto:ops@example.com"
      },
      webPushClient
    });

    const result = await adapter.send(payload({
      provider: "web_push",
      channel: "push",
      idempotencyKey: "notification-1:web_push"
    }), { now });

    expect(result).toMatchObject({
      ok: true,
      providerMessageId: "notification-1:web_push",
      providerStatus: "201"
    });
    expect(webPushClient.setVapidDetails).toHaveBeenCalledWith("mailto:ops@example.com", "public", "private");
    expect(webPushClient.sendNotification).toHaveBeenCalledTimes(1);
  });
});
