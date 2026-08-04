import type {
  AppState,
  EventType,
  LeagueEvent,
  MediaItem,
  Player,
  RegistrationRequest,
  Rsvp,
  Sponsor,
  Team
} from "@/lib/domain";
import {
  buildActionPriority,
  compareActionPriority,
  createDataFreshness,
  rollupOperationalTruth,
  type ActionPriority,
  type OperationalTruth,
  type TruthEvidence
} from "@/lib/operational-truth";
import { selectAdminQueueAttention } from "@/lib/navigation/shell-attention";

export type SeasonCertaintyRole = "parent" | "coach" | "admin";
export type SeasonCardState =
  | "loading"
  | "empty"
  | "ready"
  | "needs_attention"
  | "urgent"
  | "error"
  | "permission_denied"
  | "offline_stale";

export type SeasonFreshnessState = "live" | "fallback" | "cached" | "offline_stale";
export type EventCertaintyStatus = "scheduled" | "changed" | "canceled" | "postponed";
export type ReadinessState = "ready" | "needs_attention" | "blocked" | "unknown";

export interface SeasonViewerContext {
  role: SeasonCertaintyRole;
  signedIn: boolean;
  status: string;
  message: string;
  canViewPrivateData: boolean;
  scopeLabel: string;
}

export interface SeasonTeamContext {
  id?: string;
  name: string;
  division?: string;
  season?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface NextEventCertainty {
  id?: string;
  type: EventType | "meeting" | "other";
  title: string;
  opponent?: string;
  startsAt?: string;
  timeLabel: string;
  arrivalLabel?: string;
  venue: string;
  field?: string;
  address?: string;
  directionsUrl?: string;
  status: EventCertaintyStatus;
  statusLabel: string;
  lastUpdated?: string;
  freshnessState: SeasonFreshnessState;
}

export interface RsvpLineItem {
  playerId: string;
  playerName: string;
  status: "going" | "not_going" | "maybe" | "cancelled" | "no_reply";
  label: string;
}

export interface CoachAttendanceSnapshot {
  confirmed: number;
  declined: number;
  maybe: number;
  noReply: number;
  missingReplies: string[];
}

export interface TeamReadinessSnapshot {
  overallState: ReadinessState;
  overallLabel: string;
  operationalTruth: OperationalTruth;
  snackCoverage: SeasonCardState;
  volunteerCoverage: SeasonCardState;
  weatherStatus: SeasonCardState;
  fieldStatus: SeasonCardState;
  coachUpdateStatus: SeasonCardState;
  guardianAccessStatus: SeasonCardState;
  mediaReviewStatus: SeasonCardState;
  providerReviewStatus: SeasonCardState;
  aiDraftReviewStatus: SeasonCardState;
  summary: string;
}

export interface SeasonChangeItem {
  id: string;
  label: string;
  before?: string;
  after?: string;
  timeAgo: string;
  severity: "info" | "attention" | "urgent";
  sourceLabel?: string;
}

export interface SeasonActionItem {
  id: string;
  label: string;
  description: string;
  cta: string;
  href: string;
  priority: "primary" | "secondary" | "urgent";
  permissionState: SeasonCardState;
  ranking?: ActionPriority;
}

export interface SeasonFreshness {
  state: SeasonFreshnessState;
  label: string;
  lastLoadedLabel: string;
  staleCopy?: string;
}

export interface ParentSeasonCertaintyView {
  viewer: SeasonViewerContext;
  team: SeasonTeamContext;
  nextEvent: NextEventCertainty;
  rsvp: {
    rows: RsvpLineItem[];
    neededCount: number;
    summary: string;
  };
  readiness: TeamReadinessSnapshot;
  operationalTruth: OperationalTruth;
  changes: SeasonChangeItem[];
  actions: SeasonActionItem[];
  coachUpdate?: {
    title: string;
    body: string;
    href: string;
    timeLabel: string;
  };
  messages: {
    unreadCount: number;
    href: string;
  };
  photos: {
    newApprovedCount: number;
    latestTitle?: string;
    href: string;
  };
  privacyCopy: string;
  freshness: SeasonFreshness;
}

export interface CoachSeasonCertaintyView {
  viewer: SeasonViewerContext;
  team: SeasonTeamContext;
  nextEvent: NextEventCertainty;
  attendance: CoachAttendanceSnapshot;
  readiness: TeamReadinessSnapshot;
  operationalTruth: OperationalTruth;
  changes: SeasonChangeItem[];
  actions: SeasonActionItem[];
  weather: {
    title: string;
    detail: string;
    state: SeasonCardState;
  };
  drafts: {
    count: number;
    reviewOnlyCopy: string;
    href: string;
  };
  practiceRecap: {
    title: string;
    statusLabel: string;
    href: string;
  };
  freshness: SeasonFreshness;
}

export interface AdminTeamStatusRow {
  teamId: string;
  teamName: string;
  division: string;
  nextEvent: string;
  rsvpConfidence: string;
  familyAccess: string;
  snacksVolunteers: string;
  weatherField: string;
  media: string;
  setup: string;
  status: ReadinessState;
  primaryAction: SeasonActionItem;
}

export interface AdminSeasonCertaintyView {
  viewer: SeasonViewerContext;
  organizationName: string;
  health: {
    teamsNeedingHelp: number;
    lowRsvpTeams: number;
    brokenFamilyAccess: number;
    pendingRegistrations: number;
    weatherFieldReview: number;
    mediaReview: number;
    messageDeliveryReview: number;
    setupGaps: number;
    securityAuditStatus: SeasonCardState;
  };
  operationalTruth: OperationalTruth;
  pendingQueues: SeasonActionItem[];
  teamRows: AdminTeamStatusRow[];
  registrationQueue: {
    count: number;
    href: string;
  };
  security: {
    status: SeasonCardState;
    detail: string;
    href: string;
  };
  freshness: SeasonFreshness;
}

export type SeasonCertaintyView =
  | ParentSeasonCertaintyView
  | CoachSeasonCertaintyView
  | AdminSeasonCertaintyView;

export function buildParentSeasonCertaintyView(input: {
  state: AppState;
  parentUserId: string;
  accessStatus: string;
  message: string;
  isSupabaseBacked: boolean;
  now: string;
}): ParentSeasonCertaintyView {
  const signedIn = input.accessStatus !== "signed_out";
  const canViewPrivateData = input.accessStatus === "live";
  const links = input.state.guardianLinks.filter((link) => link.parentUserId === input.parentUserId && link.status === "active");
  const linkedPlayerIds = new Set(links.map((link) => link.playerId));
  const children = input.state.players.filter((player) => linkedPlayerIds.has(player.id));
  const teamIds = new Set(children.map((player) => player.teamId));
  const teams = input.state.teams.filter((team) => teamIds.has(team.id));
  const nextEvent = findNextEvent(input.state.events.filter((event) => teamIds.has(event.teamId)), input.now);
  const primaryTeam = teams.find((team) => team.id === nextEvent?.teamId) ?? teams[0];
  const rsvpRows = nextEvent
    ? children
      .filter((player) => player.teamId === nextEvent.teamId)
      .map((player) => buildRsvpLineItem(player, input.state.rsvps.find((rsvp) => rsvp.eventId === nextEvent.id && rsvp.playerId === player.id)))
    : children.map((player) => ({
      playerId: player.id,
      playerName: formatPlayerName(player),
      status: "no_reply" as const,
      label: "No upcoming RSVP"
    }));
  const missingRsvps = rsvpRows.filter((row) => row.status === "no_reply");
  const teamEvents = input.state.events.filter((event) => teamIds.has(event.teamId));
  const weatherAlert = nextEvent ? input.state.weatherAlerts.find((alert) => alert.eventId === nextEvent.id) : undefined;
  const openSnackSlots = input.state.snackScheduleSlots.filter((slot) => teamIds.has(slot.teamId) && slot.status === "open");
  const openVolunteerRoles = input.state.volunteerSignups.filter((signup) => teamIds.has(signup.teamId) && signup.status === "open");
  const approvedMedia = input.state.mediaItems.filter((item) => teamIds.has(item.teamId) && (item.moderationStatus ?? "approved") === "approved");
  const latestAnnouncement = input.state.announcements
    .filter((announcement) => teamIds.has(announcement.teamId))
    .sort(byNewestCreatedAt)[0];
  const changes = buildScheduleChanges(teamEvents, input.now);
  if (latestAnnouncement) {
    changes.push({
      id: latestAnnouncement.id,
      label: `Coach added ${latestAnnouncement.title}`,
      timeAgo: timeAgo(latestAnnouncement.createdAt, input.now),
      severity: "info",
      sourceLabel: "Coach update"
    });
  }
  const readiness = buildReadinessSnapshot({
    snackOpen: openSnackSlots.length,
    volunteerOpen: openVolunteerRoles.length,
    weatherReview: weatherAlert ? 1 : 0,
    fieldNeedsReview: nextEvent && isEventChanged(nextEvent) ? 1 : 0,
    coachUpdateMissing: latestAnnouncement ? 0 : 1,
    guardianIssues: children.length ? 0 : 1,
    mediaReview: 0,
    providerReview: 0,
    aiDrafts: 0,
    hasEvent: Boolean(nextEvent),
    venueAvailable: Boolean(nextEvent?.locationName && nextEvent?.locationAddress && nextEvent.locationAddress !== "Address TBD"),
    weatherEvidenceAvailable: Boolean(weatherAlert),
    isLive: input.isSupabaseBacked,
    now: input.now
  });
  const actions = buildParentActions({
    missingRsvps,
    nextEvent,
    openSnackSlots: openSnackSlots.length,
    openVolunteerRoles: openVolunteerRoles.length,
    hasNotificationPreference: input.state.notificationPreferences.some((preference) => (
      preference.userId === input.parentUserId &&
      preference.notificationType === "schedule_changed" &&
      (!preference.teamId || teamIds.has(preference.teamId))
    )),
    hasGuardianAccess: children.length > 0
  });

  return {
    viewer: {
      role: "parent",
      signedIn,
      status: input.accessStatus,
      message: input.message,
      canViewPrivateData,
      scopeLabel: canViewPrivateData ? "Scoped to linked children and teams." : "Private rows hidden until family access is active."
    },
    team: buildTeamContext(primaryTeam, input.state),
    nextEvent: buildNextEventCertainty(nextEvent, input.now, input.isSupabaseBacked),
    rsvp: {
      rows: rsvpRows,
      neededCount: missingRsvps.length,
      summary: missingRsvps.length
        ? `${missingRsvps.length} RSVP ${missingRsvps.length === 1 ? "needs" : "need"} a response.`
        : "RSVPs are answered for linked children."
    },
    readiness,
    operationalTruth: readiness.operationalTruth,
    changes: changes.sort((left, right) => severityRank(right.severity) - severityRank(left.severity)).slice(0, 4),
    actions: actions.slice(0, 4),
    coachUpdate: latestAnnouncement ? {
      title: latestAnnouncement.title,
      body: latestAnnouncement.body,
      href: "/parent/practice-recaps",
      timeLabel: timeAgo(latestAnnouncement.createdAt, input.now)
    } : undefined,
    messages: {
      unreadCount: 0,
      href: "/parent/messages"
    },
    photos: {
      newApprovedCount: approvedMedia.length,
      latestTitle: approvedMedia.sort(byNewestCreatedAt)[0]?.title,
      href: "/parent/photos"
    },
    privacyCopy: "Your family's info is private to your team.",
    freshness: buildFreshness(input.isSupabaseBacked, input.now)
  };
}

export function buildCoachSeasonCertaintyView(input: {
  state: AppState;
  coachUserId: string;
  accessStatus: string;
  message: string;
  isSupabaseBacked: boolean;
  now: string;
}): CoachSeasonCertaintyView {
  const signedIn = input.accessStatus !== "signed_out";
  const canViewPrivateData = input.accessStatus === "live";
  const assignedTeamIds = new Set(input.state.teamMemberships
    .filter((membership) => membership.userId === input.coachUserId && membership.role === "coach" && membership.status === "active")
    .map((membership) => membership.teamId));
  const teams = input.state.teams.filter((team) => assignedTeamIds.has(team.id));
  const teamEvents = input.state.events.filter((event) => assignedTeamIds.has(event.teamId));
  const nextEvent = findNextEvent(teamEvents, input.now);
  const primaryTeam = teams.find((team) => team.id === nextEvent?.teamId) ?? teams[0];
  const players = input.state.players.filter((player) => primaryTeam ? player.teamId === primaryTeam.id : assignedTeamIds.has(player.teamId));
  const attendance = buildCoachAttendance(players, nextEvent, input.state.rsvps);
  const weatherAlerts = input.state.weatherAlerts.filter((alert) => assignedTeamIds.has(alert.teamId));
  const nextWeather = nextEvent
    ? weatherAlerts.find((alert) => alert.eventId === nextEvent.id)
    : weatherAlerts[0];
  const openSnackSlots = input.state.snackScheduleSlots.filter((slot) => assignedTeamIds.has(slot.teamId) && slot.status === "open");
  const openVolunteerRoles = input.state.volunteerSignups.filter((signup) => assignedTeamIds.has(signup.teamId) && signup.status === "open");
  const changes = buildScheduleChanges(teamEvents, input.now);
  const draftCount = input.state.notifications.filter((notification) => (
    assignedTeamIds.has(notification.teamId) &&
    notification.status === "pending" &&
    ["parent_replay_ready", "team_broadcast"].includes(notification.notificationType)
  )).length;
  const readiness = buildReadinessSnapshot({
    snackOpen: openSnackSlots.length,
    volunteerOpen: openVolunteerRoles.length,
    weatherReview: nextWeather ? 1 : 0,
    fieldNeedsReview: nextEvent && isEventChanged(nextEvent) ? 1 : 0,
    coachUpdateMissing: input.state.announcements.some((announcement) => assignedTeamIds.has(announcement.teamId)) ? 0 : 1,
    guardianIssues: 0,
    mediaReview: input.state.mediaItems.filter((item) => assignedTeamIds.has(item.teamId) && item.moderationStatus === "pending").length,
    providerReview: input.state.notifications.filter((notification) => assignedTeamIds.has(notification.teamId) && notification.status === "pending").length,
    aiDrafts: draftCount,
    hasEvent: Boolean(nextEvent),
    venueAvailable: Boolean(nextEvent?.locationName && nextEvent?.locationAddress && nextEvent.locationAddress !== "Address TBD"),
    weatherEvidenceAvailable: Boolean(nextWeather),
    isLive: input.isSupabaseBacked,
    now: input.now
  });
  const actions = buildCoachActions({
    noReply: attendance.noReply,
    weatherReview: nextWeather ? 1 : 0,
    helpCoverageOpen: openSnackSlots.length + openVolunteerRoles.length,
    nextEvent
  });

  return {
    viewer: {
      role: "coach",
      signedIn,
      status: input.accessStatus,
      message: input.message,
      canViewPrivateData,
      scopeLabel: canViewPrivateData ? "Scoped to assigned coach teams." : "Private rows hidden until coach membership is active."
    },
    team: buildTeamContext(primaryTeam, input.state),
    nextEvent: buildNextEventCertainty(nextEvent, input.now, input.isSupabaseBacked),
    attendance,
    readiness,
    operationalTruth: readiness.operationalTruth,
    changes,
    actions,
    weather: {
      title: nextWeather?.headline ?? "No weather draft needs review",
      detail: nextWeather?.detail ?? "Weather and field status stay in review until a coach or admin confirms a change.",
      state: nextWeather ? "needs_attention" : "empty"
    },
    drafts: {
      count: draftCount,
      reviewOnlyCopy: "Drafts stay Preview, Edit, Approve, Publish. No autonomous publish or provider send.",
      href: "/coach/drafts"
    },
    practiceRecap: {
      title: primaryTeam ? `${primaryTeam.name} practice recap` : "Practice recap",
      statusLabel: draftCount ? "Review draft" : "Create recap",
      href: "/coach/practice-recaps"
    },
    freshness: buildFreshness(input.isSupabaseBacked, input.now)
  };
}

export function buildAdminSeasonCertaintyView(input: {
  state: AppState;
  registrationRequests: RegistrationRequest[];
  sponsors: Sponsor[];
  mediaItems: MediaItem[];
  message: string;
  now: string;
}): AdminSeasonCertaintyView {
  const teams = input.state.teams;
  const rows = teams.map((team) => buildAdminTeamStatusRow(input.state, team, input.now));
  const pendingRegistrations = input.registrationRequests.filter((request) => request.status === "pending").length;
  const mediaReview = input.mediaItems.filter((item) => item.moderationStatus === "pending" || (item.reportCount ?? 0) > 0).length;
  const pendingSponsors = input.sponsors.filter((sponsor) => sponsor.status === "pending").length;
  const messageDeliveryReview = input.state.notifications.filter((notification) => notification.status === "pending").length;
  const weatherFieldReview = input.state.weatherAlerts.filter((alert) => alert.status === "draft").length;
  const brokenFamilyAccess = input.state.players.filter((player) => !input.state.guardianLinks.some((link) => link.playerId === player.id && link.status === "active")).length;
  const lowRsvpTeams = rows.filter((row) => row.status !== "ready").length;
  const setupGaps = teams.filter((team) => !team.coachUserId).length;
  const pendingQueues = selectAdminQueueAttention({
    registrations: pendingRegistrations,
    familyAccess: brokenFamilyAccess,
    weatherFields: weatherFieldReview,
    mediaReview,
    messageDelivery: messageDeliveryReview,
    branding: pendingSponsors
  }).map((queue) => queueAction(queue)).sort((left, right) => compareActionPriority(
    { id: left.id, createdAt: input.now, priority: left.ranking! },
    { id: right.id, createdAt: input.now, priority: right.ranking! }
  ));
  const adminFreshness = buildFreshness(false, input.now);
  const operationalTruth = rollupOperationalTruth({
    positiveSummary: "Launch evidence is current and no critical blockers are recorded.",
    failedSummary: "Launch blockers need administrator action.",
    verificationSummary: "Launch readiness needs verification.",
    evidence: [
      evidenceLane("record", "Active teams and season records are available", teams.length > 0, true, "organization records", input.now),
      evidenceLane("approval", "Family access and setup blockers are cleared", brokenFamilyAccess + setupGaps === 0, true, "membership and team records", input.now),
      evidenceLane("publication", "Registration and review queues are clear", pendingRegistrations + mediaReview === 0, false, "review queues", input.now),
      evidenceLane("delivery", "Provider delivery review is clear", messageDeliveryReview === 0, false, "notification records", input.now),
      {
        category: "freshness",
        label: adminFreshness.label,
        evidenceAvailable: false,
        satisfied: null,
        critical: true,
        source: "admin client read model",
        observedAt: input.now,
        freshness: createDataFreshness({
          source: "fallback",
          observedAt: input.now,
          expiresAfterMs: 5 * 60 * 1000,
          now: input.now
        }),
        recoveryAction: "Refresh from the signed-in organization data service."
      }
    ],
    now: input.now
  });

  return {
    viewer: {
      role: "admin",
      signedIn: true,
      status: "live",
      message: input.message,
      canViewPrivateData: true,
      scopeLabel: "Scoped to active organization admin access."
    },
    organizationName: input.state.organization.name,
    health: {
      teamsNeedingHelp: rows.filter((row) => row.status !== "ready").length,
      lowRsvpTeams,
      brokenFamilyAccess,
      pendingRegistrations,
      weatherFieldReview,
      mediaReview,
      messageDeliveryReview,
      setupGaps,
      securityAuditStatus: "ready"
    },
    operationalTruth,
    pendingQueues,
    teamRows: rows,
    registrationQueue: {
      count: pendingRegistrations,
      href: "/admin/registrations"
    },
    security: {
      status: "ready",
      detail: "RLS proof, archived-season locks, and provider boundary checks remain review surfaces.",
      href: "/admin/security-audit"
    },
    freshness: adminFreshness
  };
}

function buildTeamContext(team: Team | undefined, state: AppState): SeasonTeamContext {
  return {
    id: team?.id,
    name: team?.name ?? "No active team",
    division: team?.division,
    season: team ? state.activeSeason.name : undefined,
    primaryColor: team?.primaryColor,
    secondaryColor: team?.secondaryColor
  };
}

function findNextEvent(events: LeagueEvent[], now: string) {
  const nowTime = Date.parse(now);
  return [...events]
    .filter((event) => event.status === "scheduled" && Date.parse(event.startsAt) >= nowTime)
    .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt))[0];
}

