import type {
  NotificationDeliveryAdapter,
  NotificationDeliveryPayload,
  NotificationDeliverySendResult
} from "./types";
import { environmentFeatureEnabled } from "@/lib/services/feature-gates";
import { createPingramMessagingAdapter } from "./pingram";
import { resolveSmsProvider } from "./sms-provider";

function allowlist(env: Partial<NodeJS.ProcessEnv>) {
  return new Set((env.PROVIDER_QA_RECIPIENT_ALLOWLIST ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean));
}

function isAllowlisted(payload: NotificationDeliveryPayload, env: Partial<NodeJS.ProcessEnv>) {
  if (env.PROVIDER_DELIVERY_MODE === "production" && env.PROVIDER_PRODUCTION_APPROVED === "true") return true;
  const permitted = allowlist(env);
  const recipientValues = [
    payload.recipient.email,
    payload.recipient.phone,
    payload.recipient.pushEndpoint
  ].filter((value): value is string => Boolean(value)).map((value) => value.toLowerCase());
  return recipientValues.some((value) => permitted.has(value));
}

function blockedResult(payload: NotificationDeliveryPayload, env: Partial<NodeJS.ProcessEnv>): NotificationDeliverySendResult | null {
  if (!environmentFeatureEnabled("provider_sends", env)) {
    return {
      ok: false,
      requestOutcome: "suppressed",
      retryable: false,
      errorCode: "provider_sends_kill_switch",
      errorMessage: "Provider sends are disabled by the environment kill switch."
    };
  }
  if (payload.organizationProviderSendsEnabled !== true) {
    return {
      ok: false,
      requestOutcome: "suppressed",
      retryable: false,
      errorCode: "organization_provider_sends_disabled",
      errorMessage: "Provider sends are disabled for this organization."
    };
  }
  if (!isAllowlisted(payload, env)) {
    return {
      ok: false,
      requestOutcome: "suppressed",
      retryable: false,
      errorCode: "recipient_not_allowlisted",
      errorMessage: "Recipient is not in the configured delivery allowlist."
    };
  }
  return null;
}

export function createSendGridAdapter(env: Partial<NodeJS.ProcessEnv> = process.env): NotificationDeliveryAdapter {
  return {
    provider: "email",
    transportProvider: "sendgrid",
    async send(payload) {
      const blocked = blockedResult(payload, env);
      if (blocked) return blocked;
      if (!env.SENDGRID_API_KEY || !env.SENDGRID_FROM_EMAIL || !payload.recipient.email) {
        return {
          ok: false,
          retryable: false,
          errorCode: "sendgrid_not_configured",
          errorMessage: "SendGrid sender credentials or recipient email are unavailable."
        };
      }
      try {
        const sendgrid = (await import("@sendgrid/mail")).default;
        sendgrid.setApiKey(env.SENDGRID_API_KEY);
        const [response] = await sendgrid.send({
          to: payload.recipient.email,
          from: {
            email: env.SENDGRID_FROM_EMAIL,
            name: env.SENDGRID_FROM_NAME ?? "LeaguePilot"
          },
          subject: payload.title,
          text: payload.body,
          customArgs: {
            leaguepilot_attempt_id: payload.attemptId,
            leaguepilot_notification_id: payload.notificationId
          }
        });
        const providerMessageId = String(response.headers?.["x-message-id"] ?? "");
        return {
          ok: true,
          providerMessageId: providerMessageId || undefined,
          providerStatus: `accepted:${response.statusCode}`,
          providerResponse: { statusCode: response.statusCode }
        };
      } catch (error) {
        const statusCode = typeof error === "object" && error && "code" in error ? Number(error.code) : 0;
        return {
          ok: false,
          retryable: statusCode === 429 || statusCode >= 500 || statusCode === 0,
          errorCode: statusCode ? `sendgrid_${statusCode}` : "sendgrid_request_failed",
          errorMessage: "Email provider did not accept the delivery attempt."
        };
      }
    }
  };
}

