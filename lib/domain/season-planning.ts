import type { AppState, AuditEvent } from "./types";

type DivisionBalanceStatus = "balanced" | "needs_players" | "uneven";

export interface SeasonPlanningMetrics {
  seasonName: string;
  totalTeams: number;
  totalPlayers: number;
  averageRosterSize: number;
  targetRosterSize: number;
  rosterOpenings: number;
  divisions: Array<{
    division: string;
    teamCount: number;
    playerCount: number;
    averageRosterSize: number;
    largestRoster: number;
    smallestRoster: number;
    balanceStatus: DivisionBalanceStatus;
    rosterMakerNote: string;
    bracketMakerNote: string;
  }>;
  bracketRounds: Array<{
    division: string;
    round: string;
    matchups: string[];
  }>;
}

export interface TeamBuildFriendRequest {
  playerId: string;
  friendPlayerId: string;
}

export interface BalancedTeamBuildInput {
  division: string;
  targetRosterSize: number;
  actorUserId: string;
  now: string;
  skillRatings?: Record<string, number>;
  friendRequests?: TeamBuildFriendRequest[];
}

export interface BalancedTeamBuildPreview {
  ok: boolean;
  division: string;
  workflow: Array<"Preview" | "Edit" | "Approve" | "Publish">;
  teams: Array<{
    teamId: string;
    teamName: string;
    playerCount: number;
    averageSkill: number;
    players: Array<{
      playerId: string;
      name: string;
      skillRating: number;
      constraintNotes: string[];
    }>;
  }>;
  warnings: string[];
  auditSummary: string;
  publishBoundary: string;
}

export interface PublishedTeamBuildPlan {
  ok: boolean;
  message: string;
  state: AppState;
  preview: BalancedTeamBuildPreview;
}

function bracketRoundLabel(teamCount: number) {
  if (teamCount <= 2) return "Final";
  if (teamCount <= 4) return "Semifinal";
  if (teamCount <= 8) return "Quarterfinal";
  return "Opening round";
}

function makeBracketMatchups(teamNames: string[]) {
  const ordered = [...teamNames].sort((left, right) => left.localeCompare(right));
  const matchups: string[] = [];
  let leftIndex = 0;
  let rightIndex = ordered.length - 1;

  while (leftIndex <= rightIndex) {
    const home = ordered[leftIndex++];
    const away = ordered[rightIndex--];
    if (!home) continue;
    matchups.push(away && away !== home ? `${home} vs ${away}` : `${home} bye`);
  }

  return matchups;
}