function buildNextEventCertainty(event: LeagueEvent | undefined, now: string, isLive: boolean): NextEventCertainty {
  if (!event) {
    return {
      type: "other",
      title: "No upcoming event",
      timeLabel: "Schedule pending",
      venue: "Field pending",
      status: "scheduled",
      statusLabel: "No upcoming event",
      freshnessState: isLive ? "live" : "fallback"
    };
  }
  const changed = isEventChanged(event);
  const address = event.locationAddress && event.locationAddress !== "Address TBD" ? event.locationAddress : undefined;
  return {
    id: event.id,
    type: event.eventType,
    title: event.title,
    opponent: event.opponent,
    startsAt: event.startsAt,
    timeLabel: formatEventDateTime(event.startsAt),
    arrivalLabel: `Arrive ${formatArrivalTime(event.startsAt)}`,
    venue: event.locationName || "Field pending",
    address,
    directionsUrl: address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.locationName} ${address}`)}` : undefined,
    status: changed ? "changed" : event.status === "cancelled" ? "canceled" : "scheduled",
    statusLabel: eventStatusLabel(event, now),
    lastUpdated: event.updatedAt,
    freshnessState: isLive ? "live" : "fallback"
  };
}

function eventStatusLabel(event: LeagueEvent, now: string) {
  if (event.status === "cancelled") return "Canceled";
  if (isEventChanged(event)) return "Changed";
  if (new Date(event.startsAt).toDateString() === new Date(now).toDateString()) return "Today";
  if (Date.parse(event.startsAt) - Date.parse(now) <= 48 * 60 * 60 * 1000) return "Coming up soon";
  return "Scheduled";
}

