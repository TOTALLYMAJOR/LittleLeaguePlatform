import type { AppState } from "./types";

export function getSnackConflicts(state: AppState, teamId: string) {
  const slots = state.snackScheduleSlots.filter((slot) => slot.teamId === teamId);
  return slots.filter((slot, index) => (
    slot.assignedParentUserId &&
    slots.findIndex((candidate) => candidate.assignedParentUserId === slot.assignedParentUserId && candidate.eventId === slot.eventId) !== index
  ));
}

export function getSnackAuditTrail(state: AppState, teamId: string) {
  return state.snackScheduleSlots
    .filter((slot) => slot.teamId === teamId)
    .map((slot) => ({
      id: `snack-audit-${slot.id}`,
      summary: `${slot.item} is ${slot.status}${slot.assignedParentUserId ? ` by ${slot.assignedParentUserId}` : ""}.`
    }));
}

export function cancelSnackSlot(state: AppState, slotId: string, reason: string) {
  return {
    ok: true,
    message: `Snack slot ${slotId} cancelled: ${reason}`,
    state: {
      ...state,
      snackScheduleSlots: state.snackScheduleSlots.map((slot) => slot.id === slotId ? { ...slot, status: "open" as const, assignedParentUserId: undefined } : slot)
    }
  };
}

export function getVolunteerRoleCaps(state: AppState, teamId: string) {
  const roles = state.volunteerSignups.filter((signup) => signup.teamId === teamId);
  return Array.from(new Set(roles.map((signup) => signup.role))).map((role) => ({
    role,
    filled: roles.filter((signup) => signup.role === role && signup.status === "filled").length,
    cap: 1
  }));
}
