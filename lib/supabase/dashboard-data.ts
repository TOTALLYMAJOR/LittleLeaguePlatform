import { seedState, type Announcement, type AppState, type GuardianLink, type LeagueEvent, type MediaItem, type NotificationPreference, type ParentInvite, type Player, type Rsvp, type SnackScheduleSlot, type Team, type TeamMembership, type User, type VolunteerSignup, type WeatherAlert } from "@/lib/domain";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Dashboard tables span staged migrations; keep this adapter dynamic until generated types are refreshed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  storage: ReturnType<typeof createSupabaseAdminClient>["storage"];
};

type DashboardQueryResult<T> = {
  data: T[] | null;
  error: { message?: string } | null;
};

export interface ParentCoachDashboardData {
  state: AppState;
  parentUserId: string;
  coachUserId: string;
  rsvpChangeLogs?: RsvpChangeLog[];
  isSupabaseBacked: boolean;
  accessStatus: "live" | "signed_out" | "missing_parent_link" | "missing_coach_membership" | "unavailable";
  message: string;
  coachRsvpTargets?: CoachRsvpReminderTarget[];
}

export interface CoachRsvpReminderTarget {
  id: string;
  teamId: string;
  eventId: string;
  eventTitle: string;
  parentUserId: string;
  familyLabel: string;
  playerDisplayNames: string[];
  noResponse: number;
}

export interface RsvpChangeLog {
  id: string;
  eventId: string;
  playerId: string;
  parentUserId: string;
  previousResponse?: Rsvp["response"];
  nextResponse: Rsvp["response"];
  note?: string;
  createdAt: string;
}

export interface ParentCoachDashboardReadOptions {
  viewerUserId?: string;
  surface: "parent" | "coach";
}

function adminDb() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

function isMissingColumnError(error: { message?: string } | null | undefined) {
  return Boolean(error?.message && /column .* does not exist|could not find .* column/i.test(error.message));
}

async function readWithSchemaFallback<T>(
  primary: () => PromiseLike<DashboardQueryResult<T>>,
  fallback: () => PromiseLike<DashboardQueryResult<T>>
): Promise<DashboardQueryResult<T>> {
  const result = await primary();
  return isMissingColumnError(result.error) ? fallback() : result;
}

function emptyDashboardState(): AppState {
  return {
    ...seedState,
    users: [],
    teams: [],
    teamMemberships: [],
    players: [],
    guardianLinks: [],
    parentInvites: [],
    events: [],
    rsvps: [],
    announcements: [],
    mediaItems: [],
    notifications: [],
    notificationPreferences: [],
    parentReplays: [],
    registrationRequests: [],
    snackScheduleSlots: [],
    volunteerSignups: [],
    sponsors: [],
    weatherAlerts: [],
    teamChatChannels: [],
    chatMessages: [],
    chatModerationAuditEvents: [],
    auditEvents: [],
    rosterImportReports: []
  };
}

function unavailableDashboardData(surface: ParentCoachDashboardReadOptions["surface"], message: string): ParentCoachDashboardData {
  return {
    state: emptyDashboardState(),
    parentUserId: "",
    coachUserId: "",
    rsvpChangeLogs: [],
    isSupabaseBacked: false,
    accessStatus: "unavailable",
    message
  };
}

function signedOutDashboardData(surface: ParentCoachDashboardReadOptions["surface"]): ParentCoachDashboardData {
  return {
    state: emptyDashboardState(),
    parentUserId: "",
    coachUserId: "",
    rsvpChangeLogs: [],
    isSupabaseBacked: false,
    accessStatus: "signed_out",
    message: surface === "parent"
      ? "Sign in with a linked parent account to see children, schedules, media, and RSVPs."
      : "Sign in with an assigned coach account to see team attendance, weather, snacks, and volunteers."
  };
}

