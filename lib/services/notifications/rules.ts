import type { NotificationDeliveryPayload, NotificationDeliverySendResult } from "./types";

const URGENT_NOTIFICATION_TYPES = new Set(["event_cancelled", "weather_alert"]);

export function isUrgentNotificationType(notificationType: string) {
  return URGENT_NOTIFICATION_TYPES.has(notificationType);
}

function minutesFromTime(value: string) {
  const [hourText, minuteText] = value.split(":");
  const hours = Number(hourText);
  const minutes = Number(minuteText);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function localMinutesForDate(input: {
  now: Date;
  timezone?: string | null;
}) {
  const timezone = input.timezone || "America/Chicago";
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone
  }).formatToParts(input.now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0") % 24;
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function isQuietHoursActive(input: {
  now: Date;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  timezone?: string | null;
}) {
  if (!input.quietHoursStart || !input.quietHoursEnd) return false;
  const start = minutesFromTime(input.quietHoursStart);
  const end = minutesFromTime(input.quietHoursEnd);
  if (start === null || end === null || start === end) return false;

  const current = localMinutesForDate({ now: input.now, timezone: input.timezone });
  return start < end
    ? current >= start && current < end
    : current >= start || current < end;
}

function suppressed(errorCode: string, errorMessage: string): NotificationDeliverySendResult {
  return {
    ok: false,
    suppressed: true,
    providerStatus: "suppressed",
    errorCode,
    errorMessage,
    retryable: false
  };
}

export function getNotificationDeliverySuppression(payload: NotificationDeliveryPayload, now: Date) {
  const policy = payload.deliveryPolicy;

  if (policy?.preferencesAllowed === false) {
    return suppressed("recipient_preference_disabled", "Delivery suppressed by recipient notification preferences.");
  }

  const urgent = policy?.urgent ?? isUrgentNotificationType(payload.notificationType);
  if (payload.channel === "sms" && !urgent) {
    return suppressed("sms_not_urgent", "SMS delivery is reserved for urgent cancellations or weather alerts.");
  }

  const quietHoursActive = isQuietHoursActive({
    now,
    quietHoursStart: policy?.quietHoursStart,
    quietHoursEnd: policy?.quietHoursEnd,
    timezone: policy?.timezone
  });
  if (quietHoursActive && !urgent) {
    return suppressed("quiet_hours_active", "Delivery suppressed during recipient quiet hours.");
  }

  if (payload.channel === "email" && !payload.recipient.email) {
    return suppressed("recipient_email_missing", "Delivery suppressed because the recipient does not have an email address.");
  }
  if (payload.channel === "sms" && !payload.recipient.phone) {
    return suppressed("recipient_phone_missing", "Delivery suppressed because the recipient does not have an SMS phone number.");
  }
  if (payload.channel === "push" && !payload.recipient.pushSubscriptions?.length) {
    return suppressed("push_subscription_missing", "Delivery suppressed because the recipient has no active push subscription.");
  }

  return null;
}
