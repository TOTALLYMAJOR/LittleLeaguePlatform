import type {
  NotificationDeliveryAdapter,
  NotificationDeliveryOutcome,
  NotificationDeliveryPayload,
  NotificationDeliveryProvider,
  NotificationDeliverySendResult
} from "./types";

const DEFAULT_RETRY_DELAYS_MS = [
  5 * 60 * 1000,
  15 * 60 * 1000,
  60 * 60 * 1000
];

export type NotificationDeliveryAuthorityDecision =
  | {
    allowed: true;
    payload: NotificationDeliveryPayload;
  }
  | {
    allowed: false;
    errorCode: string;
    errorMessage: string;
  };

export type NotificationDeliveryAuthorityCheck = (
  payload: NotificationDeliveryPayload
) => Promise<NotificationDeliveryAuthorityDecision>;

export function buildNotificationIdempotencyKey(input: {
  notificationId: string;
  provider: NotificationDeliveryProvider;
}) {
  return `${input.notificationId}:${input.provider}`;
}

export function getNotificationDeliveryAdapter(
  adapters: NotificationDeliveryAdapter[],
  provider: NotificationDeliveryProvider,
  transportProvider?: NotificationDeliveryPayload["transportProvider"]
) {
  return adapters.find((adapter) => (
    adapter.provider === provider &&
    (!transportProvider || adapter.transportProvider === transportProvider)
  ));
}

export function nextRetryAt(input: {
  retryCount: number;
  now: Date;
  retryDelaysMs?: number[];
}) {
  const delays = input.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  const delay = delays[Math.min(input.retryCount, delays.length - 1)] ?? delays[delays.length - 1] ?? 0;
  return new Date(input.now.getTime() + delay).toISOString();
}

export function deliveryOutcomeFromSendResult(input: {
  payload: NotificationDeliveryPayload;
  result: NotificationDeliverySendResult;
  now?: Date;
  retryDelaysMs?: number[];
}): NotificationDeliveryOutcome {
  const now = input.now ?? new Date();
  if (input.result.ok) {
    return {
      attemptId: input.payload.attemptId,
      status: "sent",
      requestOutcome: input.result.requestOutcome ?? "provider_accepted",
      transportProvider: input.payload.transportProvider,
      providerMessageId: input.result.providerMessageId,
      providerStatus: input.result.providerStatus,
      retryCount: input.payload.retryCount,
      nextAttemptAt: null,
      providerResponse: input.result.providerResponse
    };
  }

  const nextRetryCount = input.payload.retryCount + 1;
  if (input.result.requestOutcome === "suppressed") {
    return {
      attemptId: input.payload.attemptId,
      status: "suppressed",
      requestOutcome: "suppressed",
      transportProvider: input.payload.transportProvider,
      providerStatus: input.result.providerStatus,
      errorCode: input.result.errorCode,
      errorMessage: input.result.errorMessage,
      retryCount: input.payload.retryCount,
      nextAttemptAt: null,
      deadLetteredAt: null,
      providerResponse: input.result.providerResponse
    };
  }
  if (input.result.requestOutcome === "indeterminate") {
    return {
      attemptId: input.payload.attemptId,
      status: "failed",
      requestOutcome: "indeterminate",
      transportProvider: input.payload.transportProvider,
      providerMessageId: input.result.providerMessageId,
      providerStatus: input.result.providerStatus ?? "indeterminate",
      errorCode: input.result.errorCode ?? "provider_outcome_indeterminate",
      errorMessage: input.result.errorMessage ?? "Provider outcome requires reconciliation.",
      retryCount: nextRetryCount,
      nextAttemptAt: null,
      deadLetteredAt: null,
      providerResponse: input.result.providerResponse
    };
  }
  const canRetry = input.result.retryable !== false && nextRetryCount <= input.payload.maxRetries;

  return {
    attemptId: input.payload.attemptId,
    status: "failed",
    requestOutcome: input.result.requestOutcome,
    transportProvider: input.payload.transportProvider,
    providerMessageId: input.result.providerMessageId,
    providerStatus: input.result.providerStatus,
    errorCode: input.result.errorCode ?? "provider_send_failed",
    errorMessage: input.result.errorMessage ?? "Provider send failed.",
    retryCount: nextRetryCount,
    nextAttemptAt: canRetry ? nextRetryAt({ retryCount: input.payload.retryCount, now, retryDelaysMs: input.retryDelaysMs }) : null,
    deadLetteredAt: canRetry ? null : now.toISOString(),
    providerResponse: input.result.providerResponse
  };
}

