import {
  INITIAL_ACTIONABLE_STATE,
  canTransitionNotification,
  canTransitionParentReplayOutput,
  canTransitionWeatherAlert,
  validateTransition,
  type ActionableActorRole,
  type ActionableObjectType,
  type ActionableState,
  type NotificationActionState,
  type ParentReplayOutputState,
  type WeatherAlertActionState
} from "./state-machines";

export interface TransitionGuardInput<State extends ActionableState = ActionableState> {
  objectType: ActionableObjectType;
  objectId: string;
  from: State;
  to: State;
  actorRole: ActionableActorRole;
}

function transitionError(input: TransitionGuardInput, reason: string) {
  return new Error(
    `Invalid ${input.objectType} transition for ${input.objectId}: ${input.from} -> ${input.to} by ${input.actorRole}. ${reason}`
  );
}

export function assertInitialActionableState(input: {
  objectType: ActionableObjectType;
  objectId: string;
  state: ActionableState;
}) {
  if (input.state !== INITIAL_ACTIONABLE_STATE) {
    throw new Error(
      `Invalid ${input.objectType} initial state for ${input.objectId}: expected draft, received ${input.state}.`
    );
  }

  return input.state;
}

export function assertActionableTransition(input: TransitionGuardInput): ActionableState {
  const result = validateTransition(input.from, input.to, input.actorRole);
  if (!result.ok) throw transitionError(input, result.reason);
  return input.to;
}

export function assertNotificationTransition(input: Omit<TransitionGuardInput<NotificationActionState>, "objectType">): NotificationActionState {
  const guardInput = { ...input, objectType: "notification" as const };
  const result = validateTransition(input.from, input.to, input.actorRole);

  if (!canTransitionNotification(input.from, input.to, input.actorRole)) {
    throw transitionError(guardInput, result.reason);
  }

  return input.to;
}

export function assertWeatherAlertTransition(input: Omit<TransitionGuardInput<WeatherAlertActionState>, "objectType">): WeatherAlertActionState {
  const guardInput = { ...input, objectType: "weather_alert" as const };
  const result = validateTransition(input.from, input.to, input.actorRole);

  if (!canTransitionWeatherAlert(input.from, input.to, input.actorRole)) {
    throw transitionError(guardInput, result.reason);
  }

  return input.to;
}

export function assertParentReplayOutputTransition(input: Omit<TransitionGuardInput<ParentReplayOutputState>, "objectType">): ParentReplayOutputState {
  const guardInput = { ...input, objectType: "parent_replay" as const };
  const result = validateTransition(input.from, input.to, input.actorRole);

  if (!canTransitionParentReplayOutput(input.from, input.to, input.actorRole)) {
    throw transitionError(guardInput, result.reason);
  }

  return input.to;
}

export function transitionNotificationState(
  objectId: string,
  from: NotificationActionState,
  to: NotificationActionState,
  actorRole: ActionableActorRole
): NotificationActionState {
  return assertNotificationTransition({ objectId, from, to, actorRole });
}

export function transitionWeatherAlertState(
  objectId: string,
  from: WeatherAlertActionState,
  to: WeatherAlertActionState,
  actorRole: ActionableActorRole
): WeatherAlertActionState {
  return assertWeatherAlertTransition({ objectId, from, to, actorRole });
}

export function transitionParentReplayOutputState(
  objectId: string,
  from: ParentReplayOutputState,
  to: ParentReplayOutputState,
  actorRole: ActionableActorRole
): ParentReplayOutputState {
  return assertParentReplayOutputTransition({ objectId, from, to, actorRole });
}

export function assertNotificationStartsAsDraft(objectId: string, state: NotificationActionState) {
  return assertInitialActionableState({ objectType: "notification", objectId, state });
}

export function assertWeatherAlertStartsAsDraft(objectId: string, state: WeatherAlertActionState) {
  return assertInitialActionableState({ objectType: "weather_alert", objectId, state });
}

export function assertParentReplayOutputStartsAsDraft(objectId: string, state: ParentReplayOutputState) {
  return assertInitialActionableState({ objectType: "parent_replay", objectId, state });
}
