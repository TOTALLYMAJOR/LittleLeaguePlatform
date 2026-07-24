import { createHash, randomBytes } from "node:crypto";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Migration 0029 is staged ahead of generated provider types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(functionName: string, args: Record<string, unknown>): any;
};

export type TemporaryCaregiverState =
  | "awaiting_caregiver_acceptance"
  | "accepted_upcoming"
  | "active"
  | "expired"
  | "revoked";

export interface TemporaryCaregiverEvent {
  eventId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  venueLabel: string;
  addressLabel: string;
  status: "scheduled" | "cancelled" | "completed";
  authorizedScheduleVersion: number;
  currentScheduleVersion: number;
}

export interface TemporaryCaregiverAuthorizationView {
  id: string;
  childLabel: string;
  teamName: string;
  caregiverEmail: string;
  caregiverLabel?: string;
  authorizedByLabel: string;
  state: TemporaryCaregiverState;
  stateLabel: string;
  startsAt: string;
  expiresAt: string;
  inviteExpiresAt: string;
  allowedActions: string[];
  prohibitedActions: string[];
  events: TemporaryCaregiverEvent[];
  policyVersion: string;
  updatedAt: string;
  revocationReason?: string;
}

export interface TemporaryCaregiverChildOption {
  playerId: string;
  childLabel: string;
  teamName: string;
  events: Array<{
    eventId: string;
    title: string;
    startsAt: string;
    endsAt: string;
  }>;
}

export interface ParentTemporaryCaregiverData {
  ok: boolean;
  message: string;
  children: TemporaryCaregiverChildOption[];
  authorizations: TemporaryCaregiverAuthorizationView[];
}

export interface TemporaryCaregiverInvitationPreview {
  ok: boolean;
  message: string;
  authorizationId?: string;
  childLabel?: string;
  teamName?: string;
  caregiverEmailMasked?: string;
  authorizedByLabel?: string;
  startsAt?: string;
  expiresAt?: string;
  inviteExpiresAt?: string;
  allowedActions?: string[];
  prohibitedActions?: string[];
  events?: TemporaryCaregiverEvent[];
  state?: TemporaryCaregiverState;
}

export interface CaregiverPortalData {
  ok: boolean;
  message: string;
  clearPrivateCache: boolean;
  accessVersion: string;
  authorizations: TemporaryCaregiverAuthorizationView[];
}

type AuthorizationRow = {
  id: string;
  organization_id: string;
  team_id: string;
  player_id: string;
  authorized_by_user_id: string;
  caregiver_email: string;
  caregiver_user_id: string | null;
  allowed_actions: string[];
  prohibited_actions: string[];
  policy_version: string;
  starts_at: string;
  expires_at: string;
  invite_expires_at: string;
  caregiver_accepted_at: string | null;
  activated_at: string | null;
  revoked_at: string | null;
  revocation_reason: string | null;
  updated_at: string;
};

type EventLinkRow = {
  authorization_id: string;
  event_id: string;
  authorized_schedule_version: number;
};

type EventRow = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location_name: string | null;
  location_address: string | null;
  status: "scheduled" | "cancelled" | "completed";
  schedule_version: number | null;
};

const authorizationColumns = [
  "id",
  "organization_id",
  "team_id",
  "player_id",
  "authorized_by_user_id",
  "caregiver_email",
  "caregiver_user_id",
  "allowed_actions",
  "prohibited_actions",
  "policy_version",
  "starts_at",
  "expires_at",
  "invite_expires_at",
  "caregiver_accepted_at",
  "activated_at",
  "revoked_at",
  "revocation_reason",
  "updated_at"
].join(",");

const safeMessages = new Set([
  "Enter a valid caregiver email address.",
  "Choose 1 to 10 events for temporary care.",
  "Temporary care must use a future window of no more than 14 days.",
  "Caregiver invitation expiration must be within 7 days and before care expires.",
  "Secure caregiver invitation proof is invalid.",
  "Guardian identity is unavailable.",
  "Choose another adult for temporary care.",
  "An active guardian link in the current season is required.",
  "Every selected event must be scheduled for this child team inside the care window.",
  "Pickup permission needs league review because a restriction is recorded.",
  "This caregiver already has current access for the child during that time.",
  "Caregiver invitation is unavailable.",
  "Temporary caregiver access was ended.",
  "Temporary caregiver access was already accepted.",
  "Caregiver invitation expired.",
  "Signed-in caregiver identity is unavailable.",
  "Sign in with the exact caregiver email named by the guardian.",
  "The guardian who set up this access is no longer linked to the child.",
  "Revocation reason must be 10 to 500 characters.",
  "Temporary caregiver access is unavailable.",
  "Temporary caregiver access was already ended.",
  "Only the guardian who set up this access or an active league administrator can end temporary care."
]);

