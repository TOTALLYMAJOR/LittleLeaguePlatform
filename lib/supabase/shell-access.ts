import "server-only";

import { cookies } from "next/headers";
import { seedState, type AppState } from "@/lib/domain";
import {
  buildShellAttentionBadges,
  countMissingRsvpSlots,
  countUnreadMessages,
  type ShellAttentionBadge
} from "@/lib/navigation/shell-attention";
import type { ClientShellAccess, ProductRole, RoleSwitchLink, RouteAuthoritySource } from "@/lib/navigation/route-topology";
import type { ActiveContext, LeaguePilotRole } from "@/lib/operational-truth";
import { createSupabaseAdminClient } from "./admin";
import type { ParentCoachDashboardData } from "./dashboard-data";
import { getSupabaseServerUser } from "./server";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Shell access spans role tables from staged migrations; keep this dynamic
  // until generated database types cover every migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

export interface ServerShellAccess extends ClientShellAccess {
  parentTeamIds: string[];
  coachTeamIds: string[];
  adminOrganizationIds: string[];
  adminTeamIds: string[];
}

export interface PageAccessDecision {
  ok: boolean;
  access: ServerShellAccess;
  dashboardData?: ParentCoachDashboardData;
  message: string;
}

const signedOutServerShellAccess: ServerShellAccess = {
  signedIn: false,
  canParent: false,
  canCoach: false,
  canAdmin: false,
  roleSwitchLinks: [],
  parentTeamIds: [],
  coachTeamIds: [],
  adminOrganizationIds: [],
  adminTeamIds: [],
  contexts: []
};

export function toClientShellAccess(access: ServerShellAccess): ClientShellAccess {
  return {
    signedIn: access.signedIn,
    userId: access.userId,
    canParent: access.canParent,
    canCoach: access.canCoach,
    canAdmin: access.canAdmin,
    roleSwitchLinks: access.roleSwitchLinks,
    contexts: access.contexts,
    attentionBadges: access.attentionBadges
  };
}

export async function getServerShellAccess(
  options: { includeAttention?: boolean } = {}
): Promise<ServerShellAccess> {
  const user = await getSupabaseServerUser();
  if (!user) return signedOutServerShellAccess;

  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const [
      { data: memberships },
      { data: adminMemberships },
      { data: guardianLinks }
    ] = await withSupabaseTimeout(Promise.all([
      db
        .from("team_memberships")
        .select("team_id,role,status")
        .eq("user_id", user.id)
        .eq("status", "active"),
      db
        .from("organization_memberships")
        .select("organization_id,role,status")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .eq("status", "active"),
      db
        .from("player_guardians")
        .select("player_id,status")
        .eq("parent_user_id", user.id)
        .eq("status", "active")
    ]), 7000) as [
      { data: Array<{ team_id: string; role: "parent" | "coach"; status: string }> | null },
      { data: Array<{ organization_id: string; role: "admin"; status: string }> | null },
      { data: Array<{ player_id: string; status: string }> | null }
    ];

    const membershipParentTeamIds = unique((memberships ?? [])
      .filter((membership) => membership.role === "parent")
      .map((membership) => membership.team_id));
    const coachTeamIds = unique((memberships ?? [])
      .filter((membership) => membership.role === "coach")
      .map((membership) => membership.team_id));
    const adminOrganizationIds = unique((adminMemberships ?? []).map((membership) => membership.organization_id));
    const guardianPlayerIds = unique((guardianLinks ?? []).map((link) => link.player_id));

    const guardianTeamIds = guardianPlayerIds.length
      ? await readPlayerTeamIds(db, guardianPlayerIds)
      : [];
    const adminTeamIds = adminOrganizationIds.length
      ? await readOrganizationTeamIds(db, adminOrganizationIds)
      : [];
    const parentTeamIds = unique([...membershipParentTeamIds, ...guardianTeamIds]);
    const roleSwitchLinks = buildRoleSwitchLinks({
      canParent: parentTeamIds.length > 0,
      canCoach: coachTeamIds.length > 0,
      canAdmin: adminOrganizationIds.length > 0
    });
    const contexts = await readActiveContexts({
      db,
      actorUserId: user.id,
      parentTeamIds,
      parentPlayerIds: guardianPlayerIds,
      coachTeamIds,
      adminOrganizationIds,
      adminTeamIds
    });

    const attentionBadges = options.includeAttention
      ? await readShellAttentionBadges(db, {
        viewerUserId: user.id,
        parentTeamIds,
        guardianPlayerIds,
        coachTeamIds,
        adminOrganizationIds
      })
      : undefined;
    const activeRole = await readValidatedPersistedRole(contexts);

    return {
      signedIn: true,
      userId: user.id,
      canParent: parentTeamIds.length > 0,
      canCoach: coachTeamIds.length > 0,
      canAdmin: adminOrganizationIds.length > 0,
      activeRole: activeRole.role,
      activeRoleSource: activeRole.source,
      roleSwitchLinks,
      parentTeamIds,
      coachTeamIds,
      adminOrganizationIds,
      adminTeamIds,
      contexts,
      attentionBadges
    };
  } catch {
    return {
      ...signedOutServerShellAccess,
      signedIn: true,
      userId: user.id
    };
  }
}

