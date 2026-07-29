export type NotificationDeliveryProvider = "email" | "sms" | "web_push";
export type NotificationDeliveryChannel = "email" | "sms" | "push";
export type NotificationDeliveryAttemptStatus = "queued" | "sent" | "failed" | "suppressed";
export type NotificationDeliveryRequestOutcome =
  | "not_attempted"
  | "provider_accepted"
  | "rejected"
  | "indeterminate"
  | "suppressed";
export type NotificationDeliveryTransportProvider =
  | "sendgrid"
  | "twilio"
  | "pingram"
  | "web_push";

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
  transportProvider?: NotificationDeliveryTransportProvider;
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
  requestOutcome?: NotificationDeliveryRequestOutcome;
  providerMessageId?: string;
  providerStatus?: string;
  errorCode?: string;
  errorMessage?: string;
  retryable?: boolean;
  providerResponse?: Record<string, unknown>;
}

export interface NotificationDeliveryAdapter {
  provider: NotificationDeliveryProvider;
  transportProvider?: NotificationDeliveryTransportProvider;
  send(payload: NotificationDeliveryPayload): Promise<NotificationDeliverySendResult>;
}

export interface NotificationDeliveryOutcome {
  attemptId: string;
  status: NotificationDeliveryAttemptStatus;
  requestOutcome?: NotificationDeliveryRequestOutcome;
  transportProvider?: NotificationDeliveryTransportProvider;
  providerMessageId?: string;
  providerStatus?: string;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  nextAttemptAt?: string | null;
  deadLetteredAt?: string | null;
  providerResponse?: Record<string, unknown>;
}