function scopeParentState(state: AppState, parentUserId: string): AppState {
  const guardianLinks = state.guardianLinks.filter((link) => link.parentUserId === parentUserId && link.status === "active");
  const playerIds = new Set(guardianLinks.map((link) => link.playerId));
  const players = state.players.filter((player) => playerIds.has(player.id));
  const teamIds = new Set(players.map((player) => player.teamId));
  const teams = state.teams.filter((team) => teamIds.has(team.id));
  const eventIds = new Set(state.events.filter((event) => teamIds.has(event.teamId)).map((event) => event.id));
  const coachUserIds = new Set(teams.flatMap((team) => team.coachUserId ? [team.coachUserId] : []));

  return {
    ...emptyDashboardState(),
    organization: state.organization,
    activeSeason: state.activeSeason,
    users: state.users.filter((user) => user.id === parentUserId || coachUserIds.has(user.id)),
    teams,
    teamMemberships: state.teamMemberships.filter((membership) => membership.userId === parentUserId && teamIds.has(membership.teamId)),
    players,
    guardianLinks,
    events: state.events.filter((event) => teamIds.has(event.teamId)),
    rsvps: state.rsvps.filter((rsvp) => playerIds.has(rsvp.playerId) && eventIds.has(rsvp.eventId)),
    announcements: state.announcements.filter((announcement) => teamIds.has(announcement.teamId)),
    mediaItems: state.mediaItems.filter((item) => teamIds.has(item.teamId)),
    notificationPreferences: state.notificationPreferences.filter((preference) => (
      preference.userId === parentUserId &&
      (!preference.teamId || teamIds.has(preference.teamId))
    )),
    snackScheduleSlots: state.snackScheduleSlots.filter((slot) => teamIds.has(slot.teamId)),
    volunteerSignups: state.volunteerSignups.filter((signup) => teamIds.has(signup.teamId))
  };
}

function scopeCoachState(state: AppState, coachUserId: string): AppState {
  const coachMemberships = state.teamMemberships.filter((membership) => (
    membership.userId === coachUserId &&
    membership.role === "coach" &&
    membership.status === "active"
  ));
  const teamIds = new Set([
    ...coachMemberships.map((membership) => membership.teamId),
    ...state.teams.filter((team) => team.coachUserId === coachUserId).map((team) => team.id)
  ]);
  const teams = state.teams.filter((team) => teamIds.has(team.id));
  const players = state.players.filter((player) => teamIds.has(player.teamId));
  const playerIds = new Set(players.map((player) => player.id));
  const eventIds = new Set(state.events.filter((event) => teamIds.has(event.teamId)).map((event) => event.id));

  return {
    ...emptyDashboardState(),
    organization: state.organization,
    activeSeason: state.activeSeason,
    users: state.users.filter((user) => user.id === coachUserId),
    teams,
    teamMemberships: coachMemberships,
    players,
    events: state.events.filter((event) => teamIds.has(event.teamId)),
    rsvps: state.rsvps.filter((rsvp) => playerIds.has(rsvp.playerId) && eventIds.has(rsvp.eventId)),
    announcements: state.announcements.filter((announcement) => teamIds.has(announcement.teamId)),
    mediaItems: state.mediaItems.filter((item) => teamIds.has(item.teamId)),
    snackScheduleSlots: state.snackScheduleSlots.filter((slot) => teamIds.has(slot.teamId)),
    volunteerSignups: state.volunteerSignups.filter((signup) => teamIds.has(signup.teamId)),
    weatherAlerts: state.weatherAlerts.filter((alert) => teamIds.has(alert.teamId))
  };
}

function mapTeam(row: {
  id: string;
  organization_id: string;
  season_id: string;
  division: string;
  name: string;
  coach_user_id: string | null;
  mascot: string;
  primary_color: string;
  secondary_color: string;
  theme_key: Team["themeKey"];
}): Team {
  return {
    id: row.id,
    organizationId: row.organization_id,
    seasonId: row.season_id,
    division: row.division,
    name: row.name,
    coachUserId: row.coach_user_id ?? undefined,
    mascot: row.mascot,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    themeKey: row.theme_key
  };
}

function hasParentSurface(state: AppState, parentUserId: string) {
  return state.guardianLinks.some((link) => link.parentUserId === parentUserId && link.status === "active");
}

function hasCoachSurface(state: AppState, coachUserId: string) {
  return state.teamMemberships.some((membership) => (
    membership.userId === coachUserId &&
    membership.role === "coach" &&
    membership.status === "active"
  ));
}