async function readValidatedPersistedRole(contexts: ActiveContext[]): Promise<{
  role?: ProductRole;
  source?: RouteAuthoritySource;
}> {
  const cookieStore = await cookies();
  const rawRole = cookieStore.get("leaguepilot-active-role")?.value;
  if (rawRole !== "parent" && rawRole !== "coach" && rawRole !== "admin") return {};
  return contexts.some((context) => context.role === rawRole)
    ? { role: rawRole, source: "server-persisted" }
    : { source: "unsupported" };
}

export async function requireParentPageAccess(): Promise<PageAccessDecision> {
  const access = await getServerShellAccess();
  if (!access.signedIn || !access.userId) {
    return {
      ok: false,
      access,
      dashboardData: createDashboardAccessData("parent", "signed_out", undefined, "Sign in with a linked parent account to see children, schedules, media, and RSVPs."),
      message: "Signed-in parent access is required."
    };
  }
  if (!access.canParent) {
    return {
      ok: false,
      access,
      dashboardData: createDashboardAccessData("parent", "missing_parent_link", access.userId, "This signed-in user is not linked to an active child guardian record yet."),
      message: "An active guardian link is required."
    };
  }
  return { ok: true, access, message: "Access allowed." };
}

export async function requireCoachPageAccess(): Promise<PageAccessDecision> {
  const access = await getServerShellAccess();
  if (!access.signedIn || !access.userId) {
    return {
      ok: false,
      access,
      dashboardData: createDashboardAccessData("coach", "signed_out", undefined, "Sign in with an assigned coach account to see team attendance, weather, snacks, and volunteers."),
      message: "Signed-in coach access is required."
    };
  }
  if (!access.canCoach) {
    return {
      ok: false,
      access,
      dashboardData: createDashboardAccessData("coach", "missing_coach_membership", access.userId, "This signed-in user is not assigned to an active coach membership yet."),
      message: "An active coach team membership is required."
    };
  }
  return { ok: true, access, message: "Access allowed." };
}

export async function requireAdminPageAccess(): Promise<PageAccessDecision> {
  const access = await getServerShellAccess();
  if (!access.signedIn || !access.userId) {
    return {
      ok: false,
      access,
      message: "Sign in with an active organization admin account before viewing admin operations."
    };
  }
  if (!access.canAdmin) {
    return {
      ok: false,
      access,
      message: "Only active organization admins can view this admin route."
    };
  }
  return { ok: true, access, message: "Access allowed." };
}

function buildRoleSwitchLinks(access: Pick<ClientShellAccess, "canParent" | "canCoach" | "canAdmin">): RoleSwitchLink[] {
  return [
    ...(access.canParent ? [{ href: "/parent", label: "Parent Home", role: "parent" as const }] : []),
    ...(access.canCoach ? [{ href: "/coach", label: "Coach Home", role: "coach" as const }] : []),
    ...(access.canAdmin ? [{ href: "/admin", label: "Admin Overview", role: "admin" as const }] : [])
  ];
}

async function readPlayerTeamIds(db: UnsafeSupabase, playerIds: string[]) {
  const { data } = await withSupabaseTimeout(db
    .from("players")
    .select("id,team_id")
    .in("id", playerIds), 7000) as {
      data: Array<{ id: string; team_id: string }> | null;
    };
  return unique((data ?? []).map((player) => player.team_id));
}

async function readOrganizationTeamIds(db: UnsafeSupabase, organizationIds: string[]) {
  const { data } = await withSupabaseTimeout(db
    .from("teams")
    .select("id,organization_id")
    .in("organization_id", organizationIds), 7000) as {
      data: Array<{ id: string; organization_id: string }> | null;
    };
  return unique((data ?? []).map((team) => team.id));
}