export async function sendNotificationDeliveryAttempt(input: {
  payload: NotificationDeliveryPayload;
  adapters: NotificationDeliveryAdapter[];
  authorizeAttempt: NotificationDeliveryAuthorityCheck;
  now?: Date;
  retryDelaysMs?: number[];
}): Promise<NotificationDeliveryOutcome> {
  const adapter = getNotificationDeliveryAdapter(
    input.adapters,
    input.payload.provider,
    input.payload.transportProvider
  );
  if (!adapter) {
    return deliveryOutcomeFromSendResult({
      payload: input.payload,
      now: input.now,
      retryDelaysMs: input.retryDelaysMs,
      result: {
        ok: false,
        requestOutcome: "not_attempted",
        retryable: false,
        errorCode: "provider_adapter_missing",
        errorMessage: `${input.payload.provider} delivery adapter is not configured.`
      }
    });
  }

  const boundPayload = input.payload.transportProvider || !adapter.transportProvider
    ? input.payload
    : { ...input.payload, transportProvider: adapter.transportProvider };
  let authority: NotificationDeliveryAuthorityDecision;
  try {
    authority = await input.authorizeAttempt(boundPayload);
  } catch {
    authority = {
      allowed: false,
      errorCode: "delivery_authority_unavailable",
      errorMessage: "Delivery was suppressed because current send authority could not be verified."
    };
  }

  if (!authority.allowed) {
    return deliveryOutcomeFromSendResult({
      payload: boundPayload,
      result: {
        ok: false,
        requestOutcome: "suppressed",
        retryable: false,
        errorCode: authority.errorCode,
        errorMessage: authority.errorMessage
      },
      now: input.now,
      retryDelaysMs: input.retryDelaysMs
    });
  }

  const payload = authority.payload;
  if (
    payload.attemptId !== boundPayload.attemptId ||
    payload.notificationId !== boundPayload.notificationId ||
    payload.provider !== boundPayload.provider ||
    payload.channel !== boundPayload.channel ||
    payload.transportProvider !== boundPayload.transportProvider
  ) {
    return deliveryOutcomeFromSendResult({
      payload: boundPayload,
      result: {
        ok: false,
        requestOutcome: "suppressed",
        retryable: false,
        errorCode: "delivery_authority_binding_changed",
        errorMessage: "Delivery was suppressed because the durable provider binding changed."
      },
      now: input.now,
      retryDelaysMs: input.retryDelaysMs
    });
  }

  const result = await adapter.send(payload);
  return deliveryOutcomeFromSendResult({
    payload,
    result,
    now: input.now,
    retryDelaysMs: input.retryDelaysMs
  });
}

export async function runNotificationSendWorker(input: {
  loadAttempts: () => Promise<NotificationDeliveryPayload[]>;
  recordOutcome: (outcome: NotificationDeliveryOutcome) => Promise<void>;
  adapters: NotificationDeliveryAdapter[];
  authorizeAttempt: NotificationDeliveryAuthorityCheck;
  now?: Date;
  retryDelaysMs?: number[];
}) {
  const attempts = await input.loadAttempts();
  const outcomes: NotificationDeliveryOutcome[] = [];

  for (const payload of attempts) {
    const outcome = await sendNotificationDeliveryAttempt({
      payload,
      adapters: input.adapters,
      authorizeAttempt: input.authorizeAttempt,
      now: input.now,
      retryDelaysMs: input.retryDelaysMs
    });
    await input.recordOutcome(outcome);
    outcomes.push(outcome);
  }

  return {
    attempted: outcomes.length,
    sent: outcomes.filter((outcome) => outcome.status === "sent").length,
    failed: outcomes.filter((outcome) => outcome.status === "failed").length,
    indeterminate: outcomes.filter((outcome) => outcome.requestOutcome === "indeterminate").length,
    deadLettered: outcomes.filter((outcome) => outcome.deadLetteredAt).length,
    outcomes
  };
}
