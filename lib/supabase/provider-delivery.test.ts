import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn()
}));

vi.mock("./admin", () => ({
  createSupabaseAdminClient: mocks.createSupabaseAdminClient
}));

import {
  claimQueuedNotificationDeliveries,
  getProviderDeliveryReadiness,
  providerChannel,
  recheckNotificationDeliveryAuthority
} from "./provider-delivery";
import { sendNotificationDeliveryAttempt } from "@/lib/services/notifications/worker";
import type { NotificationDeliveryPayload } from "@/lib/services/notifications/types";

const approvedAt = "2026-07-27T22:30:00.000Z";
const claimedSmsPayload: NotificationDeliveryPayload = {
  attemptId: "attempt-1",
  notificationId: "notification-1",
  provider: "sms",
  transportProvider: "pingram",
  channel: "sms",
  organizationId: "org-1",
  organizationProviderSendsEnabled: true,
  teamId: "team-1",
  title: "Schedule changed",
  body: "Practice is now at Field 2.",
  notificationType: "schedule_changed",
  recipient: {
    userId: "parent-1",
    phone: "+13125550000"
  },
  idempotencyKey: "notification-1:sms",
  retryCount: 0,
  maxRetries: 3
};

const claimedAttempt = {
  id: "attempt-1",
  notification_id: "notification-1",
  provider: "sms",
  transport_provider: "pingram",
  channel: "sms",
  status: "queued",
  request_outcome: "not_attempted",
  approved_at: approvedAt,
  idempotency_key: "notification-1:sms",
  retry_count: 0,
  max_retries: 3,
  next_attempt_at: approvedAt,
  reconciliation_required_at: null,
  dead_lettered_at: null,
  locked_at: "2026-07-27T22:31:00.000Z",
  locked_by: "worker-1",
  notifications: {
    id: "notification-1",
    organization_id: "org-1",
    recipient_user_id: "parent-1",
    team_id: "team-1",
    notification_type: "schedule_changed",
    channel: "sms",
    status: "pending",
    provider_approval_status: "approved",
    approved_at: approvedAt,
    title: "Schedule changed",
    body: "Practice is now at Field 2."
  }
};

type AuthorityDatabaseState = {
  attempt?: typeof claimedAttempt | null;
  attemptError?: { message: string } | null;
  organizationEnabled?: boolean;
  preferenceEnabled?: boolean;
  suppressionState?: "suppressed" | "subscribed" | null;
  phone?: string | null;
};

function queryBuilder(result: unknown) {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: (
      resolve: (value: unknown) => unknown,
      reject?: (reason: unknown) => unknown
    ) => Promise.resolve(result).then(resolve, reject)
  };
  return builder;
}

function useAuthorityDatabase(state: AuthorityDatabaseState = {}) {
  const from = vi.fn((table: string) => {
    if (table === "notification_delivery_attempts") {
      return queryBuilder({
        data: state.attempt === undefined ? claimedAttempt : state.attempt,
        error: state.attemptError ?? null
      });
    }
    if (table === "organizations") {
      return queryBuilder({
        data: {
          provider_sends_enabled: state.organizationEnabled ?? true
        },
        error: null
      });
    }
    if (table === "notification_preferences") {
      return queryBuilder({
        data: [{
          id: "preference-1",
          organization_id: "org-1",
          team_id: "team-1",
          enabled: state.preferenceEnabled ?? true
        }],
        error: null
      });
    }
    if (table === "profiles") {
      return queryBuilder({
        data: {
          id: "parent-1",
          email: "parent@example.com",
          phone: state.phone === undefined ? "+13125559999" : state.phone
        },
        error: null
      });
    }
    if (table === "sms_contact_suppressions") {
      return queryBuilder({
        data: state.suppressionState
          ? { state: state.suppressionState }
          : null,
        error: null
      });
    }
    throw new Error(`Unexpected authority table: ${table}`);
  });
  mocks.createSupabaseAdminClient.mockReturnValue({ from });
}

const pingramEnv = {
  SMS_PROVIDER: "pingram"
};