async function readActiveContexts(input: {
  db: UnsafeSupabase;
  actorUserId: string;
  parentTeamIds: string[];
  parentPlayerIds: string[];
  coachTeamIds: string[];
  adminOrganizationIds: string[];
  adminTeamIds: string[];
}): Promise<ActiveContext[]> {
  const allTeamIds = unique([...input.parentTeamIds, ...input.coachTeamIds, ...input.adminTeamIds]);
  const { data: teamRows } = allTeamIds.length
    ? await withSupabaseTimeout(input.db
      .from("teams")
      .select("id,name,organization_id,season_id")
      .in("id", allTeamIds), 7000) as {
        data: Array<{ id: string; name: string; organization_id: string; season_id: string }> | null;
      }
    : { data: [] };
  const organizationIds = unique([
    ...input.adminOrganizationIds,
    ...(teamRows ?? []).map((team) => team.organization_id)
  ]);
  const seasonIds = unique((teamRows ?? []).map((team) => team.season_id));
  const [{ data: organizationRows }, { data: seasonRows }] = await Promise.all([
    organizationIds.length
      ? withSupabaseTimeout(input.db
        .from("organizations")
        .select("id,name")
        .in("id", organizationIds), 7000) as Promise<{
          data: Array<{ id: string; name: string }> | null;
        }>
      : Promise.resolve({ data: [] }),
    seasonIds.length
      ? withSupabaseTimeout(input.db
        .from("seasons")
        .select("id,organization_id,name,status")
        .in("id", seasonIds), 7000) as Promise<{
          data: Array<{ id: string; organization_id: string; name: string; status: "active" | "archived" }> | null;
        }>
      : Promise.resolve({ data: [] })
  ]);

  return ([
    buildContextForRole({
      role: "parent",
      actorUserId: input.actorUserId,
      permittedTeamIds: input.parentTeamIds,
      permittedPlayerIds: input.parentPlayerIds,
      organizationIds: [],
      teamRows: teamRows ?? [],
      organizationRows: organizationRows ?? [],
      seasonRows: seasonRows ?? []
    }),
    buildContextForRole({
      role: "coach",
      actorUserId: input.actorUserId,
      permittedTeamIds: input.coachTeamIds,
      permittedPlayerIds: [],
      organizationIds: [],
      teamRows: teamRows ?? [],
      organizationRows: organizationRows ?? [],
      seasonRows: seasonRows ?? []
    }),
    buildContextForRole({
      role: "admin",
      actorUserId: input.actorUserId,
      permittedTeamIds: input.adminTeamIds,
      permittedPlayerIds: [],
      organizationIds: input.adminOrganizationIds,
      teamRows: teamRows ?? [],
      organizationRows: organizationRows ?? [],
      seasonRows: seasonRows ?? []
    })
  ] satisfies Array<ActiveContext | undefined>).filter((context): context is ActiveContext => Boolean(context));
}

function buildContextForRole(input: {
  role: LeaguePilotRole;
  actorUserId: string;
  permittedTeamIds: string[];
  permittedPlayerIds: string[];
  organizationIds: string[];
  teamRows: Array<{ id: string; name: string; organization_id: string; season_id: string }>;
  organizationRows: Array<{ id: string; name: string }>;
  seasonRows: Array<{ id: string; organization_id: string; name: string; status: "active" | "archived" }>;
}): ActiveContext | undefined {
  const team = input.teamRows.find((row) => input.permittedTeamIds.includes(row.id));
  const organizationId = team?.organization_id ?? input.organizationIds[0];
  if (!organizationId) return undefined;
  const organization = input.organizationRows.find((row) => row.id === organizationId);
  const season = input.seasonRows.find((row) => row.id === team?.season_id)
    ?? input.seasonRows.find((row) => row.organization_id === organizationId);
  if (!season) return undefined;
  const archived = season.status === "archived";
  return {
    actorUserId: input.actorUserId,
    role: input.role,
    organizationId,
    organizationName: organization?.name ?? "Organization",
    seasonId: season.id,
    seasonName: season.name,
    teamId: input.role === "admin" ? undefined : team?.id,
    teamName: input.role === "admin" ? undefined : team?.name,
    permittedTeamIds: input.permittedTeamIds,
    permittedPlayerIds: input.permittedPlayerIds,
    contextKey: [input.role, organizationId, season.id, input.role === "admin" ? "all-teams" : team?.id ?? "no-team"].join(":"),
    archived,
    readOnly: archived
  };
}