function buildRsvpLineItem(player: Player, rsvp: Rsvp | undefined): RsvpLineItem {
  const status = rsvp?.response ?? "no_reply";
  const label = {
    going: "Confirmed",
    not_going: "Not coming",
    maybe: "Maybe",
    cancelled: "Canceled",
    no_reply: "RSVP needed"
  }[status];
  return {
    playerId: player.id,
    playerName: formatPlayerName(player),
    status,
    label
  };
}

function buildCoachAttendance(players: Player[], event: LeagueEvent | undefined, rsvps: Rsvp[]): CoachAttendanceSnapshot {
  if (!event) return { confirmed: 0, declined: 0, maybe: 0, noReply: players.length, missingReplies: players.map(formatPlayerName) };
  const rows = players.map((player) => buildRsvpLineItem(player, rsvps.find((rsvp) => rsvp.eventId === event.id && rsvp.playerId === player.id)));
  return {
    confirmed: rows.filter((row) => row.status === "going").length,
    declined: rows.filter((row) => row.status === "not_going" || row.status === "cancelled").length,
    maybe: rows.filter((row) => row.status === "maybe").length,
    noReply: rows.filter((row) => row.status === "no_reply").length,
    missingReplies: rows.filter((row) => row.status === "no_reply").map((row) => row.playerName)
  };
}

