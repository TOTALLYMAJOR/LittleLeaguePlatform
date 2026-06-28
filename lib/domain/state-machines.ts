import type { UserRole } from "./contracts";

export const ACTIONABLE_OBJECT_TYPES = ["notification", "weather_alert", "parent_replay"] as const;
export type ActionableObjectType = (typeof ACTIONABLE_OBJECT_TYPES)[number];

export const ACTIONABLE_STATES = ["draft", "approved", "queued", "sent", "failed", "read", "rejected"] as const;
export type ActionableState = (typeof ACTIONABLE_STATES)[number];

export type NotificationActionState = ActionableState;
export type WeatherAlertActionState = Exclude<ActionableState, "read">;
export type ParentReplayOutputState = Exclude<ActionableState, "read">;

export type ActionableActorRole = UserRole | "system";

export interface ActionableTransition {
  from: ActionableState;
  to: ActionableState;
  actorRole: ActionableActorRole;
}

export interface ActionableTransitionResult {
  ok: boolean;
  from: ActionableState;
  to: ActionableState;
  actorRole: ActionableActorRole;
  reason: string;
}

export const INITIAL_ACTIONABLE_STATE = "draft" satisfies ActionableState;

const staffRoles = new Set<ActionableActorRole>(["admin", "coach"]);
const readRoles = new Set<ActionableActorRole>(["admin", "coach", "parent", "system"]);

function isStaffRole(actorRole: ActionableActorRole) {
  return staffRoles.has(actorRole);
}

function isSystemRole(actorRole: ActionableActorRole) {
  return actorRole === "system";
}

function isReadRole(actorRole: ActionableActorRole) {
  return readRoles.has(actorRole);
}

export function initialActionableState(): typeof INITIAL_ACTIONABLE_STATE {
  return INITIAL_ACTIONABLE_STATE;
}

export function canDraft(from: ActionableState, actorRole: ActionableActorRole) {
  return from === "rejected" && isStaffRole(actorRole);
}

export function canApprove(from: ActionableState, actorRole: ActionableActorRole) {
  return (from === "draft" || from === "failed") && isStaffRole(actorRole);
}

export function canReject(from: ActionableState, actorRole: ActionableActorRole) {
  return (from === "draft" || from === "approved" || from === "failed") && isStaffRole(actorRole);
}

export function canQueue(from: ActionableState, actorRole: ActionableActorRole) {
  return from === "approved" && (isStaffRole(actorRole) || isSystemRole(actorRole));
}

export function canSend(from: ActionableState, actorRole: ActionableActorRole) {
  return (from === "approved" || from === "queued") && isSystemRole(actorRole);
}

export function canFail(from: ActionableState, actorRole: ActionableActorRole) {
  return (from === "approved" || from === "queued") && isSystemRole(actorRole);
}

export function canRead(from: ActionableState, actorRole: ActionableActorRole) {
  return from === "sent" && isReadRole(actorRole);
}

export function canTransition(from: ActionableState, to: ActionableState, actorRole: ActionableActorRole) {
  if (from === "sent" && to !== "read") return false;
  if (to === "sent") return canSend(from, actorRole);
  if (from === to) return true;

  switch (to) {
    case "draft":
      return canDraft(from, actorRole);
    case "approved":
      return canApprove(from, actorRole);
    case "queued":
      return canQueue(from, actorRole);
    case "failed":
      return canFail(from, actorRole);
    case "read":
      return canRead(from, actorRole);
    case "rejected":
      return canReject(from, actorRole);
    default:
      return false;
  }
}

export function validateTransition(from: ActionableState, to: ActionableState, actorRole: ActionableActorRole): ActionableTransitionResult {
  const ok = canTransition(from, to, actorRole);

  return {
    ok,
    from,
    to,
    actorRole,
    reason: ok
      ? `${actorRole} can transition ${from} to ${to}.`
      : `${actorRole} cannot transition ${from} to ${to}.`
  };
}

export function transitionActionableState(from: ActionableState, to: ActionableState, actorRole: ActionableActorRole) {
  return canTransition(from, to, actorRole) ? to : from;
}

export function canTransitionNotification(from: NotificationActionState, to: NotificationActionState, actorRole: ActionableActorRole) {
  return canTransition(from, to, actorRole);
}

export function canTransitionWeatherAlert(from: WeatherAlertActionState, to: WeatherAlertActionState, actorRole: ActionableActorRole) {
  return canTransition(from, to, actorRole);
}

export function canTransitionParentReplayOutput(from: ParentReplayOutputState, to: ParentReplayOutputState, actorRole: ActionableActorRole) {
  return canTransition(from, to, actorRole);
}

export function isInitialActionableState(state: ActionableState): state is typeof INITIAL_ACTIONABLE_STATE {
  return state === INITIAL_ACTIONABLE_STATE;
}

export function isDraftActionable(state: ActionableState): state is "draft" {
  return state === "draft";
}

export function isApprovedActionable(state: ActionableState): state is "approved" {
  return state === "approved";
}

export function isQueuedActionable(state: ActionableState): state is "queued" {
  return state === "queued";
}

export function isSentActionable(state: ActionableState): state is "sent" {
  return state === "sent";
}

export function isFailedActionable(state: ActionableState): state is "failed" {
  return state === "failed";
}

export function isReadActionable(state: ActionableState): state is "read" {
  return state === "read";
}

export function isRejectedActionable(state: ActionableState): state is "rejected" {
  return state === "rejected";
}

export function isSystemOnlyTransition(to: ActionableState) {
  return to === "sent" || to === "failed";
}

export function assertTransition(from: ActionableState, to: ActionableState, actorRole: ActionableActorRole) {
  if (!canTransition(from, to, actorRole)) {
    throw new Error(`${actorRole} cannot transition ${from} to ${to}.`);
  }
  return to;
}
