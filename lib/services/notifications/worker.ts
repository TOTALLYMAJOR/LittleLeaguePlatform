import type {
  NotificationDeliveryAdapter,
  NotificationDeliveryOutcome,
  NotificationDeliveryPayload,
  NotificationDeliveryProvider,
  NotificationDeliverySendResult,
  NotificationSendWorkerResult
} from "./types";

const DEFAULT_RETRY_DELAYS_MS = [60_000, 5 * 60_000, 15 * 60_000];

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
  return adapters.find((adapter) => adapter.provider === provider) ?? null;
}

export function nextRetryAt(input: {
  retryCount: number;
  now: Date;
  retryDelaysMs?: number[];
}) {
  const retryDelaysMs = input.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  const delay = retryDelaysMs[Math.max(0, input.retryCount - 1)] ?? retryDelaysMs.at(-1) ?? DEFAULT_RETRY_DELAYS_MS.at(-1) ?? 60_000;
  return new Date(input.now.getTime() + delay).toISOString();
}

export function deliveryOutcomeFromSendResult(input: {
  payload: NotificationDeliveryPayload;
  result: NotificationDeliverySendResult;
  now: Date;
  retryDelaysMs?: number[];
}): NotificationDeliveryOutcome {
  const attemptedAt = input.now.toISOString();

  if (input.result.ok) {
    return {
      attemptId: input.payload.attemptId,
      notificationId: input.payload.notificationId,
      provider: input.payload.provider,
      status: "sent",
      providerMessageId: input.result.providerMessageId ?? null,
      providerStatus: input.result.providerStatus ?? "accepted",
      providerResponse: input.result.providerResponse ?? null,
      errorCode: null,
      errorMessage: null,
      retryCount: input.payload.retryCount,
      nextAttemptAt: null,
      deadLetteredAt: null,
      attemptedAt,
      idempotencyKey: input.payload.idempotencyKey
    };
  }

  const nextRetryCount = input.payload.retryCount + 1;
  const retryable = input.result.retryable === true && nextRetryCount <= input.payload.maxRetries;

  return {
    attemptId: input.payload.attemptId,
    notificationId: input.payload.notificationId,
    provider: input.payload.provider,
    status: "failed",
    providerMessageId: input.result.providerMessageId ?? null,
    providerStatus: input.result.providerStatus ?? null,
    providerResponse: input.result.providerResponse ?? null,
    errorCode: input.result.errorCode ?? "provider_send_failed",
    errorMessage: input.result.errorMessage ?? "Notification provider send failed.",
    retryCount: nextRetryCount,
    nextAttemptAt: retryable ? nextRetryAt({ retryCount: nextRetryCount, now: input.now, retryDelaysMs: input.retryDelaysMs }) : null,
    deadLetteredAt: retryable ? null : attemptedAt,
    attemptedAt,
    idempotencyKey: input.payload.idempotencyKey
  };
}

export async function sendNotificationDeliveryAttempt(input: {
  payload: NotificationDeliveryPayload;
  adapters: NotificationDeliveryAdapter[];
  now?: Date;
  retryDelaysMs?: number[];
  signal?: AbortSignal;
}) {
  const now = input.now ?? new Date();
  const adapter = getNotificationDeliveryAdapter(input.adapters, input.payload.provider);
  const result = adapter
    ? await adapter.send(input.payload, { now, signal: input.signal })
    : {
        ok: false,
        errorCode: "provider_adapter_missing",
        errorMessage: `No notification delivery adapter is registered for ${input.payload.provider}.`,
        retryable: false
      };

  return deliveryOutcomeFromSendResult({
    payload: input.payload,
    result,
    now,
    retryDelaysMs: input.retryDelaysMs
  });
}

export async function runNotificationSendWorker(input: {
  loadAttempts: () => Promise<NotificationDeliveryPayload[]>;
  recordOutcome: (outcome: NotificationDeliveryOutcome) => Promise<void>;
  adapters: NotificationDeliveryAdapter[];
  now?: Date;
  retryDelaysMs?: number[];
  signal?: AbortSignal;
}): Promise<NotificationSendWorkerResult> {
  const attempts = await input.loadAttempts();
  const outcomes: NotificationDeliveryOutcome[] = [];

  for (const payload of attempts) {
    const outcome = await sendNotificationDeliveryAttempt({
      payload,
      adapters: input.adapters,
      now: input.now,
      retryDelaysMs: input.retryDelaysMs,
      signal: input.signal
    });
    await input.recordOutcome(outcome);
    outcomes.push(outcome);
  }

  return {
    claimed: attempts.length,
    sent: outcomes.filter((outcome) => outcome.status === "sent").length,
    failed: outcomes.filter((outcome) => outcome.status === "failed").length,
    retrying: outcomes.filter((outcome) => outcome.status === "failed" && outcome.nextAttemptAt).length,
    deadLettered: outcomes.filter((outcome) => outcome.deadLetteredAt).length,
    outcomes
  };
}