function buildReadinessSnapshot(input: {
  snackOpen: number;
  volunteerOpen: number;
  weatherReview: number;
  fieldNeedsReview: number | false | undefined;
  coachUpdateMissing: number;
  guardianIssues: number;
  mediaReview: number;
  providerReview: number;
  aiDrafts: number;
  hasEvent: boolean;
  venueAvailable: boolean;
  weatherEvidenceAvailable: boolean;
  isLive: boolean;
  now: string;
}): TeamReadinessSnapshot {
  const attentionCount = [
    input.snackOpen,
    input.volunteerOpen,
    input.weatherReview,
    input.fieldNeedsReview ? 1 : 0,
    input.coachUpdateMissing,
    input.guardianIssues,
    input.mediaReview,
    input.providerReview,
    input.aiDrafts
  ].reduce((total, value) => total + Number(value), 0);
  const freshness = createDataFreshness({
    source: input.isLive ? "live" : "fallback",
    observedAt: input.now,
    expiresAfterMs: 5 * 60 * 1000,
    now: input.now
  });
  const operationalTruth = rollupOperationalTruth({
    positiveSummary: "The next event is supported by current operational evidence.",
    failedSummary: "The next event has a critical blocker.",
    verificationSummary: "The next event needs verification.",
    evidence: [
      evidenceLane("record", "Upcoming event record is available", input.hasEvent, true, "event record", input.now),
      evidenceLane("approval", "Family or coach access is active", input.guardianIssues === 0, true, "access records", input.now),
      evidenceLane("publication", "Venue instructions are available", input.venueAvailable, true, "event location", input.now),
      {
        ...evidenceLane("record", "Weather evidence is available", input.weatherEvidenceAvailable, true, "weather review record", input.now),
        satisfied: input.weatherEvidenceAvailable ? input.weatherReview === 0 : null,
        recoveryAction: "Refresh weather and review field conditions."
      },
      {
        category: "freshness",
        label: freshness.label,
        evidenceAvailable: input.isLive,
        satisfied: freshness.stale ? null : true,
        critical: true,
        source: input.isLive ? "live scoped rows" : "fallback preview",
        observedAt: input.now,
        freshness,
        recoveryAction: input.isLive ? "Refresh current team records." : "Sign in and load current team records."
      },
      evidenceLane("delivery", "Provider review queue is clear", input.providerReview === 0, false, "notification review records", input.now),
      evidenceLane("acknowledgment", "AI drafts are reviewed", input.aiDrafts === 0, false, "review records", input.now)
    ],
    now: input.now
  });
  const overallState: ReadinessState = operationalTruth.tone === "ready"
    ? attentionCount === 0 ? "ready" : "needs_attention"
    : operationalTruth.tone === "blocked"
      ? "blocked"
      : operationalTruth.tone === "unknown"
        ? "unknown"
        : "needs_attention";
  return {
    overallState,
    overallLabel: overallState === "ready"
      ? "Ready"
      : overallState === "blocked"
        ? "Blocked"
        : overallState === "unknown"
          ? "Needs verification"
          : "Needs attention",
    operationalTruth,
    snackCoverage: input.snackOpen ? "needs_attention" : "ready",
    volunteerCoverage: input.volunteerOpen ? "needs_attention" : "ready",
    weatherStatus: !input.weatherEvidenceAvailable ? "offline_stale" : input.weatherReview ? "needs_attention" : "ready",
    fieldStatus: !input.venueAvailable ? "offline_stale" : input.fieldNeedsReview ? "needs_attention" : "ready",
    coachUpdateStatus: input.coachUpdateMissing ? "needs_attention" : "ready",
    guardianAccessStatus: input.guardianIssues ? "urgent" : "ready",
    mediaReviewStatus: input.mediaReview ? "needs_attention" : "ready",
    providerReviewStatus: input.providerReview ? "needs_attention" : "ready",
    aiDraftReviewStatus: input.aiDrafts ? "needs_attention" : "ready",
    summary: operationalTruth.summary
  };
}