export function createTwilioMessagingAdapter(env: Partial<NodeJS.ProcessEnv> = process.env): NotificationDeliveryAdapter {
  return {
    provider: "sms",
    transportProvider: "twilio",
    async send(payload) {
      const blocked = blockedResult(payload, env);
      if (blocked) return blocked;
      if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_MESSAGING_SERVICE_SID || !payload.recipient.phone) {
        return {
          ok: false,
          retryable: false,
          errorCode: "twilio_not_configured",
          errorMessage: "Twilio Messaging Service credentials or recipient phone are unavailable."
        };
      }
      try {
        const { default: twilio } = await import("twilio");
        const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
        const message = await client.messages.create({
          to: payload.recipient.phone,
          messagingServiceSid: env.TWILIO_MESSAGING_SERVICE_SID,
          body: payload.body,
          statusCallback: env.TWILIO_STATUS_CALLBACK_URL
        });
        return {
          ok: true,
          requestOutcome: "provider_accepted",
          providerMessageId: message.sid,
          providerStatus: `accepted:${message.status}`,
          providerResponse: { status: message.status, errorCode: message.errorCode }
        };
      } catch (error) {
        const code = typeof error === "object" && error && "code" in error ? String(error.code) : "request_failed";
        const status = typeof error === "object" && error && "status" in error ? Number(error.status) : 0;
        return {
          ok: false,
          retryable: status === 429 || status >= 500 || status === 0,
          errorCode: `twilio_${code}`,
          errorMessage: "Text-message provider did not accept the delivery attempt."
        };
      }
    }
  };
}

export function createWebPushAdapter(env: Partial<NodeJS.ProcessEnv> = process.env): NotificationDeliveryAdapter {
  return {
    provider: "web_push",
    transportProvider: "web_push",
    async send(payload) {
      const blocked = blockedResult(payload, env);
      if (blocked) return blocked;
      const vapidPublicKey = env.VAPID_PUBLIC_KEY || env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT
        || !payload.recipient.pushEndpoint || !payload.recipient.pushP256dh || !payload.recipient.pushAuth) {
        return {
          ok: false,
          retryable: false,
          errorCode: "web_push_not_configured",
          errorMessage: "Web Push keys or recipient subscription evidence are unavailable."
        };
      }
      try {
        const webpush = await import("web-push");
        webpush.setVapidDetails(env.VAPID_SUBJECT, vapidPublicKey, env.VAPID_PRIVATE_KEY);
        const response = await webpush.sendNotification({
          endpoint: payload.recipient.pushEndpoint,
          keys: {
            p256dh: payload.recipient.pushP256dh,
            auth: payload.recipient.pushAuth
          }
        }, JSON.stringify({
          title: payload.title,
          body: payload.body,
          notificationId: payload.notificationId
        }));
        return {
          ok: true,
          providerStatus: `accepted:${response.statusCode}`,
          providerResponse: { statusCode: response.statusCode }
        };
      } catch (error) {
        const statusCode = typeof error === "object" && error && "statusCode" in error ? Number(error.statusCode) : 0;
        return {
          ok: false,
          retryable: statusCode === 429 || statusCode >= 500 || statusCode === 0,
          errorCode: statusCode ? `web_push_${statusCode}` : "web_push_request_failed",
          errorMessage: "Push provider did not accept the delivery attempt."
        };
      }
    }
  };
}

export function createConfiguredNotificationAdapters(env: Partial<NodeJS.ProcessEnv> = process.env) {
  const smsProvider = resolveSmsProvider(env);
  const smsAdapter = smsProvider === "pingram"
    ? createPingramMessagingAdapter(env, {
      gate: (payload) => blockedResult(payload, env)
    })
    : smsProvider === "twilio"
      ? createTwilioMessagingAdapter(env)
      : {
        provider: "sms" as const,
        async send(payload: NotificationDeliveryPayload): Promise<NotificationDeliverySendResult> {
          const blocked = blockedResult(payload, env);
          if (blocked) return blocked;
          return {
            ok: false,
            requestOutcome: "not_attempted",
            retryable: false,
            errorCode: "sms_provider_not_selected",
            errorMessage: "SMS provider selection is unavailable."
          };
        }
      };
  return [
    createSendGridAdapter(env),
    smsAdapter,
    createWebPushAdapter(env)
  ];
}
