export type NotificationDeliveryProvider = "email" | "sms" | "web_push";
export type NotificationDeliveryChannel = "push" | "email" | "sms";
export type NotificationDeliveryAttemptStatus = "queued" | "sent" | "failed" | "suppressed";

export interface NotificationPushSubscription {
  endpoint: string;
  p256dh: string;
  authSecret: string;
}

export interface NotificationDeliveryRecipient {
  userId: string;
  email?: string | null;
  phone?: string | null;
  pushSubscriptions?: NotificationPushSubscription[];
}

export interface NotificationDeliveryPayload {
  attemptId: string;
  notificationId: string;
  organizationId: string;
  teamId: string;
  eventId?: string | null;
  provider: NotificationDeliveryProvider;
  channel: NotificationDeliveryChannel;
  notificationType: string;
  title: string;
  body: string;
  recipient: NotificationDeliveryRecipient;
  idempotencyKey: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
}

export interface NotificationDeliverySendContext {
  now: Date;
  signal?: AbortSignal;
}

export interface NotificationDeliverySendResult {
  ok: boolean;
  providerMessageId?: string | null;
  providerStatus?: string | null;
  providerResponse?: Record<string, unknown> | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  retryable?: boolean;
}

export interface NotificationDeliveryAdapter {
  provider: NotificationDeliveryProvider;
  send(payload: NotificationDeliveryPayload, context: NotificationDeliverySendContext): Promise<NotificationDeliverySendResult>;
}

export interface NotificationDeliveryOutcome {
  attemptId: string;
  notificationId: string;
  provider: NotificationDeliveryProvider;
  status: NotificationDeliveryAttemptStatus;
  providerMessageId?: string | null;
  providerStatus?: string | null;
  providerResponse?: Record<string, unknown> | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  retryCount: number;
  nextAttemptAt?: string | null;
  deadLetteredAt?: string | null;
  attemptedAt: string;
  idempotencyKey: string;
}

export interface NotificationSendWorkerResult {
  claimed: number;
  sent: number;
  failed: number;
  retrying: number;
  deadLettered: number;
  outcomes: NotificationDeliveryOutcome[];
}
