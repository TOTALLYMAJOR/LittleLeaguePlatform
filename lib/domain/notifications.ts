import type { AppState, NotificationChannel, NotificationPreferenceType } from "./types";

export function getVapidSendAdapterStatus(config: { publicKey?: string; privateKey?: string; subject?: string } = {}) {
  const configured = Boolean(config.publicKey && config.privateKey && config.subject);
  return {
    configured,
    status: configured ? "configured" : "not_configured",
    detail: configured
      ? "VAPID keys are present; delivery still requires approval-gated provider execution."
      : "VAPID send adapter is intentionally not configured for this scaffold."
  };
}

export function getNotificationStatusCounts(state: AppState) {
  return {
    pending: state.notifications.filter((notification) => notification.status === "pending").length,
    sent: state.notifications.filter((notification) => notification.status === "sent").length,
    failed: state.notifications.filter((notification) => notification.status === "failed").length,
    read: state.notifications.filter((notification) => notification.status === "read").length
  };
}

export function getEventStatusTracking(state: AppState) {
  return {
    scheduled: state.events.filter((event) => event.status === "scheduled").length,
    cancelled: state.events.filter((event) => event.status === "cancelled").length,
    completed: state.events.filter((event) => event.status === "completed").length
  };
}

export function getNotificationChannelReadiness(state: AppState) {
  const reachableParents = state.users.filter((user) => user.role === "parent");
  const channelRows: Array<{ channel: NotificationChannel; label: string; status: "ok" | "warning"; detail: string }> = [
    {
      channel: "push",
      label: "Push notification channel",
      status: state.notificationPreferences.some((preference) => preference.channel === "push" && preference.enabled) ? "ok" : "warning",
      detail: "Requires stored web push subscriptions, VAPID configuration, and explicit browser permission before provider delivery."
    },
    {
      channel: "email",
      label: "Email notification channel",
      status: reachableParents.some((parent) => parent.email.includes("@")) ? "ok" : "warning",
      detail: `${reachableParents.filter((parent) => parent.email.includes("@")).length} parent email address(es) are reachable before provider approval.`
    },
    {
      channel: "sms",
      label: "SMS notification channel",
      status: reachableParents.some((parent) => parent.phone) ? "ok" : "warning",
      detail: `${reachableParents.filter((parent) => parent.phone).length} parent phone number(s) exist; urgent-only and consent checks still apply.`
    }
  ];

  return channelRows;
}

export function getScheduleNotificationWorkflow(state: AppState) {
  const scheduleNotifications = state.notifications.filter((notification) => (
    notification.notificationType === "schedule_changed" ||
    notification.notificationType === "event_cancelled" ||
    notification.notificationType === "new_event"
  ));
  const statusCounts = getNotificationStatusCounts({ ...state, notifications: scheduleNotifications });

  return {
    total: scheduleNotifications.length,
    statusCounts,
    boundary: "Schedule notifications are records for review; provider delivery remains approval-gated."
  };
}

export function applyNotificationUnsubscribe(state: AppState, input: {
  userId: string;
  channel: NotificationChannel;
  notificationType: NotificationPreferenceType;
  now: string;
}) {
  const existing = state.notificationPreferences.find((preference) => (
    preference.userId === input.userId &&
    preference.channel === input.channel &&
    preference.notificationType === input.notificationType
  ));
  const preference = {
    id: existing?.id ?? `pref-unsub-${input.userId}-${input.channel}-${input.notificationType}`,
    userId: input.userId,
    channel: input.channel,
    notificationType: input.notificationType,
    enabled: false,
    timezone: existing?.timezone ?? "America/Chicago",
    optedInAt: existing?.optedInAt,
    optedOutAt: input.now
  };

  return {
    ok: true,
    message: `${input.channel.toUpperCase()} ${input.notificationType} notifications unsubscribed for this user.`,
    state: {
      ...state,
      notificationPreferences: existing
        ? state.notificationPreferences.map((item) => item.id === existing.id ? preference : item)
        : [preference, ...state.notificationPreferences]
    }
  };
}

export function getNotificationRetryLogs(state: AppState) {
  return state.notifications
    .filter((notification) => notification.status === "failed")
    .map((notification) => ({
      notification,
      nextRetryAt: new Date(new Date(notification.createdAt).getTime() + 15 * 60 * 1000).toISOString(),
      reason: "Provider attempt failed or was suppressed; retry requires approval review."
    }));
}

export function recipientAllowsNotification(state: AppState, input: {
  userId: string;
  teamId?: string;
  channel: NotificationChannel;
  notificationType: NotificationPreferenceType;
}) {
  const preference = state.notificationPreferences.find((item) => (
    item.userId === input.userId &&
    item.channel === input.channel &&
    item.notificationType === input.notificationType &&
    (!item.teamId || !input.teamId || item.teamId === input.teamId)
  ));

  return preference?.enabled ?? input.channel !== "sms";
}

export function getDeviceManagementSummary(state: AppState) {
  const pushPreferenceUsers = new Set(state.notificationPreferences
    .filter((preference) => preference.channel === "push")
    .map((preference) => preference.userId));

  return {
    registeredUsers: pushPreferenceUsers.size,
    detail: pushPreferenceUsers.size
      ? `${pushPreferenceUsers.size} user(s) have push preference records; subscription device rows remain provider-backed.`
      : "No push device preference records are available yet."
  };
}

export function getEmailFallbackPlan(state: AppState, input: { notificationType: NotificationPreferenceType }) {
  const parentUsers = state.users.filter((user) => user.role === "parent");
  const reachable = parentUsers.filter((user) => (
    user.email.includes("@") &&
    recipientAllowsNotification(state, {
      userId: user.id,
      channel: "email",
      notificationType: input.notificationType
    })
  ));

  return {
    reachableCount: reachable.length,
    fallbackChannel: "email" as const,
    detail: `${reachable.length} parent email fallback recipient(s) are eligible after preference checks.`
  };
}

export function smsUrgencyAllowed(input: { notificationType: NotificationPreferenceType; urgent: boolean }) {
  return input.urgent && ["event_cancelled", "weather_alert"].includes(input.notificationType);
}

export function getAlertOpenRateTracking(state: AppState) {
  const sentOrRead = state.notifications.filter((notification) => notification.status === "sent" || notification.status === "read");
  const read = sentOrRead.filter((notification) => notification.status === "read");
  return {
    opened: read.length,
    deliveredOrOpened: sentOrRead.length,
    openRate: sentOrRead.length ? Math.round((read.length / sentOrRead.length) * 100) : 0
  };
}
