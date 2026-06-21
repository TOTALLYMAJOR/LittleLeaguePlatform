import type { AppState, RosterImportAnalysis, RosterImportIssue, RosterImportPreviewRow } from "./types";

const REQUIRED_HEADERS = ["team", "division", "player_first", "last_initial", "jersey", "parent_name", "parent_email", "parent_phone"];

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string) {
  return phone.length >= 7;
}

function playerKey(teamId: string | undefined, firstName: string, lastInitial: string) {
  return `${teamId ?? "unknown"}:${firstName.toLowerCase()}:${lastInitial.toUpperCase()}`;
}

function jerseyKey(teamId: string | undefined, jersey: string) {
  return `${teamId ?? "unknown"}:${jersey.trim().toLowerCase()}`;
}

function addIssue(issues: RosterImportIssue[], code: string, severity: "warning" | "error", message: string) {
  issues.push({ code, severity, message });
}

export function analyzeRosterCsv(csv: string, state: AppState, now = new Date().toISOString()): RosterImportAnalysis {
  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) {
    return {
      id: `import-${Date.parse(now)}`,
      status: "validated",
      totalRows: 0,
      validRows: 0,
      warningRows: 0,
      errorRows: 0,
      rows: [],
      createdAt: now
    };
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  const rows: RosterImportPreviewRow[] = [];

  const teamByName = new Map(state.teams.map((team) => [team.name.toLowerCase(), team]));
  const existingPlayers = new Set(state.players.map((player) => playerKey(player.teamId, player.firstName, player.lastInitial)));
  const existingJerseys = new Set(state.players.map((player) => jerseyKey(player.teamId, player.jersey)));
  const existingNameAcrossSeason = new Set(state.players.map((player) => `${player.firstName.toLowerCase()}:${player.lastInitial.toUpperCase()}`));
  const existingEmails = new Set(state.parentInvites.map((invite) => normalizeEmail(invite.email)).filter(Boolean));
  state.users.filter((user) => user.role === "parent").forEach((user) => existingEmails.add(normalizeEmail(user.email)));
  const existingPhones = new Set(state.parentInvites.map((invite) => normalizePhone(invite.phone)).filter(Boolean));
  state.users.filter((user) => user.role === "parent" && user.phone).forEach((user) => existingPhones.add(normalizePhone(user.phone ?? "")));

  const uploadPlayers = new Set<string>();
  const uploadJerseys = new Set<string>();
  const uploadEmails = new Set<string>();
  const uploadPhones = new Set<string>();

  lines.slice(1).forEach((line, index) => {
    const values = parseCsvLine(line);
    const raw = Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ""]));
    const teamName = raw.team?.trim() ?? "";
    const team = teamByName.get(teamName.toLowerCase());
    const firstName = raw.player_first?.trim() ?? "";
    const lastInitial = (raw.last_initial?.trim() ?? "").slice(0, 1).toUpperCase();
    const jersey = raw.jersey?.trim() ?? "";
    const parentEmail = normalizeEmail(raw.parent_email ?? "");
    const parentPhone = normalizePhone(raw.parent_phone ?? "");
    const issues: RosterImportIssue[] = [];

    missingHeaders.forEach((header) => addIssue(issues, "missing_required_header", "error", `Missing required column: ${header}.`));
    if (!firstName || !lastInitial) addIssue(issues, "missing_player_name", "error", "Player first name and last initial are required.");
    if (!teamName) addIssue(issues, "missing_team", "error", "Team is required.");
    if (teamName && !team) addIssue(issues, "unknown_team", "error", `Team "${teamName}" does not exist in this season.`);

    const validEmail = parentEmail.length > 0 && isValidEmail(parentEmail);
    const validPhone = parentPhone.length > 0 && isValidPhone(parentPhone);
    if (!validEmail && !validPhone) {
      addIssue(issues, "invalid_required_parent_contact", "error", "At least one valid parent email or phone is required.");
    } else {
      if (parentEmail && !validEmail) addIssue(issues, "invalid_email", "warning", "Parent email format looks invalid.");
      if (parentPhone && !validPhone) addIssue(issues, "invalid_phone", "warning", "Parent phone is too short.");
    }

    const exactPlayerKey = playerKey(team?.id, firstName, lastInitial);
    if (team && firstName && lastInitial && (existingPlayers.has(exactPlayerKey) || uploadPlayers.has(exactPlayerKey))) {
      addIssue(issues, "duplicate_player_same_team", "error", "This exact player already exists on the same team or appears twice in the import.");
    }

    const sameSeasonNameKey = `${firstName.toLowerCase()}:${lastInitial}`;
    if (firstName && lastInitial && existingNameAcrossSeason.has(sameSeasonNameKey) && !existingPlayers.has(exactPlayerKey)) {
      addIssue(issues, "similar_player_name", "warning", "A similar player name already exists in this season.");
    }

    const exactJerseyKey = jerseyKey(team?.id, jersey);
    if (team && jersey && (existingJerseys.has(exactJerseyKey) || uploadJerseys.has(exactJerseyKey))) {
      addIssue(issues, "duplicate_jersey_number", "warning", "This jersey number is already used on the team.");
    }

    if (validEmail && (existingEmails.has(parentEmail) || uploadEmails.has(parentEmail))) {
      addIssue(issues, "duplicate_parent_email", "warning", "This parent email is already connected to another record.");
    }
    if (validPhone && (existingPhones.has(parentPhone) || uploadPhones.has(parentPhone))) {
      addIssue(issues, "duplicate_parent_phone", "warning", "This parent phone is already connected to another record.");
    }

    if (team && firstName && lastInitial) uploadPlayers.add(exactPlayerKey);
    if (team && jersey) uploadJerseys.add(exactJerseyKey);
    if (validEmail) uploadEmails.add(parentEmail);
    if (validPhone) uploadPhones.add(parentPhone);

    const status = issues.some((issue) => issue.severity === "error") ? "error" : issues.length ? "warning" : "valid";
    rows.push({
      rowNumber: index + 2,
      raw,
      normalized: {
        teamName,
        teamId: team?.id,
        division: raw.division?.trim() ?? "",
        firstName,
        lastInitial,
        jersey,
        parentName: raw.parent_name?.trim() ?? "",
        parentEmail,
        parentPhone
      },
      status,
      issues
    });
  });

  return {
    id: `import-${Date.parse(now)}`,
    status: "validated",
    totalRows: rows.length,
    validRows: rows.filter((row) => row.status === "valid").length,
    warningRows: rows.filter((row) => row.status === "warning").length,
    errorRows: rows.filter((row) => row.status === "error").length,
    rows,
    createdAt: now
  };
}
