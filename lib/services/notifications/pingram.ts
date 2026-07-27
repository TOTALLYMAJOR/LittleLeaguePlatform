import type {
  NotificationDeliveryAdapter,
  NotificationDeliveryPayload,
  NotificationDeliverySendResult
} from "./types";
import { smsContactDigestSecretReady } from "./sms-contact-suppression";

const DEFAULT_PINGRAM_API_ORIGIN = "https://api.pingram.io";
const DEFAULT_PINGRAM_SMS_TYPE = "leaguepilot_transactional_sms";
const DEFAULT_PINGRAM_TIMEOUT_MS = 10_000;
const MAX_PINGRAM_RESPONSE_BYTES = 32 * 1024;
const APPROVED_PINGRAM_API_ORIGINS = new Set([
  DEFAULT_PINGRAM_API_ORIGIN,
  "https://api.ca.pingram.io",
  "https://api.eu.pingram.io"
]);
const E164_PATTERN = /^\+[1-9]\d{7,14}$/;
const RECIPIENT_AUTHORITY_PART_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

type PingramSendGate = (
  payload: NotificationDeliveryPayload
) => NotificationDeliverySendResult | null;

type PingramAdapterOptions = {
  gate: PingramSendGate;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

type PingramSuccessResponse = {
  trackingId: string;
  messages: string[];
};

type PingramErrorResponse = {
  trackingId: string;
  error: {
    code: string;
    message: string;
    fix?: string;
  };
};

class PingramIndeterminateError extends Error {
  public constructor() {
    super("Pingram request outcome is indeterminate.");
    this.name = "PingramIndeterminateError";
  }
}

function asNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function hasOnlyStringMessages(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((message) => typeof message === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parsePingramResponse(
  value: unknown
): PingramSuccessResponse | PingramErrorResponse | null {
  if (!isRecord(value)) return null;
  const trackingId = asNonEmptyString(value.trackingId);
  if (!trackingId) return null;

  if (isRecord(value.error)) {
    const code = asNonEmptyString(value.error.code);
    const message = asNonEmptyString(value.error.message);
    const fix = asNonEmptyString(value.error.fix);
    if (!code || !message) return null;
    return {
      trackingId,
      error: {
        code,
        message,
        ...(fix ? { fix } : {})
      }
    };
  }

  if (!hasOnlyStringMessages(value.messages)) return null;
  return { trackingId, messages: value.messages };
}

function isPingramErrorResponse(
  value: PingramSuccessResponse | PingramErrorResponse
): value is PingramErrorResponse {
  return "error" in value;
}

function notAttemptedResult(
  errorCode: string,
  errorMessage: string
): NotificationDeliverySendResult {
  return {
    ok: false,
    requestOutcome: "not_attempted",
    retryable: false,
    errorCode,
    errorMessage
  };
}

function indeterminateResult(
  providerStatus = "indeterminate",
  providerMessageId?: string,
  statusCode?: number
): NotificationDeliverySendResult {
  return {
    ok: false,
    requestOutcome: "indeterminate",
    ...(providerMessageId ? { providerMessageId } : {}),
    providerStatus,
    retryable: false,
    errorCode: "pingram_outcome_indeterminate",
    errorMessage: "Text-message provider outcome requires reconciliation.",
    ...(statusCode ? { providerResponse: { statusCode } } : {})
  };
}

async function readBoundedJson(response: Response) {
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_PINGRAM_RESPONSE_BYTES) {
    throw new PingramIndeterminateError();
  }
  const rawBody = await response.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_PINGRAM_RESPONSE_BYTES) {
    throw new PingramIndeterminateError();
  }
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new PingramIndeterminateError();
  }
}

