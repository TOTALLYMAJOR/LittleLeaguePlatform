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

export function getVolunteerReminders(state: AppState, teamId: string) {
  return state.volunteerSignups
    .filter((signup) => signup.teamId === teamId)
    .map((signup) => ({
      id: `volunteer-reminder-${signup.id}`,
      title: signup.status === "open" ? "Volunteer role open" : "Volunteer reminder",
      detail: `${signup.role} is ${signup.status}.`
    }));
}

export function cancelVolunteerSignup(state: AppState, signupId: string, reason: string) {
  return {
    ok: true,
    message: `Volunteer signup ${signupId} cancelled: ${reason}`,
    state: {
      ...state,
      volunteerSignups: state.volunteerSignups.map((signup) => signup.id === signupId ? { ...signup, status: "open" as const, assignedUserId: undefined } : signup)
    }
  };
}

export function getVolunteerApprovalPolicies() {
  return [
    "Coach/admin review is required before assigning sensitive volunteer roles.",
    "Filled volunteer roles can be reopened when a parent cancels.",
    "Approval policy changes should be audited before reminders are sent."
  ];
}

export function getSnackVolunteerFairness(state: AppState, teamId: string) {
  const snackAssignments = state.snackScheduleSlots.filter((slot) => slot.teamId === teamId && slot.assignedParentUserId).length;
  const volunteerAssignments = state.volunteerSignups.filter((signup) => signup.teamId === teamId && signup.assignedUserId).length;
  return {
    snackAssignments,
    volunteerAssignments,
    balanceScore: Math.abs(snackAssignments - volunteerAssignments)
  };
}

export function getDutyRotation(state: AppState, teamId: string) {
  const parentIds = Array.from(new Set(state.teamMemberships
    .filter((membership) => membership.teamId === teamId && membership.role === "parent" && membership.status === "active")
    .map((membership) => membership.userId)));
  return parentIds.map((parentUserId, index) => ({
    parentUserId,
    order: index + 1,
    nextDuty: index % 2 === 0 ? "snack" : "volunteer"
  }));
}

export function getFamilyOptOuts(state: AppState, teamId: string) {
  return state.teamMemberships
    .filter((membership) => membership.teamId === teamId && membership.role === "parent" && membership.status === "active")
    .map((membership) => ({
      parentUserId: membership.userId,
      optedOut: false,
      reason: "No opt-out recorded."
    }));
}

export function getSiblingAwareDutyAssignments(state: AppState, teamId: string) {
  const rotation = getDutyRotation(state, teamId);
  return rotation.map((entry) => ({
    ...entry,
    siblingGroupKey: entry.parentUserId
  }));
}

export function getMissedSlotTracking(state: AppState, teamId: string) {
  return state.snackScheduleSlots
    .filter((slot) => slot.teamId === teamId && slot.status === "open" && new Date(state.events.find((event) => event.id === slot.eventId)?.startsAt ?? "2999-01-01").getTime() < Date.now())
    .map((slot) => ({
      id: `missed-${slot.id}`,
      slotId: slot.id,
      detail: `${slot.item} was not claimed before the event.`
    }));
}
