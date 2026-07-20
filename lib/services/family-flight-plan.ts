import type { EventType, LeagueEvent } from "@/lib/domain";

export interface FamilyFlightConflictInput {
  playerId: string;
  playerName: string;
  event: Pick<LeagueEvent, "id" | "startsAt" | "endsAt">;
}

export interface FamilyFlightConflict {
  leftPlayerId: string;
  rightPlayerId: string;
  leftPlayerName: string;
  rightPlayerName: string;
  leftEventId: string;
  rightEventId: string;
}

export function findFamilyFlightConflicts(legs: FamilyFlightConflictInput[]) {
  return legs.flatMap((left, index) => legs.slice(index + 1)
    .filter((right) => left.playerId !== right.playerId)
    .filter((right) => (
      Date.parse(left.event.startsAt) < Date.parse(right.event.endsAt) &&
      Date.parse(left.event.endsAt) > Date.parse(right.event.startsAt)
    ))
    .map((right): FamilyFlightConflict => ({
      leftPlayerId: left.playerId,
      rightPlayerId: right.playerId,
      leftPlayerName: left.playerName,
      rightPlayerName: right.playerName,
      leftEventId: left.event.id,
      rightEventId: right.event.id
    })));
}

export function familyEventGear(eventType: EventType) {
  if (eventType === "game") return "Uniform · glove · water";
  if (eventType === "practice") return "Practice gear · water";
  return "Team-event details · water";
}
