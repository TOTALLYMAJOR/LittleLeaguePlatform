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