function unavailableMessage() {
  return "Temporary caregiver access is temporarily unavailable. Existing permissions are unchanged.";
}

function safeRpcMessage(message?: string) {
  return message && safeMessages.has(message) ? message : unavailableMessage();
}

function dbClient() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

export async function listParentTemporaryCaregiverData(parentUserId: string): Promise<ParentTemporaryCaregiverData> {
  if (!parentUserId) return { ok: false, message: "Signed-in parent access is required.", children: [], authorizations: [] };
  try {
    const db = dbClient();
    const [
      { data: guardianLinks, error: guardianError },
      { data: authorizationRows, error: authorizationError }
    ] = await withSupabaseTimeout(Promise.all([
      db.from("player_guardians")
        .select("player_id")
        .eq("parent_user_id", parentUserId)
        .eq("status", "active"),
      db.from("temporary_caregiver_authorizations")
        .select(authorizationColumns)
        .eq("authorized_by_user_id", parentUserId)
        .order("created_at", { ascending: false })
    ]), 7000) as [
      { data: Array<{ player_id: string }> | null; error?: { message?: string } | null },
      { data: AuthorizationRow[] | null; error?: { message?: string } | null }
    ];
    if (guardianError || authorizationError) throw new Error("Temporary caregiver records are unavailable.");
    const linkedPlayerIds = [...new Set((guardianLinks ?? []).map((link) => link.player_id))];
    const { players, teams, events } = await loadChildOptions(db, linkedPlayerIds);
    const authorizations = await loadAuthorizationViews(db, authorizationRows ?? [], new Date().toISOString());
    return {
      ok: true,
      message: "Current temporary caregiver scope and acceptance evidence loaded.",
      children: players.map((player) => ({
        playerId: player.id,
        childLabel: `${player.first_name} ${player.last_initial}.`,
        teamName: teams.find((team) => team.id === player.team_id)?.name ?? "Linked team",
        events: events
          .filter((event) => event.team_id === player.team_id && event.status === "scheduled" && Date.parse(event.starts_at) > Date.now())
          .map((event) => ({
            eventId: event.id,
            title: event.title,
            startsAt: event.starts_at,
            endsAt: event.ends_at
          }))
      })),
      authorizations
    };
  } catch {
    return { ok: false, message: unavailableMessage(), children: [], authorizations: [] };
  }
}

export async function createTemporaryCaregiverAuthorization(input: {
  actorUserId: string;
  playerId: string;
  caregiverEmail: string;
  eventIds: string[];
  allowPickup: boolean;
  startsAt: string;
  expiresAt: string;
}) {
  const email = input.caregiverEmail.trim().toLowerCase();
  const startsTime = Date.parse(input.startsAt);
  const expiresTime = Date.parse(input.expiresAt);
  if (!email || !Number.isFinite(startsTime) || !Number.isFinite(expiresTime)) {
    return { ok: false, message: "Caregiver email, start, and expiry are required." };
  }
  if (!input.eventIds.length || input.eventIds.length > 10) {
    return { ok: false, message: "Choose 1 to 10 events for temporary care." };
  }
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const inviteExpiresAt = new Date(Math.min(expiresTime, Date.now() + 7 * 24 * 60 * 60 * 1000)).toISOString();
  try {
    const { data, error } = await withSupabaseTimeout(dbClient().rpc("create_temporary_caregiver_authorization", {
      target_player_id: input.playerId,
      authorizing_user_id: input.actorUserId,
      target_caregiver_email: email,
      target_event_ids: [...new Set(input.eventIds)],
      allow_pickup: input.allowPickup,
      target_starts_at: new Date(startsTime).toISOString(),
      target_expires_at: new Date(expiresTime).toISOString(),
      target_invite_token_hash: tokenHash,
      target_invite_expires_at: inviteExpiresAt
    }), 7000) as { data: { authorization_id?: string } | null; error: { message?: string } | null };
    if (error || !data?.authorization_id) return { ok: false, message: safeRpcMessage(error?.message) };
    return {
      ok: true,
      message: "Temporary caregiver access saved. It remains inactive until the adult signs in with the exact email and accepts. No message was sent.",
      authorizationId: data.authorization_id,
      invitationPath: `/caregiver/accept#token=${encodeURIComponent(rawToken)}`,
      inviteExpiresAt
    };
  } catch {
    return { ok: false, message: unavailableMessage() };
  }
}

