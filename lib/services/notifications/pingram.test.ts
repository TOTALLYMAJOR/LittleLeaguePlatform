import { afterEach, describe, expect, it, vi } from "vitest";
import { createConfiguredNotificationAdapters } from "./adapters";
import {
  createPingramMessagingAdapter,
  formatPingramRecipientAuthority,
  parsePingramRecipientAuthority,
  resolvePingramApiOrigin
} from "./pingram";
import type {
  NotificationDeliveryPayload,
  NotificationDeliverySendResult
} from "./types";

const recipientPhone = "+13125551234";
const payload: NotificationDeliveryPayload = {
  attemptId: "attempt-1",
  notificationId: "notification-1",
  provider: "sms",
  channel: "sms",
  organizationId: "org-1",
  organizationProviderSendsEnabled: true,
  teamId: "team-1",
  title: "Schedule changed",
  body: "Practice is now at Field 2.",
  notificationType: "schedule_changed",
  recipient: {
    userId: "parent-1",
    phone: recipientPhone
  },
  idempotencyKey: "notification-1:sms",
  retryCount: 0,
  maxRetries: 2
};

const configuredEnv = {
  SMS_PROVIDER: "pingram",
  PINGRAM_API_KEY: "pingram_sk_test_only",
  PINGRAM_SMS_TYPE: "leaguepilot_schedule_update",
  PINGRAM_WEBHOOK_SECRET: "pingram_whsecret_test_only",
  PINGRAM_CONTACT_DIGEST_SECRET: "test-only-contact-digest-secret-123456",
  PINGRAM_SMS_SENDER_READY: "true"
};

function allowSend() {
  return null;
}

function adapterWithResponse(
  response: Response,
  env: Partial<NodeJS.ProcessEnv> = configuredEnv
) {
  const fetchMock = vi.fn(async (...request: Parameters<typeof fetch>) => {
    void request;
    return response;
  });
  return {
    fetchMock,
    adapter: createPingramMessagingAdapter(env, {
      gate: allowSend,
      fetchImpl: fetchMock as unknown as typeof fetch
    })
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Pingram origin and recipient authority", () => {
  it("allows only the documented US, Canada, and EU origins", () => {
    expect(resolvePingramApiOrigin()).toBe("https://api.pingram.io");
    expect(resolvePingramApiOrigin("https://api.pingram.io/")).toBe("https://api.pingram.io");
    expect(resolvePingramApiOrigin("https://api.ca.pingram.io")).toBe("https://api.ca.pingram.io");
    expect(resolvePingramApiOrigin("https://api.eu.pingram.io")).toBe("https://api.eu.pingram.io");
    expect(resolvePingramApiOrigin("http://api.pingram.io")).toBeNull();
    expect(resolvePingramApiOrigin("https://api.pingram.io/v1")).toBeNull();
    expect(resolvePingramApiOrigin("https://api.pingram.io?redirect=evil")).toBeNull();
    expect(resolvePingramApiOrigin("https://api.pingram.io.evil.example")).toBeNull();
  });

  it("round-trips tenant-owned recipient authority", () => {
    const authority = formatPingramRecipientAuthority({
      organizationId: "org-1",
      userId: "parent-1"
    });
    expect(authority).toBe("lp:org-1:parent-1");
    expect(parsePingramRecipientAuthority(authority ?? "")).toEqual({
      organizationId: "org-1",
      userId: "parent-1"
    });
    expect(parsePingramRecipientAuthority("lp:org-1:parent-1:extra")).toBeNull();
    expect(formatPingramRecipientAuthority({
      organizationId: "org:spoof",
      userId: "parent-1"
    })).toBeNull();
  });
});