function createDashboardAccessData(
  surface: "parent" | "coach",
  accessStatus: ParentCoachDashboardData["accessStatus"],
  userId: string | undefined,
  message: string
): ParentCoachDashboardData {
  return {
    state: emptyDashboardState(),
    parentUserId: surface === "parent" ? userId ?? "" : "",
    coachUserId: surface === "coach" ? userId ?? "" : "",
    isSupabaseBacked: false,
    accessStatus,
    message
  };
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

const ATTENTION_HORIZON_DAYS = 14;

async function readShellAttentionBadges(db: UnsafeSupabase, input: {
  viewerUserId: string;
  parentTeamIds: string[];
  guardianPlayerIds: string[];
  coachTeamIds: string[];
  adminOrganizationIds: string[];
}): Promise<ShellAttentionBadge[]> {
  try {
    const now = new Date();
    const horizon = new Date(now.getTime() + ATTENTION_HORIZON_DAYS * 24 * 60 * 60 * 1000);
    const unreadSince = new Date(now.getTime() - ATTENTION_HORIZON_DAYS * 24 * 60 * 60 * 1000);
    const rsvpTeamIds = unique([...input.parentTeamIds, ...input.coachTeamIds]);

    const { data: eventRows } = rsvpTeamIds.length
      ? await withSupabaseTimeout(db
        .from("events")
        .select("id,team_id")
        .in("team_id", rsvpTeamIds)
        .eq("status", "scheduled")
        .gte("starts_at", now.toISOString())
        .lte("starts_at", horizon.toISOString())
        .limit(60), 5000) as { data: Array<{ id: string; team_id: string }> | null }
      : { data: [] };
    const events = (eventRows ?? []).map((row) => ({ id: row.id, teamId: row.team_id }));
    const eventIds = events.map((event) => event.id);

    const [{ data: guardianPlayerRows }, { data: coachPlayerRows }, { data: rsvpRows }, pendingRegistrations, { data: messageRows }] = await Promise.all([
      input.guardianPlayerIds.length && events.length
        ? withSupabaseTimeout(db
          .from("players")
          .select("id,team_id")
          .in("id", input.guardianPlayerIds), 5000) as Promise<{ data: Array<{ id: string; team_id: string }> | null }>
        : Promise.resolve({ data: [] }),
      input.coachTeamIds.length && events.length
        ? withSupabaseTimeout(db
          .from("players")
          .select("id,team_id")
          .in("team_id", input.coachTeamIds), 5000) as Promise<{ data: Array<{ id: string; team_id: string }> | null }>
        : Promise.resolve({ data: [] }),
      eventIds.length
        ? withSupabaseTimeout(db
          .from("rsvps")
          .select("event_id,player_id")
          .in("event_id", eventIds), 5000) as Promise<{ data: Array<{ event_id: string; player_id: string }> | null }>
        : Promise.resolve({ data: [] }),
      input.adminOrganizationIds.length
        ? withSupabaseTimeout(db
          .from("registration_requests")
          .select("id", { count: "exact", head: true })
          .in("organization_id", input.adminOrganizationIds)
          .eq("status", "pending"), 5000) as Promise<{ count: number | null }>
        : Promise.resolve({ count: 0 }),
      rsvpTeamIds.length
        ? withSupabaseTimeout(db
          .from("team_chat_messages")
          .select("team_id,author_user_id,read_by_user_ids")
          .in("team_id", rsvpTeamIds)
          .eq("moderation_status", "visible")
          .gte("created_at", unreadSince.toISOString())
          .limit(300), 5000) as Promise<{ data: Array<{ team_id: string; author_user_id: string; read_by_user_ids: string[] | null }> | null }>
        : Promise.resolve({ data: [] })
    ]);

    const rsvps = (rsvpRows ?? []).map((row) => ({ eventId: row.event_id, playerId: row.player_id }));
    const parentEvents = events.filter((event) => input.parentTeamIds.includes(event.teamId));
    const coachEvents = events.filter((event) => input.coachTeamIds.includes(event.teamId));
    const messages = (messageRows ?? []).map((row) => ({
      teamId: row.team_id,
      authorUserId: row.author_user_id,
      readByUserIds: row.read_by_user_ids ?? []
    }));

    return buildShellAttentionBadges({
      parentMissingRsvps: countMissingRsvpSlots(
        parentEvents,
        (guardianPlayerRows ?? []).map((row) => ({ id: row.id, teamId: row.team_id })),
        rsvps
      ),
      coachMissingRsvps: countMissingRsvpSlots(
        coachEvents,
        (coachPlayerRows ?? []).map((row) => ({ id: row.id, teamId: row.team_id })),
        rsvps
      ),
      pendingRegistrations: pendingRegistrations.count ?? 0,
      parentUnreadMessages: countUnreadMessages(messages, input.viewerUserId, input.parentTeamIds),
      coachUnreadMessages: countUnreadMessages(messages, input.viewerUserId, input.coachTeamIds)
    });
  } catch {
    // Badges are advisory; the shell renders without them when reads fail.
    return [];
  }
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