export async function previewTemporaryCaregiverInvitation(token: string): Promise<TemporaryCaregiverInvitationPreview> {
  if (!validRawToken(token)) return { ok: false, message: "Caregiver invitation is unavailable." };
  try {
    const db = dbClient();
    const { data: row, error } = await withSupabaseTimeout(db
      .from("temporary_caregiver_authorizations")
      .select(authorizationColumns)
      .eq("invite_token_hash", hashToken(token))
      .maybeSingle(), 7000) as { data: AuthorizationRow | null; error?: { message?: string } | null };
    if (error || !row) return { ok: false, message: "Caregiver invitation is unavailable." };
    const views = await loadAuthorizationViews(db, [row], new Date().toISOString());
    const view = views[0];
    if (!view) return { ok: false, message: "Caregiver invitation is unavailable." };
    if (view.state !== "awaiting_caregiver_acceptance") {
      return { ok: false, message: previewMessage(view.state) };
    }
    return {
      ok: true,
      message: previewMessage(view.state),
      authorizationId: view.id,
      childLabel: view.childLabel,
      teamName: view.teamName,
      caregiverEmailMasked: maskEmail(view.caregiverEmail),
      authorizedByLabel: view.authorizedByLabel,
      startsAt: view.startsAt,
      expiresAt: view.expiresAt,
      inviteExpiresAt: view.inviteExpiresAt,
      allowedActions: view.allowedActions,
      prohibitedActions: view.prohibitedActions,
      events: view.events,
      state: view.state
    };
  } catch {
    return { ok: false, message: "Caregiver invitation is unavailable." };
  }
}

export async function acceptTemporaryCaregiverAuthorization(input: { token: string; actorUserId: string }) {
  if (!validRawToken(input.token)) return { ok: false, message: "Caregiver invitation is unavailable." };
  try {
    const { data, error } = await withSupabaseTimeout(dbClient().rpc("accept_temporary_caregiver_authorization", {
      target_invite_token_hash: hashToken(input.token),
      accepting_user_id: input.actorUserId
    }), 7000) as { data: unknown; error: { message?: string } | null };
    if (error) return { ok: false, message: safeRpcMessage(error.message) };
    return {
      ok: true,
      message: "Temporary caregiver access accepted. It is limited to the reviewed child, events, actions, and time window.",
      result: data
    };
  } catch {
    return { ok: false, message: unavailableMessage() };
  }
}

export async function revokeTemporaryCaregiverAuthorization(input: {
  authorizationId: string;
  actorUserId: string;
  reason: string;
}) {
  try {
    const { data, error } = await withSupabaseTimeout(dbClient().rpc("revoke_temporary_caregiver_authorization", {
      target_authorization_id: input.authorizationId,
      revoking_user_id: input.actorUserId,
      revocation_explanation: input.reason.trim()
    }), 7000) as { data: unknown; error: { message?: string } | null };
    if (error) return { ok: false, message: safeRpcMessage(error.message) };
    return {
      ok: true,
      message: "Temporary caregiver access revoked. Private caregiver data is cleared at next server contact. No provider message was sent.",
      result: data
    };
  } catch {
    return { ok: false, message: unavailableMessage() };
  }
}