export function resolvePingramApiOrigin(value?: string | null) {
  const candidate = value || DEFAULT_PINGRAM_API_ORIGIN;
  try {
    const parsed = new URL(candidate);
    if (
      !APPROVED_PINGRAM_API_ORIGINS.has(parsed.origin) ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

export function pingramDeliveryConfigurationReady(
  env: Partial<NodeJS.ProcessEnv>
) {
  return Boolean(
    env.SMS_PROVIDER === "pingram" &&
    env.PINGRAM_API_KEY?.startsWith("pingram_sk_") &&
    resolvePingramApiOrigin(env.PINGRAM_API_BASE_URL) &&
    env.PINGRAM_WEBHOOK_SECRET?.startsWith("pingram_whsecret_") &&
    smsContactDigestSecretReady(env.PINGRAM_CONTACT_DIGEST_SECRET) &&
    env.PINGRAM_SMS_SENDER_READY === "true"
  );
}

export function formatPingramRecipientAuthority(input: {
  organizationId: string;
  userId: string;
}) {
  const organizationId = input.organizationId.trim();
  const userId = input.userId.trim();
  if (
    !RECIPIENT_AUTHORITY_PART_PATTERN.test(organizationId) ||
    !RECIPIENT_AUTHORITY_PART_PATTERN.test(userId)
  ) {
    return null;
  }
  return `lp:${organizationId}:${userId}`;
}

export function parsePingramRecipientAuthority(value: string) {
  const [prefix, organizationId, userId, extra] = value.split(":");
  if (
    prefix !== "lp" ||
    extra !== undefined ||
    !organizationId ||
    !userId ||
    !RECIPIENT_AUTHORITY_PART_PATTERN.test(organizationId) ||
    !RECIPIENT_AUTHORITY_PART_PATTERN.test(userId)
  ) {
    return null;
  }
  return { organizationId, userId };
}

export function createPingramMessagingAdapter(
  env: Partial<NodeJS.ProcessEnv>,
  options: PingramAdapterOptions
): NotificationDeliveryAdapter {
  return {
    provider: "sms",
    transportProvider: "pingram",
    async send(payload) {
      const blocked = options.gate(payload);
      if (blocked) return blocked;

      const apiKey = env.PINGRAM_API_KEY?.trim();
      const apiOrigin = resolvePingramApiOrigin(env.PINGRAM_API_BASE_URL);
      const phone = payload.recipient.phone?.trim();
      const recipientAuthority = formatPingramRecipientAuthority({
        organizationId: payload.organizationId,
        userId: payload.recipient.userId
      });
      const from = env.PINGRAM_FROM_NUMBER?.trim();

      if (env.SMS_PROVIDER !== "pingram") {
        return notAttemptedResult(
          "pingram_not_selected",
          "Pingram is not the selected text-message transport."
        );
      }
      if (!apiKey?.startsWith("pingram_sk_")) {
        return notAttemptedResult(
          "pingram_not_configured",
          "Pingram credentials are unavailable."
        );
      }
      if (!apiOrigin) {
        return notAttemptedResult(
          "pingram_origin_not_approved",
          "Pingram API origin is not approved."
        );
      }
      if (
        !env.PINGRAM_WEBHOOK_SECRET?.startsWith("pingram_whsecret_") ||
        !smsContactDigestSecretReady(env.PINGRAM_CONTACT_DIGEST_SECRET) ||
        env.PINGRAM_SMS_SENDER_READY !== "true"
      ) {
        return notAttemptedResult(
          "pingram_delivery_safety_not_ready",
          "Pingram sender, webhook, or local STOP-suppression readiness is unavailable."
        );
      }
      if (!phone || !E164_PATTERN.test(phone)) {
        return notAttemptedResult(
          "pingram_recipient_invalid",
          "Text-message recipient must use E.164 format."
        );
      }
      if (!recipientAuthority) {
        return notAttemptedResult(
          "pingram_recipient_authority_invalid",
          "Text-message recipient authority is invalid."
        );
      }
      if (from && !E164_PATTERN.test(from)) {
        return notAttemptedResult(
          "pingram_sender_invalid",
          "Pingram sender must use E.164 format."
        );
      }

      const fetchImpl = options.fetchImpl ?? fetch;
      const timeoutMs = options.timeoutMs ?? DEFAULT_PINGRAM_TIMEOUT_MS;
      const controller = new AbortController();
      let timeout: ReturnType<typeof setTimeout> | undefined;

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            controller.abort();
            reject(new PingramIndeterminateError());
          }, Math.max(1, timeoutMs));
        });
        const requestPromise = fetchImpl(`${apiOrigin}/send`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            type: env.PINGRAM_SMS_TYPE?.trim() || DEFAULT_PINGRAM_SMS_TYPE,
            to: {
              id: recipientAuthority,
              number: phone
            },
            forceChannels: ["SMS"],
            sms: {
              message: payload.body,
              ...(from ? { from } : {})
            }
          }),
          redirect: "error",
          signal: controller.signal
        });
        const response = await Promise.race([requestPromise, timeoutPromise]);

        if (response.status >= 500) {
          let providerMessageId: string | undefined;
          try {
            const body = await readBoundedJson(response);
            if (isRecord(body)) {
              providerMessageId = asNonEmptyString(body.trackingId) ?? undefined;
            }
          } catch {
            // The request may still have reached Pingram; preserve ambiguity.
          }
          return indeterminateResult(
            `indeterminate:http_${response.status}`,
            providerMessageId,
            response.status
          );
        }

        if (!response.ok) {
          return {
            ok: false,
            requestOutcome: "rejected",
            providerStatus: `rejected:${response.status}`,
            retryable: response.status === 429,
            errorCode: `pingram_http_${response.status}`,
            errorMessage: "Text-message provider rejected the delivery attempt.",
            providerResponse: { statusCode: response.status }
          };
        }

        const parsed = parsePingramResponse(await readBoundedJson(response));
        if (!parsed) return indeterminateResult("indeterminate:malformed_response");
        if (isPingramErrorResponse(parsed)) {
          return {
            ok: false,
            requestOutcome: "rejected",
            providerMessageId: parsed.trackingId,
            providerStatus: "rejected:provider_error",
            retryable: false,
            errorCode: "pingram_provider_rejected",
            errorMessage: "Text-message provider rejected the delivery attempt.",
            providerResponse: { statusCode: response.status }
          };
        }

        return {
          ok: true,
          requestOutcome: "provider_accepted",
          providerMessageId: parsed.trackingId,
          providerStatus: `accepted:${response.status}`,
          retryable: false,
          providerResponse: { statusCode: response.status }
        };
      } catch {
        return indeterminateResult();
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    }
  };
}
