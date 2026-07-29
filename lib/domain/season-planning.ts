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

export interface TeamBuilderPlayerProfileInput {
  birthDate?: string | null;
  ageBand?: string | null;
  evaluationRating?: number | null;
}

export interface TeamBuilderRosterContext {
  teams: Array<{ id: string; name: string; division: string }>;
  players: Array<{
    id: string;
    teamId: string;
    firstName: string;
    lastInitial: string;
    guardianGroupId?: string;
  }>;
}

export interface BalancedTeamBuildInput {
  division: string;
  targetRosterSize: number;
  actorUserId: string;
  now: string;
  skillRatings?: Record<string, number>;
  playerProfiles?: Record<string, TeamBuilderPlayerProfileInput>;
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
    ageBandCounts: Record<string, number>;
    missingProfileCount: number;
    defaultedEvaluationCount: number;
    players: Array<{
      playerId: string;
      name: string;
      skillRating: number;
      ageBand: string;
      ageBandSource: "explicit" | "division_default";
      evaluationSource: "explicit" | "legacy_override" | "defaulted";
      birthDateStatus: "recorded" | "missing";
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

function guardianGroupKey(roster: TeamBuilderRosterContext, playerId: string) {
  return roster.players.find((player) => player.id === playerId)?.guardianGroupId ?? playerId;
}

function normalizedEvaluation(input: BalancedTeamBuildInput, playerId: string) {
  const explicit = input.playerProfiles?.[playerId]?.evaluationRating;
  if (typeof explicit === "number" && Number.isInteger(explicit) && explicit >= 1 && explicit <= 5) {
    return { value: explicit, source: "explicit" as const };
  }
  const legacy = input.skillRatings?.[playerId];
  if (typeof legacy === "number" && Number.isInteger(legacy) && legacy >= 1 && legacy <= 5) {
    return { value: legacy, source: "legacy_override" as const };
  }
  return { value: 3, source: "defaulted" as const };
}

function normalizedAgeBand(input: BalancedTeamBuildInput, playerId: string) {
  const explicit = input.playerProfiles?.[playerId]?.ageBand?.trim();
  return explicit
    ? { value: explicit, source: "explicit" as const }
    : { value: input.division, source: "division_default" as const };
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

export function previewBalancedTeamBuildRoster(roster: TeamBuilderRosterContext, input: BalancedTeamBuildInput): BalancedTeamBuildPreview {
  const teams = roster.teams.filter((team) => team.division === input.division).sort((left, right) => left.name.localeCompare(right.name));
  const players = roster.players.filter((player) => teams.some((team) => team.id === player.teamId));
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
    const key = guardianGroupKey(roster, player.id);
    groups.set(key, [...(groups.get(key) ?? []), player.id]);
    playerToGroup.set(player.id, key);
  }
  mergeFriendGroups(groups, playerToGroup, input.friendRequests ?? []);

  const teamAssignments = new Map(teams.map((team) => [team.id, [] as string[]]));
  const orderedGroups = Array.from(groups.values()).sort((left, right) => {
    const leftSkill = Math.max(...left.map((playerId) => normalizedEvaluation(input, playerId).value));
    const rightSkill = Math.max(...right.map((playerId) => normalizedEvaluation(input, playerId).value));
    return rightSkill - leftSkill
      || right.length - left.length
      || [...left].sort().join(":").localeCompare([...right].sort().join(":"));
  });

  for (const group of orderedGroups) {
    const targetTeam = teams
      .map((team) => ({
        team,
        count: teamAssignments.get(team.id)!.length,
        averageSkill: average(teamAssignments.get(team.id)!.map((playerId) => normalizedEvaluation(input, playerId).value))
      }))
      .sort((left, right) => left.count - right.count || left.averageSkill - right.averageSkill || left.team.name.localeCompare(right.team.name))[0]!.team;
    teamAssignments.get(targetTeam.id)!.push(...group);
  }

  const teamRows = teams.map((team) => {
    const assignedPlayerIds = [...(teamAssignments.get(team.id) ?? [])].sort((left, right) => {
      const evaluationDifference = normalizedEvaluation(input, right).value - normalizedEvaluation(input, left).value;
      return evaluationDifference
        || normalizedAgeBand(input, left).value.localeCompare(normalizedAgeBand(input, right).value)
        || left.localeCompare(right);
    });
    const ageBandCounts = assignedPlayerIds.reduce<Record<string, number>>((counts, playerId) => {
      const ageBand = normalizedAgeBand(input, playerId).value;
      counts[ageBand] = (counts[ageBand] ?? 0) + 1;
      return counts;
    }, {});
    return {
      teamId: team.id,
      teamName: team.name,
      playerCount: assignedPlayerIds.length,
      averageSkill: average(assignedPlayerIds.map((playerId) => normalizedEvaluation(input, playerId).value)),
      ageBandCounts,
      missingProfileCount: assignedPlayerIds.filter((playerId) => !input.playerProfiles?.[playerId]).length,
      defaultedEvaluationCount: assignedPlayerIds.filter((playerId) => normalizedEvaluation(input, playerId).source === "defaulted").length,
      players: assignedPlayerIds.map((playerId) => {
        const player = roster.players.find((item) => item.id === playerId)!;
        const guardianKey = guardianGroupKey(roster, playerId);
        const siblingCount = groups.get(guardianKey)?.length ?? 1;
        const hasFriendRequest = (input.friendRequests ?? []).some((request) => request.playerId === playerId || request.friendPlayerId === playerId);
        const evaluation = normalizedEvaluation(input, playerId);
        const ageBand = normalizedAgeBand(input, playerId);
        const birthDateStatus = input.playerProfiles?.[playerId]?.birthDate ? "recorded" as const : "missing" as const;
        return {
          playerId,
          name: `${player.firstName} ${player.lastInitial}.`,
          skillRating: evaluation.value,
          ageBand: ageBand.value,
          ageBandSource: ageBand.source,
          evaluationSource: evaluation.source,
          birthDateStatus,
          constraintNotes: [
            `Age band: ${ageBand.value} (${ageBand.source === "explicit" ? "explicit" : "division default"})`,
            `Evaluation: ${evaluation.value} (${evaluation.source.replace("_", " ")})`,
            `Birth date: ${birthDateStatus}`,
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
    ...(players.some((player) => !input.playerProfiles?.[player.id])
      ? [`${players.filter((player) => !input.playerProfiles?.[player.id]).length} player(s) have no private team-builder profile.`]
      : []),
    ...(players.some((player) => normalizedEvaluation(input, player.id).source === "defaulted")
      ? [`${players.filter((player) => normalizedEvaluation(input, player.id).source === "defaulted").length} player evaluation(s) defaulted to 3.`]
      : []),
    ...(players.some((player) => normalizedAgeBand(input, player.id).source === "division_default")
      ? [`${players.filter((player) => normalizedAgeBand(input, player.id).source === "division_default").length} player age band(s) defaulted to division ${input.division}.`]
      : []),
    ...(players.some((player) => !input.playerProfiles?.[player.id]?.birthDate)
      ? [`${players.filter((player) => !input.playerProfiles?.[player.id]?.birthDate).length} player birth date(s) are missing.`]
      : [])
  ];

  return {
    ok: true,
    division: input.division,
    workflow,
    teams: teamRows,
    warnings,
    auditSummary: `Balanced team preview for ${input.division}: ${players.length} player(s), ${teams.length} team(s), target roster ${input.targetRosterSize}; ${players.filter((player) => !input.playerProfiles?.[player.id]).length} missing profile(s), ${players.filter((player) => normalizedEvaluation(input, player.id).source === "defaulted").length} defaulted evaluation(s).`,
    publishBoundary: "Preview does not update player.teamId. Admin must edit, approve, and publish before roster assignments change."
  };
}

export function previewBalancedTeamBuild(state: AppState, input: BalancedTeamBuildInput): BalancedTeamBuildPreview {
  return previewBalancedTeamBuildRoster({
    teams: state.teams.map((team) => ({
      id: team.id,
      name: team.name,
      division: team.division
    })),
    players: state.players.map((player) => ({
      id: player.id,
      teamId: player.teamId,
      firstName: player.firstName,
      lastInitial: player.lastInitial,
      guardianGroupId: state.guardianLinks.find((link) => (
        link.playerId === player.id && link.parentUserId && link.status !== "removed"
      ))?.parentUserId
    }))
  }, input);
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
