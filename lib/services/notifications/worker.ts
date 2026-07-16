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

export function buildNotificationIdempotencyKey(input: {
  notificationId: string;
  provider: NotificationDeliveryProvider;
}) {
  return `${input.notificationId}:${input.provider}`;
}

export function getNotificationDeliveryAdapter(
  adapters: NotificationDeliveryAdapter[],
  provider: NotificationDeliveryProvider
) {
  return adapters.find((adapter) => adapter.provider === provider);
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
      providerMessageId: input.result.providerMessageId,
      providerStatus: input.result.providerStatus,
      retryCount: input.payload.retryCount,
      nextAttemptAt: null,
      providerResponse: input.result.providerResponse
    };
  }

  const nextRetryCount = input.payload.retryCount + 1;
  const canRetry = input.result.retryable !== false && nextRetryCount <= input.payload.maxRetries;

  return {
    attemptId: input.payload.attemptId,
    status: "failed",
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
  now?: Date;
  retryDelaysMs?: number[];
}): Promise<NotificationDeliveryOutcome> {
  const adapter = getNotificationDeliveryAdapter(input.adapters, input.payload.provider);
  if (!adapter) {
    return deliveryOutcomeFromSendResult({
      payload: input.payload,
      now: input.now,
      retryDelaysMs: input.retryDelaysMs,
      result: {
        ok: false,
        retryable: false,
        errorCode: "provider_adapter_missing",
        errorMessage: `${input.payload.provider} delivery adapter is not configured.`
      }
    });
  }

  const result = await adapter.send(input.payload);
  return deliveryOutcomeFromSendResult({
    payload: input.payload,
    result,
    now: input.now,
    retryDelaysMs: input.retryDelaysMs
  });
}

export async function runNotificationSendWorker(input: {
  loadAttempts: () => Promise<NotificationDeliveryPayload[]>;
  recordOutcome: (outcome: NotificationDeliveryOutcome) => Promise<void>;
  adapters: NotificationDeliveryAdapter[];
  now?: Date;
  retryDelaysMs?: number[];
}) {
  const attempts = await input.loadAttempts();
  const outcomes: NotificationDeliveryOutcome[] = [];

  for (const payload of attempts) {
    const outcome = await sendNotificationDeliveryAttempt({
      payload,
      adapters: input.adapters,
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
    deadLettered: outcomes.filter((outcome) => outcome.deadLetteredAt).length,
    outcomes
  };
}
