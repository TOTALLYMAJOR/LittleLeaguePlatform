import type { AppState } from "./types";

export function getPrivacyFilters() {
  return [
    "Remove child names from analytics exports unless explicitly needed.",
    "Aggregate parent engagement before showing coach/admin metrics.",
    "Keep provider, chat, and media audit details role-scoped."
  ];
}

export function getInviteAcceptanceRate(state: AppState) {
  const total = state.parentInvites.length;
  const accepted = state.parentInvites.filter((invite) => invite.status === "accepted").length;
  return total ? Math.round((accepted / total) * 100) : 0;
}

export function getAverageInviteToAccountTimeHours(state: AppState) {
  const accepted = state.parentInvites.filter((invite) => invite.acceptedAt);
  if (!accepted.length) return 0;
  const totalHours = accepted.reduce((total, invite) => total + ((Date.parse(invite.acceptedAt!) - Date.parse(invite.createdAt)) / 36e5), 0);
  return Math.round(totalHours / accepted.length);
}

export function getFailedInviteCount(state: AppState) {
  return state.parentInvites.filter((invite) => invite.deliveryStatus === "failed").length;
}

export function getParentLinkCompletionRate(state: AppState) {
  const total = state.guardianLinks.length;
  const active = state.guardianLinks.filter((link) => link.status === "active").length;
  return total ? Math.round((active / total) * 100) : 0;
}

export function getRsvpResponseRate(state: AppState) {
  const eventPlayerPairs = state.events.flatMap((event) => state.players.filter((player) => player.teamId === event.teamId).map((player) => `${event.id}:${player.id}`));
  const responded = new Set(state.rsvps.map((rsvp) => `${rsvp.eventId}:${rsvp.playerId}`));
  return eventPlayerPairs.length ? Math.round((eventPlayerPairs.filter((pair) => responded.has(pair)).length / eventPlayerPairs.length) * 100) : 0;
}

export function getScheduleAlertOpenRate(state: AppState) {
  const scheduleAlerts = state.notifications.filter((notification) => notification.notificationType === "schedule_changed" || notification.notificationType === "event_cancelled");
  const opened = scheduleAlerts.filter((notification) => notification.status === "read").length;
  return scheduleAlerts.length ? Math.round((opened / scheduleAlerts.length) * 100) : 0;
}

export function getWeeklyActiveParents(state: AppState) {
  return new Set([
    ...state.rsvps.map((rsvp) => rsvp.parentUserId),
    ...state.chatMessages.filter((message) => message.authorRole === "parent").map((message) => message.authorUserId)
  ]).size;
}

export function getSupportRequestsPerTeam(state: AppState) {
  return state.teams.map((team) => ({ teamId: team.id, count: 0 }));
}

export function getCsvImportErrorRate(state: AppState) {
  const latest = state.rosterImportReports[0];
  if (!latest) return 0;
  const total = latest.validRows + latest.warningRows + latest.errorRows;
  return total ? Math.round((latest.errorRows / total) * 100) : 0;
}

export function getCoachWeeklyUpdateSendRate(state: AppState) {
  const drafts = state.notifications.filter((notification) => notification.notificationType === "team_broadcast");
  const sent = drafts.filter((notification) => notification.status === "sent" || notification.status === "read").length;
  return drafts.length ? Math.round((sent / drafts.length) * 100) : 0;
}

export function getGameDayCalmModeUsage(state: AppState) {
  return state.events.filter((event) => event.eventType === "game").length;
}

export function getParentReplayCompletionRate(state: AppState) {
  const totalFamilies = state.guardianLinks.filter((link) => link.status === "active").length;
  const completedFamilies = state.parentReplays.reduce((total, replay) => total + replay.microCoachingStreak.completedFamilies, 0);
  const cappedCompletions = Math.min(totalFamilies, completedFamilies);
  return totalFamilies ? Math.round((cappedCompletions / totalFamilies) * 100) : 0;
}

export function getMicroCoachingStreakRate(state: AppState) {
  const latestReplay = state.parentReplays[0];
  return latestReplay?.microCoachingStreak.completionRate ?? 0;
}

export function getMediaEngagementRate(state: AppState) {
  const visibleItems = state.mediaItems.filter((item) => (item.moderationStatus ?? "approved") === "approved").length;
  return state.mediaItems.length ? Math.round((visibleItems / state.mediaItems.length) * 100) : 0;
}

export function getNotificationOptOutRate(state: AppState) {
  const total = state.notificationPreferences.length;
  const optedOut = state.notificationPreferences.filter((preference) => !preference.enabled || preference.optedOutAt).length;
  return total ? Math.round((optedOut / total) * 100) : 0;
}