export function computeSeasonPlanningMetrics(state: AppState, targetRosterSize = 10): SeasonPlanningMetrics {
  const divisions = Array.from(new Set(state.teams.map((team) => team.division))).sort();
  const totalPlayers = state.players.length;
  const rosterOpenings = state.teams.reduce((sum, team) => {
    const playerCount = state.players.filter((player) => player.teamId === team.id).length;
    return sum + Math.max(targetRosterSize - playerCount, 0);
  }, 0);

  const divisionMetrics = divisions.map((division) => {
    const teams = state.teams.filter((team) => team.division === division);
    const rosterSizes = teams.map((team) => state.players.filter((player) => player.teamId === team.id).length);
    const playerCount = rosterSizes.reduce((sum, size) => sum + size, 0);
    const largestRoster = rosterSizes.length ? Math.max(...rosterSizes) : 0;
    const smallestRoster = rosterSizes.length ? Math.min(...rosterSizes) : 0;
    const averageRosterSize = teams.length ? Math.round((playerCount / teams.length) * 10) / 10 : 0;
    const spread = largestRoster - smallestRoster;
    const balanceStatus: DivisionBalanceStatus = teams.some((team) => state.players.filter((player) => player.teamId === team.id).length < Math.max(6, targetRosterSize - 3))
      ? "needs_players"
      : spread > 2
        ? "uneven"
        : "balanced";

    return {
      division,
      teamCount: teams.length,
      playerCount,
      averageRosterSize,
      largestRoster,
      smallestRoster,
      balanceStatus,
      rosterMakerNote: balanceStatus === "balanced"
        ? "Roster maker can publish this division with minor coach review."
        : "Roster maker should balance headcount before publishing teams.",
      bracketMakerNote: teams.length >= 2
        ? `${bracketRoundLabel(teams.length)} bracket can be generated from ${teams.length} team(s).`
        : "Bracket maker needs at least 2 teams."
    };
  });

  return {
    seasonName: state.activeSeason.name,
    totalTeams: state.teams.length,
    totalPlayers,
    averageRosterSize: state.teams.length ? Math.round((totalPlayers / state.teams.length) * 10) / 10 : 0,
    targetRosterSize,
    rosterOpenings,
    divisions: divisionMetrics,
    bracketRounds: divisions.map((division) => {
      const teamNames = state.teams.filter((team) => team.division === division).map((team) => team.name);
      return {
        division,
        round: bracketRoundLabel(teamNames.length),
        matchups: makeBracketMatchups(teamNames)
      };
    })
  };
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function guardianGroupKey(state: AppState, playerId: string) {
  const guardian = state.guardianLinks.find((link) => link.playerId === playerId && link.parentUserId && link.status !== "removed");
  return guardian?.parentUserId ?? playerId;
}

function mergeFriendGroups(groups: Map<string, string[]>, playerToGroup: Map<string, string>, friendRequests: TeamBuildFriendRequest[]) {
  for (const request of friendRequests) {
    const leftGroup = playerToGroup.get(request.playerId);
    const rightGroup = playerToGroup.get(request.friendPlayerId);
    if (!leftGroup || !rightGroup || leftGroup === rightGroup) continue;
    const merged = [...(groups.get(leftGroup) ?? []), ...(groups.get(rightGroup) ?? [])];
    groups.set(leftGroup, merged);
    groups.delete(rightGroup);
    for (const playerId of merged) playerToGroup.set(playerId, leftGroup);
  }
}

export function previewBalancedTeamBuild(state: AppState, input: BalancedTeamBuildInput): BalancedTeamBuildPreview {
  const teams = state.teams.filter((team) => team.division === input.division).sort((left, right) => left.name.localeCompare(right.name));
  const players = state.players.filter((player) => teams.some((team) => team.id === player.teamId));
  const workflow: BalancedTeamBuildPreview["workflow"] = ["Preview", "Edit", "Approve", "Publish"];

  if (!teams.length || !players.length) {
    return {
      ok: false,
      division: input.division,
      workflow,
      teams: [],
      warnings: ["Team builder requires at least one division team with rostered players."],
      auditSummary: `No team build preview created for ${input.division}.`,
      publishBoundary: "No roster changes are published without admin approval."
    };
  }

  const groups = new Map<string, string[]>();
  const playerToGroup = new Map<string, string>();
  for (const player of players) {
    const key = guardianGroupKey(state, player.id);
    groups.set(key, [...(groups.get(key) ?? []), player.id]);
    playerToGroup.set(player.id, key);
  }
  mergeFriendGroups(groups, playerToGroup, input.friendRequests ?? []);

  const teamAssignments = new Map(teams.map((team) => [team.id, [] as string[]]));
  const orderedGroups = Array.from(groups.values()).sort((left, right) => {
    const leftSkill = Math.max(...left.map((playerId) => input.skillRatings?.[playerId] ?? 3));
    const rightSkill = Math.max(...right.map((playerId) => input.skillRatings?.[playerId] ?? 3));
    return rightSkill - leftSkill || right.length - left.length;
  });

  for (const group of orderedGroups) {
    const targetTeam = teams
      .map((team) => ({
        team,
        count: teamAssignments.get(team.id)!.length,
        averageSkill: average(teamAssignments.get(team.id)!.map((playerId) => input.skillRatings?.[playerId] ?? 3))
      }))
      .sort((left, right) => left.count - right.count || left.averageSkill - right.averageSkill || left.team.name.localeCompare(right.team.name))[0]!.team;
    teamAssignments.get(targetTeam.id)!.push(...group);
  }

  const teamRows = teams.map((team) => {
    const assignedPlayerIds = teamAssignments.get(team.id) ?? [];
    return {
      teamId: team.id,
      teamName: team.name,
      playerCount: assignedPlayerIds.length,
      averageSkill: average(assignedPlayerIds.map((playerId) => input.skillRatings?.[playerId] ?? 3)),
      players: assignedPlayerIds.map((playerId) => {
        const player = state.players.find((item) => item.id === playerId)!;
        const guardianKey = guardianGroupKey(state, playerId);
        const siblingCount = groups.get(guardianKey)?.length ?? 1;
        const hasFriendRequest = (input.friendRequests ?? []).some((request) => request.playerId === playerId || request.friendPlayerId === playerId);
        return {
          playerId,
          name: `${player.firstName} ${player.lastInitial}.`,
          skillRating: input.skillRatings?.[playerId] ?? 3,
          constraintNotes: [
            `Age/division: ${input.division}`,
            siblingCount > 1 ? "Sibling/guardian group kept together" : "No sibling grouping required",
            hasFriendRequest ? "Friend request considered" : "No friend request"
          ]
        };
      })
    };
  });

  const warnings = [
    ...teamRows.filter((team) => team.playerCount > input.targetRosterSize).map((team) => `${team.teamName} exceeds target roster size ${input.targetRosterSize}.`),
    ...teamRows.filter((team) => team.playerCount === 0).map((team) => `${team.teamName} has no assigned players in this preview.`),
    "Skill ratings default to 3 until explicit evaluations are imported.",
    "Age is represented by division until player birthdate/age-band metadata is added."
  ];

  return {
    ok: true,
    division: input.division,
    workflow,
    teams: teamRows,
    warnings,
    auditSummary: `Balanced team preview for ${input.division}: ${players.length} player(s), ${teams.length} team(s), target roster ${input.targetRosterSize}.`,
    publishBoundary: "Preview does not update player.teamId. Admin must edit, approve, and publish before roster assignments change."
  };
}

export function publishBalancedTeamBuild(state: AppState, input: BalancedTeamBuildInput): PublishedTeamBuildPlan {
  const preview = previewBalancedTeamBuild(state, input);
  if (!preview.ok) return { ok: false, message: "Team build preview is not publishable.", state, preview };
  const actor = state.users.find((user) => user.id === input.actorUserId);
  if (actor?.role !== "admin") return { ok: false, message: "Only org admins can publish automatic team builds.", state, preview };

  const playerTeamById = new Map<string, string>();
  for (const team of preview.teams) {
    for (const player of team.players) playerTeamById.set(player.playerId, team.teamId);
  }
  const auditEvent: AuditEvent = {
    id: `audit-team-builder-${Date.parse(input.now)}-${state.auditEvents.length + 1}`,
    actorUserId: input.actorUserId,
    action: "automatic_team_build_published",
    targetType: "division",
    targetId: input.division,
    summary: preview.auditSummary,
    createdAt: input.now
  };

  return {
    ok: true,
    message: `Automatic team build published for ${input.division}; ${playerTeamById.size} player assignment(s) updated with audit proof.`,
    preview,
    state: {
      ...state,
      players: state.players.map((player) => playerTeamById.has(player.id) ? { ...player, teamId: playerTeamById.get(player.id)! } : player),
      auditEvents: [auditEvent, ...state.auditEvents]
    }
  };
}
