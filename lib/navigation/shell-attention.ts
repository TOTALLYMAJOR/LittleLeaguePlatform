export interface ShellAttentionBadge {
  href: string;
  count: number;
  label: string;
  meaning: "due" | "unread" | "review";
}

export interface AdminQueueCounts {
  registrations: number;
  familyAccess: number;
  weatherFields: number;
  mediaReview: number;
  messageDelivery: number;
  branding: number;
  reportsArchive?: number;
  securityAudit?: number;
}

export interface AdminQueueAttention {
  id: string;
  label: string;
  count: number;
  href: string;
  cta: string;
}

/** One route/count contract shared by the admin page queues and shell badges. */
export function selectAdminQueueAttention(input: AdminQueueCounts): AdminQueueAttention[] {
  return [
    { id: "registrations", label: "Registrations", count: input.registrations, href: "/admin/registrations", cta: "Review registrations" },
    { id: "family-access", label: "Family Access", count: input.familyAccess, href: "/admin/family-access", cta: "Fix family access" },
    { id: "weather-fields", label: "Weather & Fields", count: input.weatherFields, href: "/admin/schedule-venues", cta: "Resolve weather and fields" },
    { id: "media-review", label: "Media Review", count: input.mediaReview, href: "/admin/media-review", cta: "Review media" },
    { id: "message-delivery", label: "Message Delivery Review", count: input.messageDelivery, href: "/admin/message-delivery-review", cta: "Approve messages" },
    { id: "branding", label: "Branding issues", count: input.branding, href: "/admin/branding", cta: "Review branding" },
    { id: "reports-archive", label: "Reports/archive tasks", count: input.reportsArchive ?? 0, href: "/admin/reports-archive", cta: "Review archive" },
    { id: "security-audit", label: "Security & Audit", count: input.securityAudit ?? 0, href: "/admin/security-audit", cta: "Review security" }
  ];
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
  adminQueues?: AdminQueueCounts;
}): ShellAttentionBadge[] {
  const badges: ShellAttentionBadge[] = [];
  if (input.parentMissingRsvps) {
    badges.push({
      href: "/parent/rsvp",
      count: input.parentMissingRsvps,
      label: `${input.parentMissingRsvps} RSVP${input.parentMissingRsvps === 1 ? "" : "s"} need${input.parentMissingRsvps === 1 ? "s" : ""} a reply`,
      meaning: "due"
    });
  }
  if (input.coachMissingRsvps) {
    badges.push({
      href: "/coach/attendance",
      count: input.coachMissingRsvps,
      label: `${input.coachMissingRsvps} player RSVP${input.coachMissingRsvps === 1 ? "" : "s"} still missing`,
      meaning: "due"
    });
  }
  if (input.pendingRegistrations) {
    badges.push({
      href: "/admin/registrations",
      count: input.pendingRegistrations,
      label: `${input.pendingRegistrations} registration${input.pendingRegistrations === 1 ? "" : "s"} awaiting review`,
      meaning: "review"
    });
  }
  if (input.parentUnreadMessages) {
    badges.push({
      href: "/parent/messages",
      count: input.parentUnreadMessages,
      label: `${input.parentUnreadMessages} unread team message${input.parentUnreadMessages === 1 ? "" : "s"}`,
      meaning: "unread"
    });
  }
  if (input.coachUnreadMessages) {
    badges.push({
      href: "/coach/messages",
      count: input.coachUnreadMessages,
      label: `${input.coachUnreadMessages} unread team message${input.coachUnreadMessages === 1 ? "" : "s"}`,
      meaning: "unread"
    });
  }
  if (input.adminQueues) {
    for (const queue of selectAdminQueueAttention(input.adminQueues)) {
      if (!queue.count || queue.id === "registrations") continue;
      badges.push({
        href: queue.href,
        count: queue.count,
        label: `${queue.count} ${queue.label.toLowerCase()} ${queue.count === 1 ? "item" : "items"} awaiting review`,
        meaning: "review"
      });
    }
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
