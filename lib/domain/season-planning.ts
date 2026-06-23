import type { AppState } from "./types";

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
