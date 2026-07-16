import webPush from "web-push";
import { getNotificationDeliverySuppression } from "./rules";
import type {
  NotificationDeliveryAdapter,
  NotificationDeliveryPayload,
  NotificationDeliverySendContext,
  NotificationDeliverySendResult
} from "./types";

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

interface AdapterOptions {
  env?: Partial<NodeJS.ProcessEnv>;
  fetch?: FetchLike;
}

interface WebPushClient {
  setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  sendNotification(subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  }, payload?: string, options?: { TTL?: number; topic?: string }): Promise<{
    statusCode?: number;
    headers?: Record<string, string | string[] | undefined>;
    body?: string;
  }>;
}

interface WebPushAdapterOptions {
  env?: Partial<NodeJS.ProcessEnv>;
  webPushClient?: WebPushClient;
}

function providerSuppressed(errorCode: string, errorMessage: string): NotificationDeliverySendResult {
  return {
    ok: false,
    suppressed: true,
    providerStatus: "suppressed",
    errorCode,
    errorMessage,
    retryable: false
  };
}

function providerFailed(input: {
  providerStatus: string;
  errorCode: string;
  errorMessage: string;
  providerResponse?: Record<string, unknown>;
  retryable: boolean;
}): NotificationDeliverySendResult {
  return {
    ok: false,
    providerStatus: input.providerStatus,
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
    providerResponse: input.providerResponse,
    retryable: input.retryable
  };
}

async function responseBody(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { body: text };
  }
}

function retryableStatus(status: number) {
  return status === 429 || status >= 500;
}

export function createSendGridEmailAdapter(options: AdapterOptions = {}): NotificationDeliveryAdapter {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetch ?? fetch;

  return {
    provider: "email",
    async send(payload: NotificationDeliveryPayload, context: NotificationDeliverySendContext) {
      const suppression = getNotificationDeliverySuppression(payload, context.now);
      if (suppression) return suppression;

      const apiKey = env.SENDGRID_API_KEY;
      const fromEmail = env.SENDGRID_FROM_EMAIL || env.EMAIL_PROVIDER_FROM_EMAIL;
      if (!apiKey || !fromEmail) {
        return providerSuppressed("sendgrid_not_configured", "SendGrid API key and sender email are required before email delivery.");
      }

      const response = await fetchImpl("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
          "x-leaguepilot-idempotency-key": payload.idempotencyKey
        },
        body: JSON.stringify({
          personalizations: [{
            to: [{ email: payload.recipient.email }],
            custom_args: {
              notification_id: payload.notificationId,
              attempt_id: payload.attemptId,
              organization_id: payload.organizationId,
              team_id: payload.teamId
            }
          }],
          from: {
            email: fromEmail,
            name: env.SENDGRID_FROM_NAME || "LeaguePilot"
          },
          subject: payload.title,
          content: [{ type: "text/plain", value: payload.body }],
          mail_settings: env.SENDGRID_SANDBOX_MODE === "true"
            ? { sandbox_mode: { enable: true } }
            : undefined
        })
      });

      const providerResponse = await responseBody(response);
      if (response.ok) {
        return {
          ok: true,
          providerMessageId: response.headers.get("x-message-id"),
          providerStatus: response.status === 202 ? "accepted" : String(response.status),
          providerResponse: { status: response.status, ...providerResponse }
        };
      }

      return providerFailed({
        providerStatus: String(response.status),
        errorCode: "sendgrid_http_error",
        errorMessage: `SendGrid returned HTTP ${response.status}.`,
        providerResponse: { status: response.status, ...providerResponse },
        retryable: retryableStatus(response.status)
      });
    }
  };
}