describe("Pingram outbound adapter", () => {
  it("sends one accepted request through POST /send with provider-safe authority", async () => {
    const { adapter, fetchMock } = adapterWithResponse(new Response(JSON.stringify({
      trackingId: "track_pingram_001",
      messages: ["queued"]
    }), {
      status: 200,
      headers: { "content-type": "application/json" }
    }), {
      ...configuredEnv,
      PINGRAM_FROM_NUMBER: "+13125550000"
    });

    const result = await adapter.send(payload);

    expect(result).toEqual({
      ok: true,
      requestOutcome: "provider_accepted",
      providerMessageId: "track_pingram_001",
      providerStatus: "accepted:200",
      retryable: false,
      providerResponse: { statusCode: 200 }
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.pingram.io/send",
      expect.objectContaining({
        method: "POST",
        redirect: "error"
      })
    );

    const options = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(options.headers).toEqual({
      Authorization: "Bearer pingram_sk_test_only",
      "Content-Type": "application/json"
    });
    expect(options.headers).not.toHaveProperty("Idempotency-Key");
    expect(JSON.parse(String(options.body))).toEqual({
      type: "leaguepilot_schedule_update",
      to: {
        id: "lp:org-1:parent-1",
        number: recipientPhone
      },
      forceChannels: ["SMS"],
      sms: {
        message: payload.body,
        from: "+13125550000"
      }
    });
    expect(String(options.body)).not.toContain("pingram_sk_test_only");
  });

  it("treats the documented HTTP 200 error union as rejected and redacts it", async () => {
    const secretProviderMessage = "do not expose provider detail";
    const { adapter, fetchMock } = adapterWithResponse(new Response(JSON.stringify({
      trackingId: "track_pingram_error_001",
      error: {
        code: "PROVIDER_REJECTED",
        message: secretProviderMessage,
        fix: "do not expose provider fix"
      }
    }), { status: 200 }));

    const result = await adapter.send(payload);
    const serialized = JSON.stringify(result);

    expect(result).toMatchObject({
      ok: false,
      requestOutcome: "rejected",
      providerMessageId: "track_pingram_error_001",
      providerStatus: "rejected:provider_error",
      retryable: false,
      errorCode: "pingram_provider_rejected"
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(serialized).not.toContain(secretProviderMessage);
    expect(serialized).not.toContain("do not expose provider fix");
    expect(serialized).not.toContain("PROVIDER_REJECTED");
  });

  it("classifies a bounded rejection without reading its body", async () => {
    const response = new Response("sensitive provider body", { status: 429 });
    const textSpy = vi.spyOn(response, "text");
    const { adapter, fetchMock } = adapterWithResponse(response);

    const result = await adapter.send(payload);

    expect(result).toMatchObject({
      ok: false,
      requestOutcome: "rejected",
      providerStatus: "rejected:429",
      retryable: true,
      errorCode: "pingram_http_429"
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(textSpy).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("sensitive provider body");
  });

  it("holds a 5xx response for reconciliation and keeps a bounded tracking ID", async () => {
    const providerDetail = "downstream provider may have accepted the message";
    const { adapter, fetchMock } = adapterWithResponse(new Response(JSON.stringify({
      trackingId: "track_pingram_502",
      error: {
        code: "DOWNSTREAM_ERROR",
        message: providerDetail
      }
    }), { status: 502 }));

    const result = await adapter.send(payload);

    expect(result).toMatchObject({
      ok: false,
      requestOutcome: "indeterminate",
      providerMessageId: "track_pingram_502",
      providerStatus: "indeterminate:http_502",
      retryable: false,
      errorCode: "pingram_outcome_indeterminate",
      providerResponse: { statusCode: 502 }
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toContain(providerDetail);
    expect(JSON.stringify(result)).not.toContain("DOWNSTREAM_ERROR");
  });

  it.each([
    ["invalid JSON", "not json"],
    ["missing success fields", JSON.stringify({ trackingId: "track_pingram_002" })]
  ])("treats malformed 2xx responses as indeterminate: %s", async (_name, body) => {
    const { adapter, fetchMock } = adapterWithResponse(new Response(body, { status: 200 }));

    const result = await adapter.send(payload);

    expect(result).toMatchObject({
      ok: false,
      requestOutcome: "indeterminate",
      retryable: false,
      errorCode: "pingram_outcome_indeterminate"
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats connection and redirect-policy failures as redacted indeterminate outcomes", async () => {
    const fetchMock = vi.fn().mockRejectedValue(
      new TypeError(`redirect blocked for ${recipientPhone}: ${payload.body}`)
    );
    const adapter = createPingramMessagingAdapter(configuredEnv, {
      gate: allowSend,
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    const result = await adapter.send(payload);

    expect(result).toMatchObject({
      ok: false,
      requestOutcome: "indeterminate",
      providerStatus: "indeterminate",
      retryable: false
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toContain(recipientPhone);
    expect(JSON.stringify(result)).not.toContain(payload.body);
  });

  it("aborts a bounded request and does not retry inside the adapter", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
    const adapter = createPingramMessagingAdapter(configuredEnv, {
      gate: allowSend,
      fetchImpl: fetchMock as unknown as typeof fetch,
      timeoutMs: 25
    });

    const pending = adapter.send(payload);
    await vi.advanceTimersByTimeAsync(26);
    const result = await pending;

    expect(result).toMatchObject({
      ok: false,
      requestOutcome: "indeterminate",
      retryable: false
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects non-E.164 recipients before making a provider request", async () => {
    const { adapter, fetchMock } = adapterWithResponse(new Response("{}", { status: 200 }));

    const result = await adapter.send({
      ...payload,
      recipient: { ...payload.recipient, phone: "+1234567" }
    });

    expect(result).toMatchObject({
      ok: false,
      requestOutcome: "not_attempted",
      errorCode: "pingram_recipient_invalid"
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["sender readiness", { PINGRAM_SMS_SENDER_READY: "false" }],
    ["webhook verification", { PINGRAM_WEBHOOK_SECRET: "" }],
    ["local STOP suppression", { PINGRAM_CONTACT_DIGEST_SECRET: "" }]
  ])("re-checks revoked %s immediately before the provider call", async (_name, override) => {
    const fetchMock = vi.fn();
    const adapter = createPingramMessagingAdapter({
      ...configuredEnv,
      ...override
    }, {
      gate: allowSend,
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    const result = await adapter.send(payload);

    expect(result).toMatchObject({
      ok: false,
      requestOutcome: "not_attempted",
      retryable: false,
      errorCode: "pingram_delivery_safety_not_ready"
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "global kill switch",
      env: {
        ...configuredEnv,
        SMS_PROVIDER: "pingram",
        PROVIDER_SENDS_ENABLED: "false",
        PROVIDER_QA_RECIPIENT_ALLOWLIST: recipientPhone
      },
      attempt: payload,
      code: "provider_sends_kill_switch"
    },
    {
      name: "organization gate",
      env: {
        ...configuredEnv,
        SMS_PROVIDER: "pingram",
        PROVIDER_SENDS_ENABLED: "true",
        PROVIDER_QA_RECIPIENT_ALLOWLIST: recipientPhone
      },
      attempt: { ...payload, organizationProviderSendsEnabled: false },
      code: "organization_provider_sends_disabled"
    },
    {
      name: "QA allowlist",
      env: {
        ...configuredEnv,
        SMS_PROVIDER: "pingram",
        PROVIDER_SENDS_ENABLED: "true",
        PROVIDER_QA_RECIPIENT_ALLOWLIST: "+13125559999"
      },
      attempt: payload,
      code: "recipient_not_allowlisted"
    }
  ])("preserves the existing $name", async ({ env, attempt, code }) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const adapter = createConfiguredNotificationAdapters(env)
      .find((candidate) => candidate.provider === "sms");

    const result = await adapter?.send(attempt) as NotificationDeliverySendResult;

    expect(result).toMatchObject({
      ok: false,
      requestOutcome: "suppressed",
      retryable: false,
      errorCode: code
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
