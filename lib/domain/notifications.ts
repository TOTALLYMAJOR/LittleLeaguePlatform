import type { AppState, NotificationChannel } from "./types";

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
