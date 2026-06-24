import type { AppState, LeagueEvent, MediaItem, Player, Rsvp, Team } from "./types";

export interface ParentDashboardPlayer {
  player: Player;
  team: Team;
}

export interface ParentDashboardData {
  children: ParentDashboardPlayer[];
  nextEvents: LeagueEvent[];
  latestAnnouncement?: {
    title: string;
    body: string;
    teamName: string;
    createdAt: string;
  };
  rsvpNeeded: Array<{
    event: LeagueEvent;
    player: Player;
    currentRsvp?: Rsvp;
  }>;
  recentMedia: MediaItem[];
  completionStatus: string;
}

export function getParentDashboard(state: AppState, parentUserId: string, now = new Date().toISOString()): ParentDashboardData {
  const nowMs = new Date(now).getTime();
  const guardianLinks = state.guardianLinks.filter((link) => link.parentUserId === parentUserId && link.status === "active");
  const playerIds = new Set(guardianLinks.map((link) => link.playerId));
  const players = state.players.filter((player) => playerIds.has(player.id));
  const teamIds = new Set(players.map((player) => player.teamId));
  const children = players.map((player) => ({
    player,
    team: state.teams.find((team) => team.id === player.teamId)!
  })).filter((item) => item.team);

  const nextEvents = state.events
    .filter((event) => teamIds.has(event.teamId) && event.status === "scheduled" && new Date(event.startsAt).getTime() >= nowMs)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 3);

  const latestAnnouncement = state.announcements
    .filter((announcement) => teamIds.has(announcement.teamId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((announcement) => ({
      title: announcement.title,
      body: announcement.body,
      teamName: state.teams.find((team) => team.id === announcement.teamId)?.name ?? "Team",
      createdAt: announcement.createdAt
    }))[0];

  const rsvpNeeded = nextEvents.flatMap((event) => {
    const eventPlayers = players.filter((player) => player.teamId === event.teamId);
    return eventPlayers.map((player) => ({
      event,
      player,
      currentRsvp: state.rsvps.find((rsvp) => rsvp.eventId === event.id && rsvp.playerId === player.id)
    }));
  }).filter((item) => !item.currentRsvp);

  const recentMedia = state.mediaItems
    .filter((item) => teamIds.has(item.teamId) && (item.moderationStatus ?? "approved") === "approved")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  return {
    children,
    nextEvents,
    latestAnnouncement,
    rsvpNeeded,
    recentMedia,
    completionStatus: children.length ? "Registration complete" : "Invite or registration still pending"
  };
}
