export type TeamLifecycleStatus = "active" | "archived";

export interface TeamLifecycleRow {
  id?: string;
  division?: string | null;
  name?: string | null;
  status?: TeamLifecycleStatus | null;
  seasons?: { status?: TeamLifecycleStatus | null } | Array<{ status?: TeamLifecycleStatus | null }> | null;
}

export function getTeamSeasonStatus(row: TeamLifecycleRow): TeamLifecycleStatus {
  const season = Array.isArray(row.seasons) ? row.seasons[0] : row.seasons;
  return season?.status === "archived" ? "archived" : "active";
}

export function isCurrentTeamRow(row: TeamLifecycleRow) {
  return (row.status ?? "active") === "active" && getTeamSeasonStatus(row) === "active";
}

export function orderCurrentTeamsFirst<T extends TeamLifecycleRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const rankDiff = Number(!isCurrentTeamRow(a)) - Number(!isCurrentTeamRow(b));
    if (rankDiff !== 0) return rankDiff;
    const divisionDiff = (a.division ?? "").localeCompare(b.division ?? "");
    if (divisionDiff !== 0) return divisionDiff;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });
}

export function selectCurrentTeamsOrAll<T extends TeamLifecycleRow>(rows: T[]): T[] {
  const currentRows = rows.filter(isCurrentTeamRow);
  return orderCurrentTeamsFirst(currentRows.length ? currentRows : rows);
}