export function createTwilioSmsAdapter(options: AdapterOptions = {}): NotificationDeliveryAdapter {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetch ?? fetch;

  return {
    provider: "sms",
    async send(payload: NotificationDeliveryPayload, context: NotificationDeliverySendContext) {
      const suppression = getNotificationDeliverySuppression(payload, context.now);
      if (suppression) return suppression;

      const accountSid = env.TWILIO_ACCOUNT_SID;
      const authToken = env.TWILIO_AUTH_TOKEN;
      const messagingServiceSid = env.TWILIO_MESSAGING_SERVICE_SID;
      if (!accountSid || !authToken || !messagingServiceSid) {
        return providerSuppressed("twilio_not_configured", "Twilio Account SID, Auth Token, and Messaging Service SID are required before SMS delivery.");
      }

      const body = new URLSearchParams({
        To: payload.recipient.phone ?? "",
        MessagingServiceSid: messagingServiceSid,
        Body: payload.body
      });
      if (env.TWILIO_STATUS_CALLBACK_URL) {
        body.set("StatusCallback", env.TWILIO_STATUS_CALLBACK_URL);
      }

      const response = await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
        method: "POST",
        headers: {
          authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "content-type": "application/x-www-form-urlencoded",
          "x-leaguepilot-idempotency-key": payload.idempotencyKey
        },
        body
      });
      const providerResponse = await responseBody(response);

      if (response.ok) {
        return {
          ok: true,
          providerMessageId: typeof providerResponse.sid === "string" ? providerResponse.sid : null,
          providerStatus: typeof providerResponse.status === "string" ? providerResponse.status : "queued",
          providerResponse: { status: response.status, ...providerResponse }
        };
      }

      return providerFailed({
        providerStatus: String(response.status),
        errorCode: "twilio_http_error",
        errorMessage: `Twilio returned HTTP ${response.status}.`,
        providerResponse: { status: response.status, ...providerResponse },
        retryable: retryableStatus(response.status)
      });
    }
  };
}

export function createWebPushAdapter(options: WebPushAdapterOptions = {}): NotificationDeliveryAdapter {
  const env = options.env ?? process.env;
  const webPushClient = options.webPushClient ?? webPush;

  return {
    provider: "web_push",
    async send(payload: NotificationDeliveryPayload, context: NotificationDeliverySendContext) {
      const suppression = getNotificationDeliverySuppression(payload, context.now);
      if (suppression) return suppression;

      const publicKey = env.WEB_PUSH_VAPID_PUBLIC_KEY || env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || env.VAPID_PUBLIC_KEY;
      const privateKey = env.WEB_PUSH_VAPID_PRIVATE_KEY || env.VAPID_PRIVATE_KEY;
      const subject = env.WEB_PUSH_VAPID_SUBJECT || env.VAPID_SUBJECT || env.WEB_PUSH_SUBJECT;
      if (!publicKey || !privateKey || !subject) {
        return providerSuppressed("web_push_not_configured", "Web Push VAPID public key, private key, and subject are required before push delivery.");
      }

      webPushClient.setVapidDetails(subject, publicKey, privateKey);
      const results = await Promise.allSettled((payload.recipient.pushSubscriptions ?? []).map((subscription) => (
        webPushClient.sendNotification({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.authSecret
          }
        }, JSON.stringify({
          title: payload.title,
          body: payload.body,
          notificationId: payload.notificationId,
          teamId: payload.teamId
        }), {
          TTL: 60 * 60,
          topic: payload.notificationId
        })
      )));

      const fulfilled = results.filter((result): result is PromiseFulfilledResult<{ statusCode?: number; headers?: Record<string, string | string[] | undefined>; body?: string }> => result.status === "fulfilled");
      const rejected = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
      if (fulfilled.length > 0) {
        const first = fulfilled[0]?.value;
        return {
          ok: true,
          providerMessageId: payload.idempotencyKey,
          providerStatus: String(first?.statusCode ?? 201),
          providerResponse: {
            deliveredSubscriptions: fulfilled.length,
            failedSubscriptions: rejected.length,
            statusCode: first?.statusCode
          }
        };
      }

      return providerFailed({
        providerStatus: "web_push_failed",
        errorCode: "web_push_send_failed",
        errorMessage: "Web Push delivery failed for every active subscription.",
        providerResponse: {
          failedSubscriptions: rejected.length,
          errors: rejected.map((result) => result.reason instanceof Error ? result.reason.message : String(result.reason))
        },
        retryable: true
      });
    }
  };
}

export function createNotificationProviderAdapters(options: AdapterOptions & WebPushAdapterOptions = {}) {
  return [
    createSendGridEmailAdapter(options),
    createTwilioSmsAdapter(options),
    createWebPushAdapter(options)
  ];
}
