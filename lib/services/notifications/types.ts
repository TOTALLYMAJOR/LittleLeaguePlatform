export type NotificationDeliveryProvider = "email" | "sms" | "web_push";
export type NotificationDeliveryChannel = "email" | "sms" | "push";
export type NotificationDeliveryAttemptStatus = "queued" | "sent" | "failed" | "suppressed";

export interface NotificationDeliveryRecipient {
  userId: string;
  email?: string | null;
  phone?: string | null;
  pushEndpoint?: string | null;
  pushP256dh?: string | null;
  pushAuth?: string | null;
}

export interface NotificationDeliveryPayload {
  attemptId: string;
  notificationId: string;
  provider: NotificationDeliveryProvider;
  channel: NotificationDeliveryChannel;
  organizationId: string;
  organizationProviderSendsEnabled?: boolean;
  teamId: string;
  title: string;
  body: string;
  notificationType: string;
  recipient: NotificationDeliveryRecipient;
  idempotencyKey: string;
  retryCount: number;
  maxRetries: number;
}

export interface NotificationDeliverySendResult {
  ok: boolean;
  providerMessageId?: string;
  providerStatus?: string;
  errorCode?: string;
  errorMessage?: string;
  retryable?: boolean;
  providerResponse?: Record<string, unknown>;
}

export interface NotificationDeliveryAdapter {
  provider: NotificationDeliveryProvider;
  send(payload: NotificationDeliveryPayload): Promise<NotificationDeliverySendResult>;
}

export interface NotificationDeliveryOutcome {
  attemptId: string;
  status: NotificationDeliveryAttemptStatus;
  providerMessageId?: string;
  providerStatus?: string;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  nextAttemptAt?: string | null;
  deadLetteredAt?: string | null;
  providerResponse?: Record<string, unknown>;
}