describe("provider delivery hardening", () => {
  beforeEach(() => {
    mocks.createSupabaseAdminClient.mockReset();
  });

  it("maps provider adapters to notification channels", () => {
    expect(providerChannel("email")).toBe("email");
    expect(providerChannel("sms")).toBe("sms");
    expect(providerChannel("web_push")).toBe("push");
  });

  it("keeps Web Push suppressed until VAPID keys are complete", () => {
    expect(getProviderDeliveryReadiness("web_push", {}).configured).toBe(false);
    expect(getProviderDeliveryReadiness("web_push", {
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "public",
      VAPID_PRIVATE_KEY: "private",
      VAPID_SUBJECT: "mailto:ops@example.com"
    }).configured).toBe(true);
  });

  it("keeps email suppressed until the configured SendGrid sender is complete", () => {
    expect(getProviderDeliveryReadiness("email", {}).configured).toBe(false);
    expect(getProviderDeliveryReadiness("email", {
      SENDGRID_API_KEY: "sendgrid-key"
    }).configured).toBe(false);
    expect(getProviderDeliveryReadiness("email", {
      SENDGRID_API_KEY: "sendgrid-key",
      SENDGRID_FROM_EMAIL: "league@example.com"
    })).toMatchObject({
      configured: true,
      transportProvider: "sendgrid"
    });
  });

  it("requires an explicit, complete SMS transport selection", () => {
    expect(getProviderDeliveryReadiness("sms", { TWILIO_ACCOUNT_SID: "sid", TWILIO_AUTH_TOKEN: "token" }).configured).toBe(false);
    expect(getProviderDeliveryReadiness("sms", {
      SMS_PROVIDER: "twilio",
      TWILIO_ACCOUNT_SID: "sid",
      TWILIO_AUTH_TOKEN: "token",
      TWILIO_MESSAGING_SERVICE_SID: "messaging-service"
    })).toMatchObject({
      configured: true,
      transportProvider: "twilio"
    });

    expect(getProviderDeliveryReadiness("sms", {
      SMS_PROVIDER: "pingram",
      PINGRAM_API_KEY: "pingram_sk_test",
      PINGRAM_API_BASE_URL: "https://api.pingram.io",
      PINGRAM_WEBHOOK_SECRET: "pingram_whsecret_test",
      PINGRAM_CONTACT_DIGEST_SECRET: "x".repeat(32),
      PINGRAM_SMS_SENDER_READY: "true"
    })).toMatchObject({
      configured: true,
      transportProvider: "pingram"
    });

    expect(getProviderDeliveryReadiness("sms", {
      SMS_PROVIDER: "pingram",
      PINGRAM_API_KEY: "pingram_sk_test",
      PINGRAM_API_BASE_URL: "https://attacker.example",
      PINGRAM_WEBHOOK_SECRET: "pingram_whsecret_test",
      PINGRAM_CONTACT_DIGEST_SECRET: "x".repeat(32),
      PINGRAM_SMS_SENDER_READY: "true"
    }).configured).toBe(false);
  });

  it.each([
    {
      name: "organization disable",
      state: { organizationEnabled: false },
      errorCode: "organization_provider_sends_disabled"
    },
    {
      name: "recipient preference opt-out",
      state: { preferenceEnabled: false },
      errorCode: "recipient_preference_disabled"
    },
    {
      name: "verified SMS STOP",
      state: { suppressionState: "suppressed" as const },
      errorCode: "sms_contact_suppressed"
    }
  ])("blocks a provider call when $name occurs after the bulk claim", async ({
    state,
    errorCode
  }) => {
    useAuthorityDatabase(state);
    const send = vi.fn(async () => ({ ok: true }));

    const outcome = await sendNotificationDeliveryAttempt({
      payload: claimedSmsPayload,
      adapters: [{
        provider: "sms",
        transportProvider: "pingram",
        send
      }],
      authorizeAttempt: (payload) => recheckNotificationDeliveryAuthority({
        payload,
        workerId: "worker-1",
        env: pingramEnv
      })
    });

    expect(send).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({
      status: "suppressed",
      requestOutcome: "suppressed",
      errorCode,
      retryCount: 0,
      nextAttemptAt: null
    });
  });

  it("refreshes the current recipient contact in the last-moment authority check", async () => {
    useAuthorityDatabase({
      phone: "+13125559999"
    });
    const send = vi.fn(async () => ({
      ok: true,
      requestOutcome: "provider_accepted" as const,
      providerMessageId: "pingram-tracking-1"
    }));

    const outcome = await sendNotificationDeliveryAttempt({
      payload: claimedSmsPayload,
      adapters: [{
        provider: "sms",
        transportProvider: "pingram",
        send
      }],
      authorizeAttempt: (payload) => recheckNotificationDeliveryAuthority({
        payload,
        workerId: "worker-1",
        env: pingramEnv
      })
    });

    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      recipient: expect.objectContaining({
        userId: "parent-1",
        phone: "+13125559999"
      })
    }));
    expect(outcome).toMatchObject({
      status: "sent",
      requestOutcome: "provider_accepted"
    });
  });

  it("fails closed on a durable authority database error", async () => {
    useAuthorityDatabase({
      attemptError: {
        message: "database timeout"
      }
    });
    const send = vi.fn(async () => ({ ok: true }));

    const outcome = await sendNotificationDeliveryAttempt({
      payload: claimedSmsPayload,
      adapters: [{
        provider: "sms",
        transportProvider: "pingram",
        send
      }],
      authorizeAttempt: (payload) => recheckNotificationDeliveryAuthority({
        payload,
        workerId: "worker-1",
        env: pingramEnv
      })
    });

    expect(send).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({
      status: "suppressed",
      requestOutcome: "suppressed",
      errorCode: "delivery_authority_unavailable"
    });
  });

  it("binds a targeted worker claim to the exact expected attempt id", async () => {
    const builder = queryBuilder({ data: [], error: null });
    mocks.createSupabaseAdminClient.mockReturnValue({
      from: vi.fn(() => builder)
    });
    const expectedAttemptId = "11111111-1111-4111-8111-111111111111";

    const result = await claimQueuedNotificationDeliveries({
      workerId: "worker-1",
      limit: 1,
      expectedAttemptId,
      now: "2026-07-27T22:31:00.000Z"
    });

    expect(builder.eq).toHaveBeenCalledWith("id", expectedAttemptId);
    expect(result).toMatchObject({
      ok: false,
      attempts: []
    });
  });
});
