import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { createSupabaseAdminClient } from "./admin";
import { requireActiveOrganizationAdmin } from "./access-control";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // This adapter covers migration 0027 until generated provider types are refreshed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(functionName: string, args: Record<string, unknown>): any;
};

type RpcResult = {
  data: unknown;
  error: { message: string } | null;
};

export type AdditionalGuardianState =
  | "pending_review"
  | "cancelled"
  | "rejected"
  | "invitation_ready"
  | "accepted"
  | "expired"
  | "revoked";

export interface AdditionalGuardianRequestView {
  id: string;
  organizationId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  proposedByLabel: string;
  proposedEmail: string;
  relationship: "mother" | "father" | "guardian" | "other";
  requestedAt: string;
  reviewedAt?: string;
  reviewedByUserId?: string;
  reviewedByLabel?: string;
  decisionReason?: string;
  state: AdditionalGuardianState;
  inviteExpiresAt?: string;
}

export interface AdditionalGuardianParentData {
  ok: boolean;
  message: string;
  children: Array<{
    playerId: string;
    playerName: string;
    teamId: string;
    teamName: string;
  }>;
  requests: AdditionalGuardianRequestView[];
}

export interface AdditionalGuardianAdminData {
  ok: boolean;
  message: string;
  requests: AdditionalGuardianRequestView[];
}

type RequestRow = {
  id: string;
  organization_id: string;
  team_id: string;
  player_id: string;
  proposed_by_user_id: string;
  proposed_email: string;
  relationship: AdditionalGuardianRequestView["relationship"];
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by_user_id: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  revoked_at: string | null;
  decision_reason: string | null;
  revocation_reason: string | null;
  parent_invite_id: string | null;
};

type InviteRow = {
  id: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string;
};

const requestColumns = [
  "id",
  "organization_id",
  "team_id",
  "player_id",
  "proposed_by_user_id",
  "proposed_email",
  "relationship",
  "requested_at",
  "reviewed_at",
  "reviewed_by_user_id",
  "approved_at",
  "rejected_at",
  "cancelled_at",
  "revoked_at",
  "decision_reason",
  "revocation_reason",
  "parent_invite_id"
].join(",");

function unavailableMessage() {
  return "Additional guardian review is temporarily unavailable. Existing family access is unchanged.";
}

const familySafeRpcMessages = new Set([
  "Enter a valid adult email address.",
  "Choose a supported relationship.",
  "Parent identity is unavailable.",
  "Use another adult email address.",
  "An active guardian link for this child is required.",
  "This adult already has a request awaiting review for this child.",
  "Request is unavailable.",
  "Only the proposing guardian can cancel this request.",
  "Only a request awaiting review can be cancelled.",
  "Review reason must be 10 to 500 characters.",
  "This request is no longer awaiting review.",
  "Active organization administrator access is required.",
  "Secure invitation proof is invalid.",
  "Invitation expiration must be within the next 30 days.",
  "The child and team must remain in an active season.",
  "The proposing guardian is no longer authorized for this child.",
  "This adult already has active access for this child.",
  "This adult already has a pending invitation for this child.",
  "Revocation reason must be 10 to 500 characters.",
  "Only current approved access can be revoked."
]);

function safeRpcMessage(message?: string) {
  return message && familySafeRpcMessages.has(message) ? message : unavailableMessage();
}

function deriveState(row: RequestRow, invite?: InviteRow): AdditionalGuardianState {
  if (row.cancelled_at) return "cancelled";
  if (row.rejected_at) return "rejected";
  if (row.revoked_at || invite?.status === "revoked") return "revoked";
  if (invite?.status === "accepted") return "accepted";
  if (invite?.status === "expired" || (invite?.expires_at && Date.parse(invite.expires_at) <= Date.now())) return "expired";
  if (row.approved_at) return "invitation_ready";
  return "pending_review";
}

function mapRequests(input: {
  rows: RequestRow[];
  players: Array<{ id: string; first_name: string; last_initial: string }>;
  teams: Array<{ id: string; name: string }>;
  invites: InviteRow[];
  profiles: Array<{ id: string; display_name: string }>;
}) {
  const playerById = new Map(input.players.map((player) => [player.id, player]));
  const teamById = new Map(input.teams.map((team) => [team.id, team]));
  const inviteById = new Map(input.invites.map((invite) => [invite.id, invite]));
  const profileById = new Map(input.profiles.map((profile) => [profile.id, profile]));
  return input.rows.map((row): AdditionalGuardianRequestView => {
    const player = playerById.get(row.player_id);
    const invite = row.parent_invite_id ? inviteById.get(row.parent_invite_id) : undefined;
    return {
      id: row.id,
      organizationId: row.organization_id,
      playerId: row.player_id,
      playerName: player ? `${player.first_name} ${player.last_initial}.` : "Linked child",
      teamId: row.team_id,
      teamName: teamById.get(row.team_id)?.name ?? "Linked team",
      proposedByLabel: profileById.get(row.proposed_by_user_id)?.display_name ?? "Linked guardian",
      proposedEmail: row.proposed_email,
      relationship: row.relationship,
      requestedAt: row.requested_at,
      reviewedAt: row.reviewed_at ?? undefined,
      reviewedByUserId: row.reviewed_by_user_id ?? undefined,
      reviewedByLabel: row.reviewed_by_user_id
        ? profileById.get(row.reviewed_by_user_id)?.display_name ?? "League administrator"
        : undefined,
      decisionReason: row.revocation_reason ?? row.decision_reason ?? undefined,
      state: deriveState(row, invite),
      inviteExpiresAt: invite?.expires_at
    };
  });
}

