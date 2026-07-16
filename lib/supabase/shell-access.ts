import "server-only";

import { seedState, type AppState } from "@/lib/domain";
import type { ClientShellAccess, RoleSwitchLink } from "@/lib/navigation/route-topology";
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
  adminTeamIds: []
};

export function toClientShellAccess(access: ServerShellAccess): ClientShellAccess {
  return {
    signedIn: access.signedIn,
    userId: access.userId,
    canParent: access.canParent,
    canCoach: access.canCoach,
    canAdmin: access.canAdmin,
    roleSwitchLinks: access.roleSwitchLinks
  };
}

export async function getServerShellAccess(): Promise<ServerShellAccess> {
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

    return {
      signedIn: true,
      userId: user.id,
      canParent: parentTeamIds.length > 0,
      canCoach: coachTeamIds.length > 0,
      canAdmin: adminOrganizationIds.length > 0,
      roleSwitchLinks,
      parentTeamIds,
      coachTeamIds,
      adminOrganizationIds,
      adminTeamIds
    };
  } catch {
    return {
      ...signedOutServerShellAccess,
      signedIn: true,
      userId: user.id
    };
  }
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

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}
