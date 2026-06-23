import { seedState, type Announcement, type AppState, type GuardianLink, type LeagueEvent, type MediaItem, type ParentInvite, type Player, type Rsvp, type SnackScheduleSlot, type Team, type TeamMembership, type User, type VolunteerSignup, type WeatherAlert } from "@/lib/domain";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Dashboard tables span staged migrations; keep this adapter dynamic until generated types are refreshed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

export interface ParentCoachDashboardData {
  state: AppState;
  parentUserId: string;
  coachUserId: string;
  isSupabaseBacked: boolean;
  accessStatus: "live" | "signed_out" | "missing_parent_link" | "missing_coach_membership" | "unavailable";
  message: string;
}

export interface ParentCoachDashboardReadOptions {
  viewerUserId?: string;
  surface: "parent" | "coach";
}

function adminDb() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
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
    mediaItems: state.mediaItems.filter((item) => teamIds.has(item.teamId))
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
      announcementsResult,
      mediaResult,
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
      db.from("events").select("id,organization_id,team_id,season_id,title,event_type,starts_at,ends_at,location_name,location_address,status,opponent,created_at,updated_at").order("starts_at", { ascending: true }),
      db.from("rsvps").select("id,event_id,player_id,parent_user_id,response,note,responded_at,created_at,updated_at").order("responded_at", { ascending: false }),
      db.from("announcements").select("id,team_id,author_user_id,title,body,created_at").order("created_at", { ascending: false }),
      db.from("media_items").select("id,team_id,title,media_type,url,created_at").order("created_at", { ascending: false }),
      db.from("snack_schedule_slots").select("id,team_id,event_id,assigned_parent_user_id,item,status").order("created_at", { ascending: true }),
      db.from("volunteer_signups").select("id,team_id,event_id,role,assigned_user_id,status").order("created_at", { ascending: true }),
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
      announcementsResult,
      mediaResult,
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
      createdAt: event.created_at,
      updatedAt: event.updated_at
    }));
    const rsvps: Rsvp[] = (rsvpsResult.data ?? []).map((rsvp: {
      id: string;
      event_id: string;
      player_id: string;
      parent_user_id: string;
      response: Rsvp["response"];
      note: string | null;
      responded_at: string;
      created_at: string;
      updated_at: string;
    }) => ({
      id: rsvp.id,
      eventId: rsvp.event_id,
      playerId: rsvp.player_id,
      parentUserId: rsvp.parent_user_id,
      response: rsvp.response,
      note: rsvp.note ?? undefined,
      respondedAt: rsvp.responded_at,
      createdAt: rsvp.created_at,
      updatedAt: rsvp.updated_at
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
    const mediaItems: MediaItem[] = (mediaResult.data ?? []).map((item: {
      id: string;
      team_id: string;
      title: string;
      media_type: MediaItem["type"];
      url: string;
      created_at: string;
    }) => ({
      id: item.id,
      teamId: item.team_id,
      title: item.title,
      type: item.media_type,
      url: item.url,
      createdAt: item.created_at
    }));
    const snackScheduleSlots: SnackScheduleSlot[] = (snacksResult.data ?? []).map((slot: {
      id: string;
      team_id: string;
      event_id: string;
      assigned_parent_user_id: string | null;
      item: string;
      status: SnackScheduleSlot["status"];
    }) => ({
      id: slot.id,
      teamId: slot.team_id,
      eventId: slot.event_id,
      assignedParentUserId: slot.assigned_parent_user_id ?? undefined,
      item: slot.item,
      status: slot.status
    }));
    const volunteerSignups: VolunteerSignup[] = (volunteersResult.data ?? []).map((signup: {
      id: string;
      team_id: string;
      event_id: string | null;
      role: string;
      assigned_user_id: string | null;
      status: VolunteerSignup["status"];
    }) => ({
      id: signup.id,
      teamId: signup.team_id,
      eventId: signup.event_id ?? undefined,
      role: signup.role,
      assignedUserId: signup.assigned_user_id ?? undefined,
      status: signup.status
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
      snackScheduleSlots,
      volunteerSignups,
      weatherAlerts
    };

    if (options.surface === "parent") {
      const parentState = scopeParentState(state, options.viewerUserId);
      const hasAccess = hasParentSurface(parentState, options.viewerUserId);

      return {
        state: parentState,
        parentUserId: options.viewerUserId,
        coachUserId: "",
        isSupabaseBacked: hasAccess,
        accessStatus: hasAccess ? "live" : "missing_parent_link",
        message: hasAccess
          ? "Showing Supabase roster, guardian, schedule, RSVP, and media rows."
          : "This signed-in user is not linked to an active child guardian record yet."
      };
    }

    const coachState = scopeCoachState(state, options.viewerUserId);
    const hasAccess = hasCoachSurface(coachState, options.viewerUserId);

    return {
      state: coachState,
      parentUserId: "",
      coachUserId: options.viewerUserId,
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