async function loadRequestViews(db: UnsafeSupabase, rows: RequestRow[]) {
  if (!rows.length) return [];
  const playerIds = [...new Set(rows.map((row) => row.player_id))];
  const teamIds = [...new Set(rows.map((row) => row.team_id))];
  const inviteIds = rows.flatMap((row) => row.parent_invite_id ? [row.parent_invite_id] : []);
  const profileIds = [...new Set(rows.flatMap((row) => [
    row.proposed_by_user_id,
    ...(row.reviewed_by_user_id ? [row.reviewed_by_user_id] : [])
  ]))];
  const [
    { data: players, error: playersError },
    { data: teams, error: teamsError },
    { data: invites, error: invitesError },
    { data: profiles, error: profilesError }
  ] = await withSupabaseTimeout(Promise.all([
    db.from("players").select("id,first_name,last_initial").in("id", playerIds),
    db.from("teams").select("id,name").in("id", teamIds),
    inviteIds.length
      ? db.from("parent_invites").select("id,status,expires_at").in("id", inviteIds)
      : Promise.resolve({ data: [] }),
    db.from("profiles").select("id,display_name").in("id", profileIds)
  ]), 7000) as [
    { data: Array<{ id: string; first_name: string; last_initial: string }> | null; error?: { message: string } | null },
    { data: Array<{ id: string; name: string }> | null; error?: { message: string } | null },
    { data: InviteRow[] | null; error?: { message: string } | null },
    { data: Array<{ id: string; display_name: string }> | null; error?: { message: string } | null }
  ];
  if (playersError || teamsError || invitesError || profilesError) {
    throw new Error("Additional guardian request details are unavailable.");
  }
  return mapRequests({
    rows,
    players: players ?? [],
    teams: teams ?? [],
    invites: invites ?? [],
    profiles: profiles ?? []
  });
}

export async function listParentAdditionalGuardianData(parentUserId: string): Promise<AdditionalGuardianParentData> {
  if (!parentUserId) return { ok: false, message: "Signed-in parent access is required.", children: [], requests: [] };
  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const { data: guardianLinks, error: guardianLinksError } = await withSupabaseTimeout(db
      .from("player_guardians")
      .select("player_id")
      .eq("parent_user_id", parentUserId)
      .eq("status", "active"), 7000) as {
        data: Array<{ player_id: string }> | null;
        error?: { message: string } | null;
      };
    if (guardianLinksError) throw new Error("Linked guardian details are unavailable.");
    const playerIds = [...new Set((guardianLinks ?? []).map((link) => link.player_id))];
    const [{ data: players, error: playersError }, { data: rows, error: requestsError }] = await withSupabaseTimeout(Promise.all([
      playerIds.length
        ? db.from("players").select("id,team_id,first_name,last_initial").in("id", playerIds)
        : Promise.resolve({ data: [] }),
      db.from("additional_guardian_requests")
        .select(requestColumns)
        .eq("proposed_by_user_id", parentUserId)
        .order("requested_at", { ascending: false })
    ]), 7000) as [
      {
        data: Array<{ id: string; team_id: string; first_name: string; last_initial: string }> | null;
        error?: { message: string } | null;
      },
      { data: RequestRow[] | null; error?: { message: string } | null }
    ];
    if (playersError || requestsError) throw new Error("Additional guardian requests are unavailable.");
    const teamIds = [...new Set((players ?? []).map((player) => player.team_id))];
    const { data: teams, error: teamsError } = teamIds.length
      ? await withSupabaseTimeout(db.from("teams").select("id,name").in("id", teamIds), 7000) as {
        data: Array<{ id: string; name: string }> | null;
        error?: { message: string } | null;
      }
      : { data: [], error: null };
    if (teamsError) throw new Error("Linked team details are unavailable.");
    const teamById = new Map((teams ?? []).map((team) => [team.id, team.name]));
    return {
      ok: true,
      message: "Proposals are private to the linked guardian and authorized league administrators.",
      children: (players ?? []).map((player) => ({
        playerId: player.id,
        playerName: `${player.first_name} ${player.last_initial}.`,
        teamId: player.team_id,
        teamName: teamById.get(player.team_id) ?? "Linked team"
      })),
      requests: await loadRequestViews(db, rows ?? [])
    };
  } catch {
    return { ok: false, message: unavailableMessage(), children: [], requests: [] };
  }
}