export async function listParentCoachDashboardData(options: ParentCoachDashboardReadOptions): Promise<ParentCoachDashboardData> {
  if (!options.viewerUserId) return signedOutDashboardData(options.surface);

  try {
    const db = adminDb();
    const [
      organizationsResult,
      seasonsResult,
      profilesResult,
      teamsResult,
      membershipsResult,
      playersResult,
      guardiansResult,
      parentInvitesResult,
      eventsResult,
      rsvpsResult,
      rsvpLogsResult,
      announcementsResult,
      mediaResult,
      preferencesResult,
      snacksResult,
      volunteersResult,
      weatherResult
    ] = await withSupabaseTimeout(Promise.all([
      db.from("organizations").select("id,name").order("created_at", { ascending: true }).limit(1),
      db.from("seasons").select("id,organization_id,name,status,starts_at,ends_at,archived_at").order("starts_at", { ascending: false }).limit(1),
      db.from("profiles").select("id,display_name,email,phone,default_role").order("display_name", { ascending: true }),
      db.from("teams").select("id,organization_id,season_id,division,name,coach_user_id,mascot,primary_color,secondary_color,theme_key").order("division", { ascending: true }).order("name", { ascending: true }),
      db.from("team_memberships").select("id,team_id,user_id,role,status").order("created_at", { ascending: false }),
      db.from("players").select("id,organization_id,season_id,team_id,first_name,last_initial,jersey").order("first_name", { ascending: true }),
      db.from("player_guardians").select("id,player_id,parent_user_id,parent_invite_id,relationship,status").order("created_at", { ascending: false }),
      db.from("parent_invites").select("id,organization_id,team_id,player_id,email,phone,invite_token_hash,status,delivery_status,sent_count,resend_timestamps,last_sent_at,expires_at,accepted_at,created_at,updated_at").order("created_at", { ascending: false }),
      db.from("events").select("id,organization_id,team_id,season_id,title,event_type,starts_at,ends_at,location_name,location_address,status,opponent,schedule_version,created_at,updated_at").order("starts_at", { ascending: true }),
      readWithSchemaFallback(
        () => db.from("rsvps").select("id,event_id,player_id,parent_user_id,response,note,responded_at,confirmed_schedule_version,lock_version,last_updated_by_user_id,client_action_id,created_at,updated_at").order("responded_at", { ascending: false }),
        () => db.from("rsvps").select("id,event_id,player_id,parent_user_id,response,note,responded_at,created_at,updated_at").order("responded_at", { ascending: false })
      ),
      readWithSchemaFallback(
        () => db.from("rsvp_change_logs").select("id,event_id,player_id,parent_user_id,previous_response,next_response,note,created_at").order("created_at", { ascending: false }).limit(100),
        () => Promise.resolve({ data: [], error: null })
      ),
      db.from("announcements").select("id,team_id,author_user_id,title,body,created_at").order("created_at", { ascending: false }),
      readWithSchemaFallback(
        () => db.from("media_items").select("id,team_id,title,media_type,url,created_at,moderation_status,report_count,private_object_path,scan_completed_at,family_release_approved_at").eq("moderation_status", "approved").order("created_at", { ascending: false }),
        () => db.from("media_items").select("id,team_id,title,media_type,url,created_at,moderation_status,report_count").eq("moderation_status", "approved").order("created_at", { ascending: false })
      ),
      db.from("notification_preferences").select("id,user_id,organization_id,team_id,channel,notification_type,enabled,quiet_hours_start,quiet_hours_end,timezone,opted_in_at,opted_out_at").order("updated_at", { ascending: false }),
      readWithSchemaFallback(
        () => db.from("snack_schedule_slots").select("id,team_id,event_id,assigned_parent_user_id,item,status,slot_cap,reminder_draft_count,reminder_last_drafted_at,unclaimed_at,unclaimed_by_user_id,cancellation_reason").order("created_at", { ascending: true }),
        () => db.from("snack_schedule_slots").select("id,team_id,event_id,assigned_parent_user_id,item,status").order("created_at", { ascending: true })
      ),
      readWithSchemaFallback(
        () => db.from("volunteer_signups").select("id,team_id,event_id,role,assigned_user_id,status,role_cap,reminder_draft_count,reminder_last_drafted_at,unclaimed_at,unclaimed_by_user_id,cancellation_reason").order("created_at", { ascending: true }),
        () => db.from("volunteer_signups").select("id,team_id,event_id,role,assigned_user_id,status").order("created_at", { ascending: true })
      ),
      db.from("weather_alerts").select("id,team_id,event_id,headline,detail,severity,status,created_at").order("created_at", { ascending: false })
    ]), 7000);

    const results = [
      organizationsResult,
      seasonsResult,
      profilesResult,
      teamsResult,
      membershipsResult,
      playersResult,
      guardiansResult,
      parentInvitesResult,
      eventsResult,
      rsvpsResult,
      rsvpLogsResult,
      announcementsResult,
      mediaResult,
      preferencesResult,
      snacksResult,
      volunteersResult,
      weatherResult
    ];
    if (results.some((result) => result.error) || !teamsResult.data?.length) {
      return unavailableDashboardData(options.surface, "Supabase dashboard rows are not available yet.");
    }

    const organization = organizationsResult.data?.[0];
    const season = seasonsResult.data?.[0];
    const users: User[] = (profilesResult.data ?? []).map((profile: {
      id: string;
      display_name: string;
      email: string;
      phone: string | null;
      default_role: User["role"];
    }) => ({
      id: profile.id,
      role: profile.default_role,
      name: profile.display_name,
      email: profile.email,
      phone: profile.phone ?? undefined
    }));
    const teams: Team[] = teamsResult.data.map(mapTeam);
    const teamMemberships: TeamMembership[] = (membershipsResult.data ?? []).map((membership: {
      id: string;
      team_id: string;
      user_id: string;
      role: TeamMembership["role"];
      status: TeamMembership["status"];
    }) => ({
      id: membership.id,
      teamId: membership.team_id,
      userId: membership.user_id,
      role: membership.role,
      status: membership.status
    }));
    const players: Player[] = (playersResult.data ?? []).map((player: {
      id: string;
      organization_id: string;
      season_id: string;
      team_id: string;
      first_name: string;
      last_initial: string;
      jersey: string | null;
    }) => ({
      id: player.id,
      organizationId: player.organization_id,
      seasonId: player.season_id,
      teamId: player.team_id,
      firstName: player.first_name,
      lastInitial: player.last_initial,
      jersey: player.jersey ?? "TBD"
    }));
    const guardianLinks: GuardianLink[] = (guardiansResult.data ?? []).map((guardian: {
      id: string;
      player_id: string;
      parent_user_id: string | null;
      parent_invite_id: string | null;
      relationship: GuardianLink["relationship"];
      status: GuardianLink["status"];
    }) => ({
      id: guardian.id,
      playerId: guardian.player_id,
      parentUserId: guardian.parent_user_id ?? undefined,
      parentInviteId: guardian.parent_invite_id ?? undefined,
      relationship: guardian.relationship,
      status: guardian.status
    }));
    const parentInvites: ParentInvite[] = (parentInvitesResult.data ?? []).map((invite: {
      id: string;
      organization_id: string;
      team_id: string;
      player_id: string;
      email: string;
      phone: string | null;
      invite_token_hash: string;
      status: ParentInvite["status"];
      delivery_status: ParentInvite["deliveryStatus"];
      sent_count: number;
      resend_timestamps: string[];
      last_sent_at: string | null;
      expires_at: string;
      accepted_at: string | null;
      created_at: string;
      updated_at: string;
    }) => ({
      id: invite.id,
      organizationId: invite.organization_id,
      teamId: invite.team_id,
      playerId: invite.player_id,
      email: invite.email,
      phone: invite.phone ?? "",
      inviteTokenHash: invite.invite_token_hash,
      status: invite.status,
      deliveryStatus: invite.delivery_status,
      sentCount: invite.sent_count,
      resendTimestamps: invite.resend_timestamps,
      lastSentAt: invite.last_sent_at ?? undefined,
      expiresAt: invite.expires_at,
      acceptedAt: invite.accepted_at ?? undefined,
      createdAt: invite.created_at,
      updatedAt: invite.updated_at
    }));
    const events: LeagueEvent[] = (eventsResult.data ?? []).map((event: {
      id: string;
      organization_id: string;
      team_id: string;
      season_id: string;
      title: string;
      event_type: LeagueEvent["eventType"];
      starts_at: string;
      ends_at: string;
      location_name: string | null;
      location_address: string | null;
      status: LeagueEvent["status"];
      opponent: string | null;
      schedule_version: number | null;
      created_at: string;
      updated_at: string;
    }) => ({
      id: event.id,
      organizationId: event.organization_id,
      teamId: event.team_id,
      seasonId: event.season_id,
      title: event.title,
      eventType: event.event_type,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      locationName: event.location_name ?? "Location TBD",
      locationAddress: event.location_address ?? "Address TBD",
      status: event.status,
      opponent: event.opponent ?? undefined,
      scheduleVersion: event.schedule_version ?? 1,
      createdAt: event.created_at,
      updatedAt: event.updated_at
    }));
    const rsvps: Rsvp[] = ((rsvpsResult.data ?? []) as Array<{
      id: string;
      event_id: string;
      player_id: string;
      parent_user_id: string;
      response: Rsvp["response"];
      note: string | null;
      responded_at: string;
      confirmed_schedule_version?: number | null;
      lock_version?: number | null;
      last_updated_by_user_id?: string | null;
      client_action_id?: string | null;
      created_at: string;
      updated_at: string;
    }>).map((rsvp) => ({
      id: rsvp.id,
      eventId: rsvp.event_id,
      playerId: rsvp.player_id,
      parentUserId: rsvp.parent_user_id,
      response: rsvp.response,
      note: rsvp.note ?? undefined,
      respondedAt: rsvp.responded_at,
      confirmedScheduleVersion: rsvp.confirmed_schedule_version ?? 1,
      lockVersion: rsvp.lock_version ?? 0,
      lastUpdatedByUserId: rsvp.last_updated_by_user_id ?? undefined,
      clientActionId: rsvp.client_action_id ?? undefined,
      createdAt: rsvp.created_at,
      updatedAt: rsvp.updated_at
    }));
    const rsvpChangeLogs: RsvpChangeLog[] = ((rsvpLogsResult.data ?? []) as Array<{
      id: string;
      event_id: string;
      player_id: string;
      parent_user_id: string;
      previous_response: Rsvp["response"] | null;
      next_response: Rsvp["response"];
      note: string | null;
      created_at: string;
    }>).map((log) => ({
      id: log.id,
      eventId: log.event_id,
      playerId: log.player_id,
      parentUserId: log.parent_user_id,
      previousResponse: log.previous_response ?? undefined,
      nextResponse: log.next_response,
      note: log.note ?? undefined,
      createdAt: log.created_at
    }));
    const announcements: Announcement[] = (announcementsResult.data ?? []).map((announcement: {
      id: string;
      team_id: string;
      author_user_id: string;
      title: string;
      body: string;
      created_at: string;
    }) => ({
      id: announcement.id,
      teamId: announcement.team_id,
      authorUserId: announcement.author_user_id,
      title: announcement.title,
      body: announcement.body,
      createdAt: announcement.created_at
    }));
    const mediaItems: MediaItem[] = (await Promise.all(((mediaResult.data ?? []) as Array<{
      id: string;
      team_id: string;
      title: string;
      media_type: MediaItem["type"];
      url: string;
      moderation_status: MediaItem["moderationStatus"];
      report_count: number;
      private_object_path?: string | null;
      scan_completed_at?: string | null;
      family_release_approved_at?: string | null;
      created_at: string;
    }>).filter((item) => !item.private_object_path || Boolean(item.scan_completed_at && item.family_release_approved_at)).map(async (item) => {
      const signed = item.private_object_path
        ? await db.storage.from("leaguepilot-private-media").createSignedUrl(item.private_object_path, 300)
        : null;
      return {
        id: item.id,
        teamId: item.team_id,
        title: item.title,
        type: item.media_type,
        url: signed?.data?.signedUrl ?? (item.private_object_path ? "" : item.url),
        moderationStatus: item.moderation_status,
        reportCount: item.report_count ?? 0,
        createdAt: item.created_at
      };
    }))).filter((item) => Boolean(item.url));
    const notificationPreferences: NotificationPreference[] = (preferencesResult.data ?? []).map((preference: {
      id: string;
      user_id: string;
      organization_id: string | null;
      team_id: string | null;
      channel: NotificationPreference["channel"];
      notification_type: NotificationPreference["notificationType"];
      enabled: boolean;
      quiet_hours_start: string | null;
      quiet_hours_end: string | null;
      timezone: string;
      opted_in_at: string | null;
      opted_out_at: string | null;
    }) => ({
      id: preference.id,
      userId: preference.user_id,
      organizationId: preference.organization_id ?? undefined,
      teamId: preference.team_id ?? undefined,
      channel: preference.channel,
      notificationType: preference.notification_type,
      enabled: preference.enabled,
      quietHoursStart: preference.quiet_hours_start ?? undefined,
      quietHoursEnd: preference.quiet_hours_end ?? undefined,
      timezone: preference.timezone,
      optedInAt: preference.opted_in_at ?? undefined,
      optedOutAt: preference.opted_out_at ?? undefined
    }));
    const snackScheduleSlots: SnackScheduleSlot[] = ((snacksResult.data ?? []) as Array<{
      id: string;
      team_id: string;
      event_id: string;
      assigned_parent_user_id: string | null;
      item: string;
      status: SnackScheduleSlot["status"];
      slot_cap?: number | null;
      reminder_draft_count?: number | null;
      reminder_last_drafted_at?: string | null;
      unclaimed_at?: string | null;
      unclaimed_by_user_id?: string | null;
      cancellation_reason?: string | null;
    }>).map((slot) => ({
      id: slot.id,
      teamId: slot.team_id,
      eventId: slot.event_id,
      assignedParentUserId: slot.assigned_parent_user_id ?? undefined,
      item: slot.item,
      status: slot.status,
      slotCap: slot.slot_cap ?? undefined,
      reminderDraftCount: slot.reminder_draft_count ?? undefined,
      reminderLastDraftedAt: slot.reminder_last_drafted_at ?? undefined,
      unclaimedAt: slot.unclaimed_at ?? undefined,
      unclaimedByUserId: slot.unclaimed_by_user_id ?? undefined,
      cancellationReason: slot.cancellation_reason ?? undefined
    }));
    const volunteerSignups: VolunteerSignup[] = ((volunteersResult.data ?? []) as Array<{
      id: string;
      team_id: string;
      event_id: string | null;
      role: string;
      assigned_user_id: string | null;
      status: VolunteerSignup["status"];
      role_cap?: number | null;
      reminder_draft_count?: number | null;
      reminder_last_drafted_at?: string | null;
      unclaimed_at?: string | null;
      unclaimed_by_user_id?: string | null;
      cancellation_reason?: string | null;
    }>).map((signup) => ({
      id: signup.id,
      teamId: signup.team_id,
      eventId: signup.event_id ?? undefined,
      role: signup.role,
      assignedUserId: signup.assigned_user_id ?? undefined,
      status: signup.status,
      roleCap: signup.role_cap ?? undefined,
      reminderDraftCount: signup.reminder_draft_count ?? undefined,
      reminderLastDraftedAt: signup.reminder_last_drafted_at ?? undefined,
      unclaimedAt: signup.unclaimed_at ?? undefined,
      unclaimedByUserId: signup.unclaimed_by_user_id ?? undefined,
      cancellationReason: signup.cancellation_reason ?? undefined
    }));
    const weatherAlerts: WeatherAlert[] = (weatherResult.data ?? []).map((alert: {
      id: string;
      team_id: string;
      event_id: string;
      headline: string;
      detail: string;
      severity: WeatherAlert["severity"];
      status: WeatherAlert["status"];
      created_at: string;
    }) => ({
      id: alert.id,
      teamId: alert.team_id,
      eventId: alert.event_id,
      headline: alert.headline,
      detail: alert.detail,
      severity: alert.severity,
      status: alert.status,
      createdAt: alert.created_at
    }));

    const state: AppState = {
      ...seedState,
      organization: organization ? { id: organization.id, name: organization.name } : seedState.organization,
      activeSeason: season ? {
        id: season.id,
        organizationId: season.organization_id,
        name: season.name,
        status: season.status,
        startsAt: season.starts_at,
        endsAt: season.ends_at,
        archivedAt: season.archived_at ?? undefined
      } : seedState.activeSeason,
      users,
      teams,
      teamMemberships,
      players,
      guardianLinks,
      parentInvites,
      events,
      rsvps,
      announcements,
      mediaItems,
      notificationPreferences,
      snackScheduleSlots,
      volunteerSignups,
      weatherAlerts
    };

    if (options.surface === "parent") {
      const parentState = scopeParentState(state, options.viewerUserId);
      const hasAccess = hasParentSurface(parentState, options.viewerUserId);
      const parentPlayerIds = new Set(parentState.players.map((player) => player.id));
      const parentEventIds = new Set(parentState.events.map((event) => event.id));

      return {
        state: parentState,
        parentUserId: options.viewerUserId,
        coachUserId: "",
        rsvpChangeLogs: rsvpChangeLogs.filter((log) => (
          log.parentUserId === options.viewerUserId &&
          parentPlayerIds.has(log.playerId) &&
          parentEventIds.has(log.eventId)
        )),
        isSupabaseBacked: hasAccess,
        accessStatus: hasAccess ? "live" : "missing_parent_link",
        message: hasAccess
          ? "Showing Supabase roster, guardian, schedule, RSVP, and media rows."
          : "This signed-in user is not linked to an active child guardian record yet."
      };
    }

    const coachState = scopeCoachState(state, options.viewerUserId);
    const hasAccess = hasCoachSurface(coachState, options.viewerUserId);
    const coachPlayerIds = new Set(coachState.players.map((player) => player.id));
    const coachEventIds = new Set(coachState.events.map((event) => event.id));
    const coachTeamIds = new Set(coachState.teams.map((team) => team.id));
    const coachRsvpTargets: CoachRsvpReminderTarget[] = [];
    for (const event of coachState.events.filter((item) => item.status === "scheduled")) {
      const missingByParent = new Map<string, string[]>();
      for (const link of guardianLinks.filter((item) => item.status === "active" && item.parentUserId)) {
        const parentUserId = link.parentUserId;
        if (!parentUserId) continue;
        const player = players.find((item) => item.id === link.playerId);
        if (!player || player.teamId !== event.teamId || !coachTeamIds.has(player.teamId)) continue;
        const hasResponse = rsvps.some((rsvp) => (
          rsvp.eventId === event.id &&
          rsvp.playerId === player.id &&
          rsvp.parentUserId === parentUserId
        ));
        if (hasResponse) continue;
        const names = missingByParent.get(parentUserId) ?? [];
        names.push(`${player.firstName} ${player.lastInitial}.`);
        missingByParent.set(parentUserId, names);
      }
      for (const [parentUserId, playerDisplayNames] of missingByParent) {
        coachRsvpTargets.push({
          id: `${event.id}:${parentUserId}`,
          teamId: event.teamId,
          eventId: event.id,
          eventTitle: event.title,
          parentUserId,
          familyLabel: users.find((user) => user.id === parentUserId)?.name ?? "Linked family",
          playerDisplayNames,
          noResponse: playerDisplayNames.length
        });
      }
    }

    return {
      state: coachState,
      parentUserId: "",
      coachUserId: options.viewerUserId,
      coachRsvpTargets,
      rsvpChangeLogs: rsvpChangeLogs.filter((log) => (
        coachPlayerIds.has(log.playerId) &&
        coachEventIds.has(log.eventId)
      )),
      isSupabaseBacked: hasAccess,
      accessStatus: hasAccess ? "live" : "missing_coach_membership",
      message: hasAccess
        ? "Showing Supabase team membership, roster, RSVP, weather, snack, and volunteer rows."
        : "This signed-in user is not assigned to an active coach membership yet."
    };
  } catch {
    return unavailableDashboardData(options.surface, "Supabase dashboard rows could not be loaded.");
  }
}