function buildParentActions(input: {
  missingRsvps: RsvpLineItem[];
  nextEvent: LeagueEvent | undefined;
  openSnackSlots: number;
  openVolunteerRoles: number;
  hasNotificationPreference: boolean;
  hasGuardianAccess: boolean;
}): SeasonActionItem[] {
  const actions: SeasonActionItem[] = [];
  if (!input.hasGuardianAccess) {
    actions.push({
      id: "family-access",
      label: "Verify family access",
      description: "A linked guardian record is required before private team details appear.",
      cta: "Check access",
      href: "/parent/family-access",
      priority: "urgent",
      permissionState: "needs_attention",
      ranking: actionRanking("critical", "blocking", "admin", "parent")
    });
  }
  if (input.missingRsvps.length) {
    actions.push({
      id: "rsvp",
      label: "RSVP now",
      description: `${input.missingRsvps.map((row) => row.playerName).join(", ")} still ${input.missingRsvps.length === 1 ? "needs" : "need"} a response.`,
      cta: "RSVP now",
      href: "/parent/rsvp",
      priority: "primary",
      permissionState: "ready",
      ranking: actionRanking("none", "blocking", "self", "parent", input.nextEvent?.startsAt)
    });
  }
  if (input.nextEvent && isEventChanged(input.nextEvent)) {
    actions.push({
      id: "event-change",
      label: "Review schedule change",
      description: "The next event was updated after it was created.",
      cta: "Review change",
      href: "/parent/schedule",
      priority: "primary",
      permissionState: "ready",
      ranking: actionRanking("attention", "limited", "self", "parent", input.nextEvent.startsAt)
    });
  }
  if (input.openSnackSlots) {
    actions.push({
      id: "snacks",
      label: "View snack duty",
      description: `${input.openSnackSlots} snack slot${input.openSnackSlots === 1 ? "" : "s"} are open for linked teams.`,
      cta: "View snacks",
      href: "#family-help",
      priority: "secondary",
      permissionState: "ready",
      ranking: actionRanking("none", "limited", "self", "parent", input.nextEvent?.startsAt)
    });
  }
  if (input.openVolunteerRoles) {
    actions.push({
      id: "volunteers",
      label: "Sign up to volunteer",
      description: `${input.openVolunteerRoles} volunteer role${input.openVolunteerRoles === 1 ? "" : "s"} are open.`,
      cta: "Sign up",
      href: "#family-help",
      priority: "secondary",
      permissionState: "ready",
      ranking: actionRanking("none", "limited", "self", "parent", input.nextEvent?.startsAt)
    });
  }
  if (!input.hasNotificationPreference) {
    actions.push({
      id: "notifications",
      label: "Set notifications",
      description: "Choose how schedule changes should notify this parent account.",
      cta: "Set up",
      href: "#schedule-alerts",
      priority: "secondary",
      permissionState: "ready",
      ranking: actionRanking("none", "none", "self", "parent")
    });
  }
  return actions;
}

