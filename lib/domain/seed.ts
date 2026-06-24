import type { AppState } from "./types";

export const NOW = "2026-04-01T12:00:00.000Z";

export const sampleRosterCsv = [
  "team,division,player_first,last_initial,jersey,parent_name,parent_email,parent_phone",
  "Tiny Tigers,3U,Mason,T,7,Jordan Taylor,jordan@example.com,555-0101",
  "Tiny Tigers,3U,Avery,P,12,Riley Parker,riley@example.com,555-0102",
  "Tiny Tigers,3U,Oliver,O,12,Olivia Owen,olivia@example.com,555-0112",
  "Tiny Tigers,3U,Mason,T,7,Jordan Taylor,jordan@example.com,555-0101",
  "Green Comets,6U,Liam,R,2,Morgan Reed,morgan@example.com,555-0105",
  "Rookie Rockets,3U,Noah,B,4,Sam Brooks,sam@example.com,555-0103",
  "Happy Hawks,5U,Ella,Q,11,Pat Quinn,pat@example.com,555-0188"
].join("\n");

export const seedState: AppState = {
  organization: {
    id: "org-little-league",
    name: "Little League HQ"
  },
  activeSeason: {
    id: "season-spring-2026",
    organizationId: "org-little-league",
    name: "Spring 2026",
    status: "active",
    startsAt: "2026-03-01T00:00:00.000Z",
    endsAt: "2026-06-15T23:59:59.000Z"
  },
  users: [
    { id: "user-admin", role: "admin", name: "Org Admin", email: "admin@example.com", phone: "555-0100" },
    { id: "user-coach-taylor", role: "coach", name: "Coach Taylor", email: "coach.taylor@example.com", phone: "555-0201" },
    { id: "user-coach-rivera", role: "coach", name: "Coach Rivera", email: "coach.rivera@example.com", phone: "555-0202" },
    { id: "user-parent-jordan", role: "parent", name: "Jordan Taylor", email: "jordan@example.com", phone: "555-0101" },
    { id: "user-parent-riley", role: "parent", name: "Riley Parker", email: "riley@example.com", phone: "555-0102" }
  ],
  teams: [
    { id: "team-tigers", organizationId: "org-little-league", seasonId: "season-spring-2026", division: "3U", name: "Tiny Tigers", coachUserId: "user-coach-taylor", mascot: "Tiger Cub", primaryColor: "#f97316", secondaryColor: "#1d4ed8", themeKey: "baseball" },
    { id: "team-rockets", organizationId: "org-little-league", seasonId: "season-spring-2026", division: "3U", name: "Rookie Rockets", mascot: "Rocket", primaryColor: "#dc2626", secondaryColor: "#facc15", themeKey: "soccer" },
    { id: "team-hawks", organizationId: "org-little-league", seasonId: "season-spring-2026", division: "5U", name: "Happy Hawks", coachUserId: "user-coach-rivera", mascot: "Hawk", primaryColor: "#0f766e", secondaryColor: "#fde047", themeKey: "scouts" },
    { id: "team-comets", organizationId: "org-little-league", seasonId: "season-spring-2026", division: "6U", name: "Green Comets", mascot: "Comet", primaryColor: "#16a34a", secondaryColor: "#38bdf8", themeKey: "swim" }
  ],
  teamMemberships: [
    { id: "membership-coach-tigers", teamId: "team-tigers", userId: "user-coach-taylor", role: "coach", status: "active" },
    { id: "membership-coach-hawks", teamId: "team-hawks", userId: "user-coach-rivera", role: "coach", status: "active" },
    { id: "membership-parent-jordan", teamId: "team-tigers", userId: "user-parent-jordan", role: "parent", status: "active" },
    { id: "membership-parent-riley", teamId: "team-tigers", userId: "user-parent-riley", role: "parent", status: "active" }
  ],
  players: [
    { id: "player-mason", organizationId: "org-little-league", seasonId: "season-spring-2026", teamId: "team-tigers", firstName: "Mason", lastInitial: "T", jersey: "7" },
    { id: "player-avery", organizationId: "org-little-league", seasonId: "season-spring-2026", teamId: "team-tigers", firstName: "Avery", lastInitial: "P", jersey: "12" },
    { id: "player-noah", organizationId: "org-little-league", seasonId: "season-spring-2026", teamId: "team-rockets", firstName: "Noah", lastInitial: "B", jersey: "4" },
    { id: "player-ella", organizationId: "org-little-league", seasonId: "season-spring-2026", teamId: "team-hawks", firstName: "Ella", lastInitial: "Q", jersey: "11" },
    { id: "player-liam", organizationId: "org-little-league", seasonId: "season-spring-2026", teamId: "team-comets", firstName: "Liam", lastInitial: "R", jersey: "2" }
  ],
  guardianLinks: [
    { id: "guardian-mason", playerId: "player-mason", parentUserId: "user-parent-jordan", relationship: "father", status: "active" },
    { id: "guardian-avery", playerId: "player-avery", parentUserId: "user-parent-riley", relationship: "guardian", status: "active" },
    { id: "guardian-noah", playerId: "player-noah", parentInviteId: "invite-sam", relationship: "guardian", status: "invited" },
    { id: "guardian-ella", playerId: "player-ella", parentInviteId: "invite-pat", relationship: "guardian", status: "invited" }
  ],
  parentInvites: [
    {
      id: "invite-sam",
      organizationId: "org-little-league",
      teamId: "team-rockets",
      playerId: "player-noah",
      email: "sam@example.com",
      phone: "555-0103",
      inviteTokenHash: "hash_invite_sam",
      status: "pending",
      deliveryStatus: "sent",
      sentCount: 2,
      resendTimestamps: ["2026-04-01T10:20:00.000Z", "2026-04-01T11:20:00.000Z"],
      lastSentAt: "2026-04-01T11:20:00.000Z",
      expiresAt: "2026-04-10T23:59:59.000Z",
      createdAt: "2026-03-25T09:00:00.000Z",
      updatedAt: "2026-04-01T11:20:00.000Z"
    },
    {
      id: "invite-pat",
      organizationId: "org-little-league",
      teamId: "team-hawks",
      playerId: "player-ella",
      email: "pat@example.com",
      phone: "555-0188",
      inviteTokenHash: "hash_invite_pat",
      status: "expired",
      deliveryStatus: "failed",
      sentCount: 4,
      resendTimestamps: ["2026-03-10T09:00:00.000Z"],
      lastSentAt: "2026-03-10T09:00:00.000Z",
      expiresAt: "2026-03-20T23:59:59.000Z",
      createdAt: "2026-03-10T09:00:00.000Z",
      updatedAt: "2026-03-20T23:59:59.000Z"
    },
    {
      id: "invite-jordan",
      organizationId: "org-little-league",
      teamId: "team-tigers",
      playerId: "player-mason",
      email: "jordan@example.com",
      phone: "555-0101",
      inviteTokenHash: "hash_invite_jordan",
      status: "accepted",
      deliveryStatus: "sent",
      sentCount: 1,
      resendTimestamps: ["2026-03-12T09:00:00.000Z"],
      lastSentAt: "2026-03-12T09:00:00.000Z",
      expiresAt: "2026-03-22T23:59:59.000Z",
      acceptedAt: "2026-03-13T08:00:00.000Z",
      createdAt: "2026-03-12T09:00:00.000Z",
      updatedAt: "2026-03-13T08:00:00.000Z"
    },
    {
      id: "invite-rate-limit",
      organizationId: "org-little-league",
      teamId: "team-rockets",
      playerId: "player-noah",
      email: "limit@example.com",
      phone: "555-0191",
      inviteTokenHash: "hash_invite_limit",
      status: "pending",
      deliveryStatus: "sent",
      sentCount: 3,
      resendTimestamps: ["2026-04-01T11:05:00.000Z", "2026-04-01T11:20:00.000Z", "2026-04-01T11:40:00.000Z"],
      lastSentAt: "2026-04-01T11:40:00.000Z",
      expiresAt: "2026-04-10T23:59:59.000Z",
      createdAt: "2026-04-01T09:00:00.000Z",
      updatedAt: "2026-04-01T11:40:00.000Z"
    }
  ],
  events: [
    {
      id: "event-tigers-game",
      organizationId: "org-little-league",
      teamId: "team-tigers",
      seasonId: "season-spring-2026",
      title: "Tiny Tigers vs Rookie Rockets",
      eventType: "game",
      startsAt: "2026-04-04T09:00:00.000Z",
      endsAt: "2026-04-04T10:00:00.000Z",
      locationName: "Field 1",
      locationAddress: "100 League Way",
      status: "scheduled",
      opponent: "Rookie Rockets",
      createdAt: "2026-03-20T09:00:00.000Z",
      updatedAt: "2026-03-20T09:00:00.000Z"
    },
    {
      id: "event-tigers-practice",
      organizationId: "org-little-league",
      teamId: "team-tigers",
      seasonId: "season-spring-2026",
      title: "Tiny Tigers Practice",
      eventType: "practice",
      startsAt: "2026-04-08T18:00:00.000Z",
      endsAt: "2026-04-08T19:00:00.000Z",
      locationName: "Practice Field",
      locationAddress: "100 League Way",
      status: "scheduled",
      createdAt: "2026-03-20T09:00:00.000Z",
      updatedAt: "2026-03-20T09:00:00.000Z"
    },
    {
      id: "event-hawks-game",
      organizationId: "org-little-league",
      teamId: "team-hawks",
      seasonId: "season-spring-2026",
      title: "Happy Hawks vs Red Foxes",
      eventType: "game",
      startsAt: "2026-04-11T10:30:00.000Z",
      endsAt: "2026-04-11T11:30:00.000Z",
      locationName: "Field 3",
      locationAddress: "100 League Way",
      status: "scheduled",
      opponent: "Red Foxes",
      createdAt: "2026-03-20T09:00:00.000Z",
      updatedAt: "2026-03-20T09:00:00.000Z"
    }
  ],
  rsvps: [
    {
      id: "rsvp-avery-game",
      eventId: "event-tigers-game",
      playerId: "player-avery",
      parentUserId: "user-parent-riley",
      response: "going",
      respondedAt: "2026-04-01T09:30:00.000Z",
      createdAt: "2026-04-01T09:30:00.000Z",
      updatedAt: "2026-04-01T09:30:00.000Z"
    }
  ],
  announcements: [
    {
      id: "announcement-tigers-snacks",
      teamId: "team-tigers",
      authorUserId: "user-coach-taylor",
      title: "Opening weekend notes",
      body: "Please arrive 20 minutes early and check the snack signup after practice.",
      createdAt: "2026-03-31T18:00:00.000Z"
    }
  ],
  mediaItems: [
    { id: "media-opening", teamId: "team-tigers", title: "Opening Day Album", type: "google_photos", url: "https://photos.google.com/share/demo-opening-day", createdAt: "2026-03-30T12:00:00.000Z" },
    { id: "media-cleats", teamId: "team-tigers", title: "How to tie cleats", type: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", createdAt: "2026-03-29T12:00:00.000Z" }
  ],
  notifications: [],
  notificationPreferences: [],
  parentReplays: [],
  registrationRequests: [
    {
      id: "registration-new-mia",
      organizationId: "org-little-league",
      seasonId: "season-spring-2026",
      teamId: "team-tigers",
      parentName: "Casey Morgan",
      parentEmail: "casey@example.com",
      playerFirstName: "Mia",
      playerLastInitial: "M",
      status: "pending",
      createdAt: "2026-04-01T10:00:00.000Z"
    }
  ],
  snackScheduleSlots: [
    { id: "snack-tigers-game", teamId: "team-tigers", eventId: "event-tigers-game", assignedParentUserId: "user-parent-riley", item: "Orange slices and water", status: "assigned" },
    { id: "snack-tigers-practice", teamId: "team-tigers", eventId: "event-tigers-practice", item: "Practice snack", status: "open" }
  ],
  volunteerSignups: [
    { id: "volunteer-field-setup", teamId: "team-tigers", eventId: "event-tigers-game", role: "Field setup", status: "open" },
    { id: "volunteer-score-helper", teamId: "team-tigers", eventId: "event-tigers-game", role: "Score helper", assignedUserId: "user-parent-jordan", status: "filled" },
    { id: "volunteer-photo-helper", teamId: "team-tigers", role: "Photo helper", status: "open" }
  ],
  sponsors: [
    { id: "sponsor-league-clinic", organizationId: "org-little-league", name: "Community Sports Clinic", level: "league", url: "https://example.com/clinic", status: "active" },
    { id: "sponsor-tigers-pizza", organizationId: "org-little-league", name: "Corner Pizza", level: "team", teamId: "team-tigers", url: "https://example.com/pizza", status: "active" }
  ],
  weatherAlerts: [
    {
      id: "weather-tigers-watch",
      teamId: "team-tigers",
      eventId: "event-tigers-game",
      headline: "Light rain watch",
      detail: "Coach will confirm field status 90 minutes before first pitch.",
      severity: "watch",
      status: "draft",
      createdAt: "2026-04-01T12:00:00.000Z"
    }
  ],
  teamChatChannels: [
    {
      id: "chat-team-tigers",
      organizationId: "org-little-league",
      seasonId: "season-spring-2026",
      teamId: "team-tigers",
      pinnedMessageId: "chat-msg-tigers-coach-note",
      createdAt: "2026-03-25T12:00:00.000Z",
      updatedAt: "2026-04-01T08:15:00.000Z"
    },
    {
      id: "chat-team-hawks",
      organizationId: "org-little-league",
      seasonId: "season-spring-2026",
      teamId: "team-hawks",
      pinnedMessageId: "chat-msg-hawks-coach-note",
      createdAt: "2026-03-25T12:00:00.000Z",
      updatedAt: "2026-03-31T16:00:00.000Z"
    },
    {
      id: "chat-team-rockets",
      organizationId: "org-little-league",
      seasonId: "season-spring-2026",
      teamId: "team-rockets",
      createdAt: "2026-03-25T12:00:00.000Z",
      updatedAt: "2026-03-25T12:00:00.000Z"
    }
  ],
  chatMessages: [
    {
      id: "chat-msg-tigers-coach-note",
      channelId: "chat-team-tigers",
      organizationId: "org-little-league",
      teamId: "team-tigers",
      authorUserId: "user-coach-taylor",
      authorRole: "coach",
      kind: "announcement",
      topic: "reminder",
      body: "Coach Note: please arrive 20 minutes early Saturday. We will meet by the yellow flag near Field 1.",
      eventId: "event-tigers-game",
      pinned: true,
      moderationStatus: "visible",
      readByUserIds: ["user-coach-taylor"],
      createdAt: "2026-04-01T08:15:00.000Z"
    },
    {
      id: "chat-msg-tigers-parent-question",
      channelId: "chat-team-tigers",
      organizationId: "org-little-league",
      teamId: "team-tigers",
      authorUserId: "user-parent-jordan",
      authorRole: "parent",
      kind: "message",
      body: "Game-Day Questions: should everyone wear the blue jersey?",
      eventId: "event-tigers-game",
      pinned: false,
      moderationStatus: "visible",
      readByUserIds: ["user-parent-jordan"],
      createdAt: "2026-04-01T08:25:00.000Z"
    },
    {
      id: "chat-msg-hawks-coach-note",
      channelId: "chat-team-hawks",
      organizationId: "org-little-league",
      teamId: "team-hawks",
      authorUserId: "user-coach-rivera",
      authorRole: "coach",
      kind: "announcement",
      topic: "field_location",
      body: "Coach Note: Happy Hawks meet at Field 3 for warmups.",
      eventId: "event-hawks-game",
      pinned: true,
      moderationStatus: "visible",
      readByUserIds: ["user-coach-rivera"],
      createdAt: "2026-03-31T16:00:00.000Z"
    }
  ],
  chatModerationAuditEvents: [],
  auditEvents: [
    {
      id: "audit-seed-roster",
      actorUserId: "user-admin",
      action: "seed_loaded",
      targetType: "season",
      targetId: "season-spring-2026",
      summary: "Demo production scaffold seed data loaded.",
      createdAt: NOW
    }
  ],
  rosterImportReports: []
};
