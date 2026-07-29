export interface ShellAttentionBadge {
  href: string;
  count: number;
  label: string;
}

export interface AttentionEventRow {
  id: string;
  teamId: string;
}

export interface AttentionPlayerRow {
  id: string;
  teamId: string;
}

export interface AttentionRsvpRow {
  eventId: string;
  playerId: string;
}

/**
 * Counts upcoming event slots where a linked player has no recorded RSVP.
 * Works for both roles: pass guardian-linked players for parents, or the
 * full team rosters for coaches.
 */
export function countMissingRsvpSlots(
  events: AttentionEventRow[],
  players: AttentionPlayerRow[],
  rsvps: AttentionRsvpRow[]
): number {
  const answered = new Set(rsvps.map((rsvp) => `${rsvp.eventId}:${rsvp.playerId}`));
  let missing = 0;
  for (const event of events) {
    for (const player of players) {
      if (player.teamId !== event.teamId) continue;
      if (!answered.has(`${event.id}:${player.id}`)) missing += 1;
    }
  }
  return missing;
}

export interface AttentionMessageRow {
  teamId: string;
  authorUserId: string;
  readByUserIds: string[];
}

/** Counts visible team-chat messages the viewer has not read and did not write. */
export function countUnreadMessages(
  messages: AttentionMessageRow[],
  viewerUserId: string,
  teamIds: string[]
): number {
  if (!viewerUserId || !teamIds.length) return 0;
  const teams = new Set(teamIds);
  return messages.filter((message) => (
    teams.has(message.teamId) &&
    message.authorUserId !== viewerUserId &&
    !message.readByUserIds.includes(viewerUserId)
  )).length;
}

export function buildShellAttentionBadges(input: {
  parentMissingRsvps?: number;
  coachMissingRsvps?: number;
  pendingRegistrations?: number;
  parentUnreadMessages?: number;
  coachUnreadMessages?: number;
}): ShellAttentionBadge[] {
  const badges: ShellAttentionBadge[] = [];
  if (input.parentMissingRsvps) {
    badges.push({
      href: "/parent/rsvp",
      count: input.parentMissingRsvps,
      label: `${input.parentMissingRsvps} RSVP${input.parentMissingRsvps === 1 ? "" : "s"} need${input.parentMissingRsvps === 1 ? "s" : ""} a reply`
    });
  }
  if (input.coachMissingRsvps) {
    badges.push({
      href: "/coach/attendance",
      count: input.coachMissingRsvps,
      label: `${input.coachMissingRsvps} player RSVP${input.coachMissingRsvps === 1 ? "" : "s"} still missing`
    });
  }
  if (input.pendingRegistrations) {
    badges.push({
      href: "/admin/registrations",
      count: input.pendingRegistrations,
      label: `${input.pendingRegistrations} registration${input.pendingRegistrations === 1 ? "" : "s"} awaiting review`
    });
  }
  if (input.parentUnreadMessages) {
    badges.push({
      href: "/parent/messages",
      count: input.parentUnreadMessages,
      label: `${input.parentUnreadMessages} unread team message${input.parentUnreadMessages === 1 ? "" : "s"}`
    });
  }
  if (input.coachUnreadMessages) {
    badges.push({
      href: "/coach/messages",
      count: input.coachUnreadMessages,
      label: `${input.coachUnreadMessages} unread team message${input.coachUnreadMessages === 1 ? "" : "s"}`
    });
  }
  return badges;
}

export function getAttentionBadge(
  badges: ShellAttentionBadge[] | undefined,
  href: string
): ShellAttentionBadge | undefined {
  return badges?.find((badge) => badge.href === href);
}

export function formatBadgeCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}