function buildCoachActions(input: {
  noReply: number;
  weatherReview: number;
  helpCoverageOpen: number;
  nextEvent: LeagueEvent | undefined;
}): SeasonActionItem[] {
  if (input.noReply > 0) {
    return [{
      id: "missing-rsvps",
      label: "Nudge missing replies",
      description: `${input.noReply} player RSVP ${input.noReply === 1 ? "is" : "are"} still missing.`,
      cta: "Nudge missing replies",
      href: "/coach/attendance",
      priority: "primary",
      permissionState: "ready",
      ranking: actionRanking("none", "blocking", "coach", "coach", input.nextEvent?.startsAt)
    }];
  }
  if (input.weatherReview > 0) {
    return [{
      id: "weather",
      label: "Review field status",
      description: "A weather or field draft needs coach review before families are told.",
      cta: "Review field status",
      href: "/coach/weather-fields",
      priority: "primary",
      permissionState: "ready",
      ranking: actionRanking("attention", "blocking", "coach", "coach", input.nextEvent?.startsAt)
    }];
  }
  if (input.helpCoverageOpen > 0) {
    return [{
      id: "help-coverage",
      label: "Cover snacks and volunteers",
      description: `${input.helpCoverageOpen} snack or volunteer item${input.helpCoverageOpen === 1 ? "" : "s"} are open.`,
      cta: "Review coverage",
      href: "/coach/snacks-volunteers",
      priority: "secondary",
      permissionState: "ready",
      ranking: actionRanking("none", "limited", "coach", "coach", input.nextEvent?.startsAt)
    }];
  }
  return [{
    id: "coach-update",
    label: "Create update",
    description: input.nextEvent ? "Families have the basics. Send a short coach update when ready." : "Add the next event before sending an update.",
    cta: "Create update",
    href: "/coach/drafts",
    priority: "secondary",
    permissionState: "ready",
    ranking: actionRanking("none", "none", "coach", "coach", input.nextEvent?.startsAt)
  }];
}