export async function listCaregiverPortalData(caregiverUserId: string): Promise<CaregiverPortalData> {
  if (!caregiverUserId) return {
    ok: false,
    message: "Sign in with the accepted caregiver account.",
    clearPrivateCache: true,
    accessVersion: new Date(0).toISOString(),
    authorizations: []
  };
  try {
    const db = dbClient();
    const { data: rows, error } = await withSupabaseTimeout(db
      .from("temporary_caregiver_authorizations")
      .select(authorizationColumns)
      .eq("caregiver_user_id", caregiverUserId)
      .order("updated_at", { ascending: false }), 7000) as {
        data: AuthorizationRow[] | null;
        error?: { message?: string } | null;
      };
    if (error) throw new Error("Caregiver scope is unavailable.");
    const now = new Date().toISOString();
    const currentRows = (rows ?? []).filter((row) => !row.revoked_at && Date.parse(row.expires_at) > Date.parse(now));
    const authorizations = await loadAuthorizationViews(db, currentRows, now);
    const activeViews = authorizations.filter((view) => view.state === "active");
    return {
      ok: activeViews.length > 0,
      message: activeViews.length
        ? "Showing only the child, selected events, actions, and time window accepted for this caregiver."
        : "No current temporary caregiver access is available. Private caregiver data must be cleared.",
      clearPrivateCache: activeViews.length === 0,
      accessVersion: activeViews[0]?.updatedAt ?? rows?.[0]?.updated_at ?? new Date(0).toISOString(),
      authorizations: activeViews
    };
  } catch {
    return {
      ok: false,
      message: unavailableMessage(),
      clearPrivateCache: true,
      accessVersion: new Date(0).toISOString(),
      authorizations: []
    };
  }
}

async function loadChildOptions(db: UnsafeSupabase, playerIds: string[]) {
  if (!playerIds.length) return {
    players: [] as Array<{ id: string; team_id: string; first_name: string; last_initial: string }>,
    teams: [] as Array<{ id: string; name: string }>,
    events: [] as Array<EventRow & { team_id: string }>
  };
  const { data: players, error: playersError } = await withSupabaseTimeout(db
    .from("players")
    .select("id,team_id,first_name,last_initial")
    .in("id", playerIds), 7000) as {
      data: Array<{ id: string; team_id: string; first_name: string; last_initial: string }> | null;
      error?: { message?: string } | null;
    };
  if (playersError) throw new Error("Linked child scope is unavailable.");
  const teamIds = [...new Set((players ?? []).map((player) => player.team_id))];
  const [{ data: teams, error: teamsError }, { data: events, error: eventsError }] = await withSupabaseTimeout(Promise.all([
    db.from("teams").select("id,name").in("id", teamIds),
    db.from("events")
      .select("id,team_id,title,starts_at,ends_at,location_name,location_address,status,schedule_version")
      .in("team_id", teamIds)
      .order("starts_at", { ascending: true })
      .limit(200)
  ]), 7000) as [
    { data: Array<{ id: string; name: string }> | null; error?: { message?: string } | null },
    { data: Array<EventRow & { team_id: string }> | null; error?: { message?: string } | null }
  ];
  if (teamsError || eventsError) throw new Error("Temporary care event scope is unavailable.");
  return { players: players ?? [], teams: teams ?? [], events: events ?? [] };
}