export async function listAdminAdditionalGuardianData(input: {
  actorUserId: string;
  organizationIds: string[];
}): Promise<AdditionalGuardianAdminData> {
  if (!input.actorUserId || !input.organizationIds.length) {
    return { ok: false, message: "Active organization administrator access is required.", requests: [] };
  }
  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const allowedOrganizations: string[] = [];
    for (const organizationId of input.organizationIds) {
      const access = await requireActiveOrganizationAdmin({
        db,
        organizationId,
        userId: input.actorUserId,
        action: "review additional guardian requests"
      });
      if (access.ok) allowedOrganizations.push(organizationId);
    }
    if (!allowedOrganizations.length) {
      return { ok: false, message: "Active organization administrator access is required.", requests: [] };
    }
    const { data: rows, error: requestsError } = await withSupabaseTimeout(db
      .from("additional_guardian_requests")
      .select(requestColumns)
      .in("organization_id", allowedOrganizations)
      .order("requested_at", { ascending: false }), 7000) as {
        data: RequestRow[] | null;
        error?: { message: string } | null;
      };
    if (requestsError) throw new Error("Additional guardian requests are unavailable.");
    return {
      ok: true,
      message: "Approve only after confirming the adult, child, team, and proposing guardian. No message is sent automatically.",
      requests: await loadRequestViews(db, rows ?? [])
    };
  } catch {
    return { ok: false, message: unavailableMessage(), requests: [] };
  }
}

export async function requestAdditionalGuardian(input: {
  playerId: string;
  actorUserId: string;
  email: string;
  relationship: AdditionalGuardianRequestView["relationship"];
}) {
  if (!input.playerId || !input.actorUserId || !input.email.trim()) {
    return { ok: false, message: "Child, adult email, and relationship are required." };
  }
  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const { data, error } = await withSupabaseTimeout(db.rpc("request_additional_guardian", {
      target_player_id: input.playerId,
      proposing_user_id: input.actorUserId,
      adult_email: input.email,
      adult_relationship: input.relationship
    }), 10000) as RpcResult;
    if (error) return { ok: false, message: safeRpcMessage(error.message) };
    return {
      ok: true,
      message: "Request sent for league review. Access has not changed and no invitation has been sent.",
      result: data
    };
  } catch {
    return { ok: false, message: unavailableMessage() };
  }
}

export async function cancelAdditionalGuardianRequest(input: { requestId: string; actorUserId: string }) {
  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const { data, error } = await withSupabaseTimeout(db.rpc("cancel_additional_guardian_request", {
      target_request_id: input.requestId,
      cancelling_user_id: input.actorUserId
    }), 10000) as RpcResult;
    if (error) return { ok: false, message: safeRpcMessage(error.message) };
    return { ok: true, message: "Request cancelled. Family access remains unchanged.", result: data };
  } catch {
    return { ok: false, message: unavailableMessage() };
  }
}

export async function reviewAdditionalGuardianRequest(input: {
  requestId: string;
  actorUserId: string;
  decision: "approve" | "reject";
  reason: string;
}) {
  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    if (input.decision === "reject") {
      const { data, error } = await withSupabaseTimeout(db.rpc("reject_additional_guardian_request", {
        target_request_id: input.requestId,
        reviewing_user_id: input.actorUserId,
        review_reason: input.reason
      }), 10000) as RpcResult;
      if (error) return { ok: false, message: safeRpcMessage(error.message) };
      return {
        ok: true,
        message: "Request rejected. No invitation or provider message was created.",
        result: data
      };
    }

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await withSupabaseTimeout(db.rpc("approve_additional_guardian_request", {
      target_request_id: input.requestId,
      reviewing_user_id: input.actorUserId,
      review_reason: input.reason,
      target_invite_token_hash: tokenHash,
      target_expires_at: expiresAt
    }), 10000) as RpcResult;
    if (error) return { ok: false, message: safeRpcMessage(error.message) };
    return {
      ok: true,
      message: "Access approved. Copy the one-time link now; no message was sent.",
      invitationPath: `/invite/accept#token=${encodeURIComponent(token)}`,
      expiresAt,
      result: data
    };
  } catch {
    return { ok: false, message: unavailableMessage() };
  }
}

export async function revokeAdditionalGuardianAccess(input: {
  requestId: string;
  actorUserId: string;
  reason: string;
}) {
  try {
    const db = createSupabaseAdminClient() as unknown as UnsafeSupabase;
    const { data, error } = await withSupabaseTimeout(db.rpc("revoke_additional_guardian_access", {
      target_request_id: input.requestId,
      revoking_user_id: input.actorUserId,
      revocation_reason: input.reason
    }), 10000) as RpcResult;
    if (error) return { ok: false, message: safeRpcMessage(error.message) };
    return {
      ok: true,
      message: "Additional guardian access revoked. The correction is recorded in audit history.",
      result: data
    };
  } catch {
    return { ok: false, message: unavailableMessage() };
  }
}
