import { describe, expect, it } from "vitest";
import {
  buildShellAttentionBadges,
  countMissingRsvpSlots,
  countUnreadMessages,
  formatBadgeCount,
  getAttentionBadge,
  selectAdminQueueAttention
} from "./shell-attention";

describe("countMissingRsvpSlots", () => {
  const events = [
    { id: "event-1", teamId: "team-a" },
    { id: "event-2", teamId: "team-b" }
  ];
  const players = [
    { id: "player-1", teamId: "team-a" },
    { id: "player-2", teamId: "team-a" },
    { id: "player-3", teamId: "team-b" }
  ];

  it("counts only same-team player slots without an RSVP row", () => {
    const rsvps = [{ eventId: "event-1", playerId: "player-1" }];
    // event-1: player-2 missing; event-2: player-3 missing.
    expect(countMissingRsvpSlots(events, players, rsvps)).toBe(2);
  });

  it("returns zero when every slot is answered or nothing is upcoming", () => {
    expect(countMissingRsvpSlots([], players, [])).toBe(0);
    expect(countMissingRsvpSlots(events, players, [
      { eventId: "event-1", playerId: "player-1" },
      { eventId: "event-1", playerId: "player-2" },
      { eventId: "event-2", playerId: "player-3" }
    ])).toBe(0);
  });
});

describe("countUnreadMessages", () => {
  const messages = [
    { teamId: "team-a", authorUserId: "coach-1", readByUserIds: ["coach-1"] },
    { teamId: "team-a", authorUserId: "coach-1", readByUserIds: ["coach-1", "parent-1"] },
    { teamId: "team-a", authorUserId: "parent-1", readByUserIds: ["parent-1"] },
    { teamId: "team-b", authorUserId: "coach-2", readByUserIds: ["coach-2"] }
  ];

  it("counts only unread messages from others on the viewer's teams", () => {
    // Own message and the already-read message are excluded; team-b is out of scope.
    expect(countUnreadMessages(messages, "parent-1", ["team-a"])).toBe(1);
  });

  it("returns zero without a viewer or team scope", () => {
    expect(countUnreadMessages(messages, "", ["team-a"])).toBe(0);
    expect(countUnreadMessages(messages, "parent-1", [])).toBe(0);
  });
});

describe("buildShellAttentionBadges", () => {
  it("emits role-scoped badges with accessible labels and skips zero counts", () => {
    const badges = buildShellAttentionBadges({
      parentMissingRsvps: 1,
      coachMissingRsvps: 0,
      pendingRegistrations: 3,
      parentUnreadMessages: 2,
      coachUnreadMessages: 0
    });
    expect(badges).toEqual([
      { href: "/parent/rsvp", count: 1, label: "1 RSVP needs a reply", meaning: "due" },
      { href: "/admin/registrations", count: 3, label: "3 registrations awaiting review", meaning: "review" },
      { href: "/parent/messages", count: 2, label: "2 unread team messages", meaning: "unread" }
    ]);
  });

  it("uses the same selector count for admin page queues and shell badges", () => {
    const counts = {
      registrations: 2,
      familyAccess: 4,
      weatherFields: 1,
      mediaReview: 3,
      messageDelivery: 5,
      branding: 1
    };
    const queues = selectAdminQueueAttention(counts);
    const badges = buildShellAttentionBadges({ pendingRegistrations: counts.registrations, adminQueues: counts });

    for (const queue of queues.filter((item) => item.count > 0)) {
      expect(getAttentionBadge(badges, queue.href)?.count).toBe(queue.count);
    }
  });

  it("returns no badges when nothing needs attention", () => {
    expect(buildShellAttentionBadges({})).toEqual([]);
  });
});

describe("badge helpers", () => {
  it("finds badges by href and caps display counts", () => {
    const badges = buildShellAttentionBadges({ coachMissingRsvps: 120 });
    expect(getAttentionBadge(badges, "/coach/attendance")?.count).toBe(120);
    expect(getAttentionBadge(badges, "/coach")).toBeUndefined();
    expect(getAttentionBadge(undefined, "/coach/attendance")).toBeUndefined();
    expect(formatBadgeCount(120)).toBe("99+");
    expect(formatBadgeCount(7)).toBe("7");
  });
});