async function loadAuthorizationViews(db: UnsafeSupabase, rows: AuthorizationRow[], now: string) {
  if (!rows.length) return [];
  const authorizationIds = rows.map((row) => row.id);
  const playerIds = [...new Set(rows.map((row) => row.player_id))];
  const teamIds = [...new Set(rows.map((row) => row.team_id))];
  const profileIds = [...new Set(rows.flatMap((row) => [
    row.authorized_by_user_id,
    ...(row.caregiver_user_id ? [row.caregiver_user_id] : [])
  ]))];
  const [
    { data: eventLinks, error: eventLinksError },
    { data: players, error: playersError },
    { data: teams, error: teamsError },
    { data: profiles, error: profilesError }
  ] = await withSupabaseTimeout(Promise.all([
    db.from("temporary_caregiver_authorization_events")
      .select("authorization_id,event_id,authorized_schedule_version")
      .in("authorization_id", authorizationIds),
    db.from("players").select("id,first_name,last_initial").in("id", playerIds),
    db.from("teams").select("id,name").in("id", teamIds),
    db.from("profiles").select("id,display_name").in("id", profileIds)
  ]), 7000) as [
    { data: EventLinkRow[] | null; error?: { message?: string } | null },
    { data: Array<{ id: string; first_name: string; last_initial: string }> | null; error?: { message?: string } | null },
    { data: Array<{ id: string; name: string }> | null; error?: { message?: string } | null },
    { data: Array<{ id: string; display_name: string }> | null; error?: { message?: string } | null }
  ];
  if (eventLinksError || playersError || teamsError || profilesError) {
    throw new Error("Temporary caregiver scope details are unavailable.");
  }
  const eventIds = [...new Set((eventLinks ?? []).map((link) => link.event_id))];
  const { data: events, error: eventsError } = eventIds.length
    ? await withSupabaseTimeout(db
      .from("events")
      .select("id,title,starts_at,ends_at,location_name,location_address,status,schedule_version")
      .in("id", eventIds), 7000) as { data: EventRow[] | null; error?: { message?: string } | null }
    : { data: [], error: null };
  if (eventsError) throw new Error("Temporary caregiver events are unavailable.");

  const playerById = new Map((players ?? []).map((player) => [player.id, player]));
  const teamById = new Map((teams ?? []).map((team) => [team.id, team]));
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));
  const eventById = new Map((events ?? []).map((event) => [event.id, event]));

  return rows.map((row): TemporaryCaregiverAuthorizationView => {
    const player = playerById.get(row.player_id);
    const state = deriveTemporaryCaregiverState(row, now);
    return {
      id: row.id,
      childLabel: player ? `${player.first_name} ${player.last_initial}.` : "Selected child",
      teamName: teamById.get(row.team_id)?.name ?? "Selected team",
      caregiverEmail: row.caregiver_email,
      caregiverLabel: row.caregiver_user_id ? profileById.get(row.caregiver_user_id) ?? "Accepted caregiver" : undefined,
      authorizedByLabel: profileById.get(row.authorized_by_user_id) ?? "Linked guardian",
      state,
      stateLabel: stateLabel(state),
      startsAt: row.starts_at,
      expiresAt: row.expires_at,
      inviteExpiresAt: row.invite_expires_at,
      allowedActions: row.allowed_actions,
      prohibitedActions: row.prohibited_actions,
      events: (eventLinks ?? [])
        .filter((link) => link.authorization_id === row.id)
        .flatMap((link): TemporaryCaregiverEvent[] => {
          const event = eventById.get(link.event_id);
          return event ? [{
            eventId: event.id,
            title: event.title,
            startsAt: event.starts_at,
            endsAt: event.ends_at,
            venueLabel: event.location_name || "Not published",
            addressLabel: event.location_address || "Not published",
            status: event.status,
            authorizedScheduleVersion: link.authorized_schedule_version,
            currentScheduleVersion: event.schedule_version ?? 1
          }] : [];
        })
        .sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt)),
      policyVersion: row.policy_version,
      updatedAt: row.updated_at,
      revocationReason: row.revocation_reason ?? undefined
    };
  });
}

export function deriveTemporaryCaregiverState(
  row: Pick<AuthorizationRow, "revoked_at" | "expires_at" | "invite_expires_at" | "caregiver_accepted_at" | "starts_at">,
  now: string
): TemporaryCaregiverState {
  if (row.revoked_at) return "revoked";
  if (
    Date.parse(row.expires_at) <= Date.parse(now) ||
    (Date.parse(row.invite_expires_at) <= Date.parse(now) && !row.caregiver_accepted_at)
  ) return "expired";
  if (!row.caregiver_accepted_at) return "awaiting_caregiver_acceptance";
  if (Date.parse(row.starts_at) > Date.parse(now)) return "accepted_upcoming";
  return "active";
}

function stateLabel(state: TemporaryCaregiverState) {
  return {
    awaiting_caregiver_acceptance: "Guardian reviewed · caregiver acceptance pending",
    accepted_upcoming: "Accepted · starts at the selected time",
    active: "Active · time-bound",
    expired: "Expired",
    revoked: "Revoked"
  }[state];
}

function previewMessage(state: TemporaryCaregiverState) {
  if (state === "awaiting_caregiver_acceptance") return "Review the exact temporary-care scope before accepting.";
  if (state === "expired") return "Caregiver invitation expired.";
  if (state === "revoked") return "Temporary caregiver access was ended.";
  return "Temporary caregiver access was already accepted.";
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function validRawToken(token: string) {
  return /^[A-Za-z0-9_-]{40,64}$/.test(token);
}

function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 1)}${"*".repeat(Math.max(2, Math.min(6, local.length - 1)))}@${domain}`;
}
