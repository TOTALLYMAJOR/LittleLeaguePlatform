import { requireActiveTeamCoachOrOrgAdmin } from "./access-control";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc(name: string, input: Record<string, unknown>): any;
};

type Result<T> = { data: T | null; error: { code?: string; message?: string } | null };

function dbClient() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

function run<T>(operation: PromiseLike<unknown>) {
  return withSupabaseTimeout(operation as PromiseLike<Result<T>>, 7000);
}

async function requireVolunteerTeamAccess(db: UnsafeSupabase, input: {
  signupId: string;
  userId: string;
}) {
  const signup = await run<{
    id: string;
    organization_id: string;
    team_id: string;
    assigned_user_id: string | null;
    status: string;
  }>(db.from("volunteer_signups")
    .select("id,organization_id,team_id,assigned_user_id,status")
    .eq("id", input.signupId)
    .maybeSingle());
  if (signup.error || !signup.data) return { ok: false as const, message: "Volunteer role was not found." };
  const [guardian, teamMember, orgMember] = await Promise.all([
    run<Array<{ id: string }>>(db.from("player_guardians")
      .select("id,players!inner(team_id)")
      .eq("parent_user_id", input.userId)
      .eq("status", "active")
      .eq("players.team_id", signup.data.team_id)
      .limit(1)),
    run<Array<{ id: string }>>(db.from("team_memberships")
      .select("id")
      .eq("team_id", signup.data.team_id)
      .eq("user_id", input.userId)
      .eq("status", "active")
      .limit(1)),
    run<Array<{ id: string }>>(db.from("organization_memberships")
      .select("id")
      .eq("organization_id", signup.data.organization_id)
      .eq("user_id", input.userId)
      .eq("status", "active")
      .limit(1))
  ]);
  if (!guardian.data?.length && !teamMember.data?.length && !orgMember.data?.length) {
    return { ok: false as const, message: "Volunteer actions require approved access to this team." };
  }
  return { ok: true as const, signup: signup.data };
}

export async function claimVolunteerRoleSafely(input: {
  signupId: string;
  userId: string;
  actionId: string;
}) {
  if (!input.signupId || !input.userId || !input.actionId) {
    return { ok: false, code: "invalid_request", message: "Volunteer claim requires role, user, and action receipt." };
  }
  try {
    const db = dbClient();
    const access = await requireVolunteerTeamAccess(db, input);
    if (!access.ok) return access;
    const result = await run<Record<string, unknown>>(db.rpc("claim_volunteer_role_compare_and_set", {
      p_signup_id: input.signupId,
      p_user_id: input.userId,
      p_action_id: input.actionId
    }));
    if (result.error || !result.data) return { ok: false, code: "unavailable", message: "Volunteer role could not be claimed." };
    return result.data;
  } catch {
    return { ok: false, code: "unavailable", message: "Volunteer role could not reach team records." };
  }
}

export async function joinVolunteerWaitlist(input: {
  signupId: string;
  userId: string;
  actionId: string;
}) {
  try {
    const db = dbClient();
    const access = await requireVolunteerTeamAccess(db, input);
    if (!access.ok) return access;
    const existing = await run<{ id: string; joined_at: string }>(db.from("volunteer_waitlist_entries")
      .select("id,joined_at")
      .eq("user_id", input.userId)
      .eq("idempotency_key", input.actionId)
      .maybeSingle());
    if (existing.data) {
      return { ok: true, message: "You are already on this volunteer waitlist.", waitlistEntry: existing.data };
    }
    const result = await run(db.from("volunteer_waitlist_entries").insert({
      organization_id: access.signup.organization_id,
      team_id: access.signup.team_id,
      volunteer_signup_id: access.signup.id,
      user_id: input.userId,
      idempotency_key: input.actionId
    }).select("id,joined_at,withdrawn_at,promoted_at").single());
    if (result.error || !result.data) return { ok: false, message: "Volunteer waitlist entry could not be saved." };
    return { ok: true, message: "Added to the volunteer waitlist. Your contact details remain private.", waitlistEntry: result.data };
  } catch {
    return { ok: false, message: "Volunteer waitlist could not reach team records." };
  }
}

export async function withdrawVolunteerWaitlist(input: {
  waitlistEntryId: string;
  userId: string;
}) {
  try {
    const db = dbClient();
    const result = await run(db.from("volunteer_waitlist_entries")
      .update({ withdrawn_at: new Date().toISOString() })
      .eq("id", input.waitlistEntryId)
      .eq("user_id", input.userId)
      .is("promoted_at", null)
      .select("id,withdrawn_at")
      .maybeSingle());
    if (result.error || !result.data) return { ok: false, message: "Active waitlist entry was not found." };
    return { ok: true, message: "Volunteer waitlist entry withdrawn.", waitlistEntry: result.data };
  } catch {
    return { ok: false, message: "Volunteer waitlist could not reach team records." };
  }
}

export async function requestVolunteerTransfer(input: {
  signupId: string;
  userId: string;
  reason: string;
  actionId: string;
}) {
  const reason = input.reason.trim();
  if (!reason || reason.length > 1000 || !input.actionId) {
    return { ok: false, message: "Transfer request requires a short reason and action receipt." };
  }
  try {
    const db = dbClient();
    const access = await requireVolunteerTeamAccess(db, input);
    if (!access.ok) return access;
    if (access.signup.assigned_user_id !== input.userId) {
      return { ok: false, message: "Only the assigned volunteer can request a transfer." };
    }
    const result = await run(db.from("volunteer_transfer_requests").insert({
      organization_id: access.signup.organization_id,
      team_id: access.signup.team_id,
      volunteer_signup_id: access.signup.id,
      requested_by_user_id: input.userId,
      reason,
      idempotency_key: input.actionId
    }).select("id,requested_at").single());
    if (result.error?.code === "23505") return { ok: true, message: "Volunteer transfer request was already recorded." };
    if (result.error || !result.data) return { ok: false, message: "Volunteer transfer request could not be saved." };
    return { ok: true, message: "Transfer request saved for staff review. No family contact details were shared.", transferRequest: result.data };
  } catch {
    return { ok: false, message: "Volunteer transfer request could not reach team records." };
  }
}

export async function promoteVolunteerWaitlist(input: {
  waitlistEntryId: string;
  actorUserId: string;
}) {
  try {
    const db = dbClient();
    const entry = await run<{ id: string; team_id: string }>(db.from("volunteer_waitlist_entries")
      .select("id,team_id")
      .eq("id", input.waitlistEntryId)
      .maybeSingle());
    if (entry.error || !entry.data) return { ok: false, message: "Waitlist entry was not found." };
    const access = await requireActiveTeamCoachOrOrgAdmin({
      db,
      teamId: entry.data.team_id,
      userId: input.actorUserId,
      action: "promote a volunteer waitlist entry"
    });
    if (!access.ok) return { ok: false, message: access.message };
    const result = await run<Record<string, unknown>>(db.rpc("promote_volunteer_waitlist_entry", {
      p_waitlist_entry_id: input.waitlistEntryId,
      p_actor_user_id: input.actorUserId
    }));
    if (result.error || !result.data) return { ok: false, message: "Waitlist promotion could not be saved." };
    return result.data;
  } catch {
    return { ok: false, message: "Waitlist promotion could not reach team records." };
  }
}
