import type { AppState } from "./types";

export interface HealthCard {
  id: string;
  title: string;
  count: number;
  status: "ok" | "warning" | "danger";
  detail: string;
}

export function computeAdminHealth(state: AppState, now = new Date().toISOString()): HealthCard[] {
  const nowMs = new Date(now).getTime();
  const activeGuardianPlayerIds = new Set(state.guardianLinks.filter((link) => link.status === "active" && link.parentUserId).map((link) => link.playerId));
  const pendingInvites = state.parentInvites.filter((invite) => invite.status === "pending" && new Date(invite.expiresAt).getTime() >= nowMs);
  const failedInvites = state.parentInvites.filter((invite) => invite.deliveryStatus === "failed");
  const teamsWithUpcomingEvents = new Set(state.events.filter((event) => event.status === "scheduled" && new Date(event.startsAt).getTime() >= nowMs).map((event) => event.teamId));
  const latestImport = state.rosterImportReports[0];
  const recentMedia = state.mediaItems.filter((item) => nowMs - new Date(item.createdAt).getTime() <= 14 * 24 * 60 * 60 * 1000);

  const cards: HealthCard[] = [
    {
      id: "missing-coaches",
      title: "Teams without coaches",
      count: state.teams.filter((team) => !team.coachUserId).length,
      status: state.teams.some((team) => !team.coachUserId) ? "warning" : "ok",
      detail: "Teams should have an active coach before launch."
    },
    {
      id: "players-without-parents",
      title: "Players without parent contact",
      count: state.players.filter((player) => !activeGuardianPlayerIds.has(player.id)).length,
      status: state.players.some((player) => !activeGuardianPlayerIds.has(player.id)) ? "danger" : "ok",
      detail: "Every player needs an active guardian link or pending invite."
    },
    {
      id: "pending-invites",
      title: "Pending parent invites",
      count: pendingInvites.length,
      status: pendingInvites.length ? "warning" : "ok",
      detail: "Pending invites need follow-up before families can join."
    },
    {
      id: "failed-invites",
      title: "Failed SMS/email invites",
      count: failedInvites.length,
      status: failedInvites.length ? "danger" : "ok",
      detail: "Failed delivery should be reviewed before launch."
    },
    {
      id: "duplicate-warnings",
      title: "Duplicate roster warnings",
      count: latestImport?.warningRows ?? 0,
      status: latestImport?.warningRows ? "warning" : "ok",
      detail: "Warnings do not always block import, but they need admin review."
    },
    {
      id: "teams-without-events",
      title: "Teams with no upcoming events",
      count: state.teams.filter((team) => !teamsWithUpcomingEvents.has(team.id)).length,
      status: state.teams.some((team) => !teamsWithUpcomingEvents.has(team.id)) ? "warning" : "ok",
      detail: "Teams should have at least one upcoming game or practice."
    },
    {
      id: "recent-media",
      title: "Recent media uploads",
      count: recentMedia.length,
      status: "ok",
      detail: "Recent media keeps parent dashboards useful."
    },
    {
      id: "archive-status",
      title: "Archived season status",
      count: state.activeSeason.status === "archived" ? 1 : 0,
      status: state.activeSeason.status === "archived" ? "ok" : "warning",
      detail: state.activeSeason.status === "archived" ? "Season has been archived." : "Current season is active and not archived."
    }
  ];

  return cards;
}