function buildScheduleChanges(events: LeagueEvent[], now: string): SeasonChangeItem[] {
  return events
    .filter(isEventChanged)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .map((event) => ({
      id: event.id,
      label: `${event.title} details changed`,
      before: "Previous schedule",
      after: `${formatEventDateTime(event.startsAt)} at ${event.locationName}`,
      timeAgo: timeAgo(event.updatedAt, now),
      severity: event.status === "cancelled" ? "urgent" : "attention",
      sourceLabel: "Schedule"
    }));
}

function buildAdminTeamStatusRow(state: AppState, team: Team, now: string): AdminTeamStatusRow {
  const events = state.events.filter((event) => event.teamId === team.id);
  const nextEvent = findNextEvent(events, now);
  const players = state.players.filter((player) => player.teamId === team.id);
  const playerIds = new Set(players.map((player) => player.id));
  const eventRsvps = nextEvent ? state.rsvps.filter((rsvp) => rsvp.eventId === nextEvent.id && playerIds.has(rsvp.playerId)) : [];
  const noReply = Math.max(players.length - eventRsvps.length, 0);
  const activeGuardianLinks = state.guardianLinks.filter((link) => playerIds.has(link.playerId) && link.status === "active");
  const snackOpen = state.snackScheduleSlots.filter((slot) => slot.teamId === team.id && slot.status === "open").length;
  const volunteerOpen = state.volunteerSignups.filter((signup) => signup.teamId === team.id && signup.status === "open").length;
  const mediaReview = state.mediaItems.filter((item) => team.id === item.teamId && (item.moderationStatus === "pending" || (item.reportCount ?? 0) > 0)).length;
  const weatherReview = state.weatherAlerts.filter((alert) => alert.teamId === team.id && alert.status === "draft").length;
  const setupGaps = [team.coachUserId ? 0 : 1, nextEvent ? 0 : 1].reduce((total, value) => total + value, 0);
  const status: ReadinessState = setupGaps || activeGuardianLinks.length < players.length ? "blocked" : noReply || snackOpen || volunteerOpen || mediaReview || weatherReview ? "needs_attention" : "ready";

  return {
    teamId: team.id,
    teamName: team.name,
    division: team.division,
    nextEvent: nextEvent ? `${nextEvent.title} (${formatShortDate(nextEvent.startsAt)})` : "No upcoming event",
    rsvpConfidence: players.length ? `${players.length - noReply}/${players.length} replied` : "No roster",
    familyAccess: players.length ? `${activeGuardianLinks.length}/${players.length} linked` : "No roster",
    snacksVolunteers: snackOpen + volunteerOpen ? `${snackOpen} snacks, ${volunteerOpen} volunteers open` : "Covered",
    weatherField: weatherReview ? `${weatherReview} draft review` : "No draft review",
    media: mediaReview ? `${mediaReview} media review` : "Approved only",
    setup: setupGaps ? `${setupGaps} setup gap${setupGaps === 1 ? "" : "s"}` : "Set",
    status,
    primaryAction: {
      id: `team-${team.id}`,
      label: status === "blocked" ? "Fix setup" : status === "needs_attention" ? "Review team" : "Open team",
      description: status === "ready" ? "Team is ready from available records." : "Open the highest-priority admin surface for this team.",
      cta: status === "blocked" ? "Fix setup" : "Review",
      href: status === "blocked" ? "/admin/teams" : "/admin/operations",
      priority: status === "blocked" ? "urgent" : "secondary",
      permissionState: "ready",
      ranking: actionRanking(status === "blocked" ? "attention" : "none", status === "blocked" ? "blocking" : "limited", "admin", "admin", nextEvent?.startsAt)
    }
  };
}

function queueAction(queue: ReturnType<typeof selectAdminQueueAttention>[number]): SeasonActionItem {
  const { id, label, count, href, cta } = queue;
  return {
    id,
    label,
    description: count ? adminQueueDescription(queue) : `${label} is clear. No admin action is needed.`,
    cta,
    href,
    priority: count > 0 ? "primary" : "secondary",
    permissionState: count > 0 ? "needs_attention" : "empty",
    ranking: actionRanking(
      ["family-access", "weather-fields"].includes(id) && count > 0 ? "attention" : "none",
      count > 0 ? "blocking" : "none",
      "admin",
      "admin"
    )
  };
}

function adminQueueDescription(queue: ReturnType<typeof selectAdminQueueAttention>[number]) {
  const nouns: Record<string, [string, string]> = {
    registrations: ["registration", "registrations"],
    "family-access": ["family access record", "family access records"],
    "weather-fields": ["weather or field draft", "weather or field drafts"],
    "media-review": ["media item", "media items"],
    "message-delivery": ["message draft", "message drafts"],
    branding: ["branding item", "branding items"],
    "reports-archive": ["report or archive task", "report or archive tasks"],
    "security-audit": ["security review", "security reviews"]
  };
  const noun = nouns[queue.id]?.[queue.count === 1 ? 0 : 1] ?? (queue.count === 1 ? "item" : "items");
  return `${queue.count} ${noun} ${queue.count === 1 ? "awaits" : "await"} review. League admin acts next.`;
}

function evidenceLane(
  category: TruthEvidence["category"],
  label: string,
  satisfied: boolean,
  critical: boolean,
  source: string,
  observedAt: string
): TruthEvidence {
  return {
    category,
    label,
    evidenceAvailable: true,
    satisfied,
    critical,
    source,
    observedAt
  };
}

function actionRanking(
  safetySeverity: "none" | "attention" | "critical",
  dependencyImpact: "none" | "limited" | "blocking",
  authorityRequirement: "self" | "coach" | "admin",
  requiredRole: "parent" | "coach" | "admin",
  eventStartsAt?: string
) {
  return buildActionPriority({
    safetySeverity,
    eventStartsAt,
    dependencyImpact,
    authorityRequirement,
    createdAt: eventStartsAt ?? "2026-01-01T00:00:00.000Z",
    requiredRole,
    now: eventStartsAt ? new Date(Date.parse(eventStartsAt) - 48 * 60 * 60 * 1000).toISOString() : "2026-07-19T00:00:00.000Z"
  });
}

function buildFreshness(isLive: boolean, now: string): SeasonFreshness {
  return {
    state: isLive ? "live" : "fallback",
    label: isLive ? "Live Supabase rows" : "Fallback or local preview",
    lastLoadedLabel: `Loaded ${formatShortDate(now)}`,
    staleCopy: isLive ? undefined : "This view is not claiming live production freshness."
  };
}

function formatPlayerName(player: Player) {
  return `${player.firstName} ${player.lastInitial}.`;
}

function formatEventDateTime(value?: string) {
  if (!value) return "Date pending";
  const date = new Date(value);
  return `${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatArrivalTime(value: string) {
  return new Date(Date.parse(value) - 20 * 60 * 1000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function timeAgo(value: string, now: string) {
  const diffMs = Math.max(Date.parse(now) - Date.parse(value), 0);
  const hours = Math.floor(diffMs / (60 * 60 * 1000));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function isEventChanged(event: LeagueEvent) {
  return Date.parse(event.updatedAt) > Date.parse(event.createdAt) + 60 * 1000;
}

function byNewestCreatedAt(left: { createdAt: string }, right: { createdAt: string }) {
  return Date.parse(right.createdAt) - Date.parse(left.createdAt);
}

function severityRank(severity: SeasonChangeItem["severity"]) {
  return severity === "urgent" ? 3 : severity === "attention" ? 2 : 1;
}
