import { requireActiveParentForPlayerEvent } from "./access-control";
import { createSupabaseAdminClient } from "./admin";
import { withSupabaseTimeout } from "./timeout";

type UnsafeSupabase = {
  // Family handoffs are introduced by the coordination-loop migration.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from(table: string): any;
};

export interface FamilyEventHandoff {
  id: string;
  organizationId: string;
  teamId: string;
  eventId: string;
  playerId: string;
  requestedByUserId: string;
  caregiverLabel: string;
  note?: string;
  confirmedAt: string;
  cancelledAt?: string;
  createdAt: string;
}

type HandoffRow = {
  id: string;
  organization_id: string;
  team_id: string;
  event_id: string;
  player_id: string;
  requested_by_user_id: string;
  caregiver_label: string;
  note: string | null;
  confirmed_at: string;
  cancelled_at: string | null;
  created_at: string;
};

const handoffColumns = [
  "id",
  "organization_id",
  "team_id",
  "event_id",
  "player_id",
  "requested_by_user_id",
  "caregiver_label",
  "note",
  "confirmed_at",
  "cancelled_at",
  "created_at"
].join(",");

function dbClient() {
  return createSupabaseAdminClient() as unknown as UnsafeSupabase;
}

function mapHandoff(row: HandoffRow): FamilyEventHandoff {
  return {
    id: row.id,
    organizationId: row.organization_id,
    teamId: row.team_id,
    eventId: row.event_id,
    playerId: row.player_id,
    requestedByUserId: row.requested_by_user_id,
    caregiverLabel: row.caregiver_label,
    note: row.note ?? undefined,
    confirmedAt: row.confirmed_at,
    cancelledAt: row.cancelled_at ?? undefined,
    createdAt: row.created_at
  };
}

export async function listParentFamilyHandoffs(input: { parentUserId: string }) {
  if (!input.parentUserId) {
    return { ok: false, message: "Family handoffs require a signed-in parent.", handoffs: [] as FamilyEventHandoff[] };
  }
  try {
    const { data, error } = await withSupabaseTimeout(dbClient()
      .from("family_event_handoffs")
      .select(handoffColumns)
      .eq("requested_by_user_id", input.parentUserId)
      .order("created_at", { ascending: false })
      .limit(30), 7000) as {
        data: HandoffRow[] | null;
        error: { message?: string } | null;
      };
    if (error) return { ok: false, message: "Family handoff records are unavailable.", handoffs: [] as FamilyEventHandoff[] };
    return {
      ok: true,
      message: "Family handoffs loaded for the signed-in guardian.",
      handoffs: (data ?? []).map(mapHandoff)
    };
  } catch {
    return { ok: false, message: "Family handoffs could not reach team records.", handoffs: [] as FamilyEventHandoff[] };
  }
}

export async function saveFamilyEventHandoff(input: {
  parentUserId: string;
  playerId: string;
  eventId: string;
  caregiverLabel: string;
  note?: string;
}) {
  const caregiverLabel = input.caregiverLabel.trim();
  const note = input.note?.trim();
  if (!input.parentUserId || !input.playerId || !input.eventId || caregiverLabel.length < 2 || caregiverLabel.length > 120) {
    return { ok: false, message: "Caregiver handoff requires player, event, guardian, and a 2-120 character caregiver label." };
  }
  if (note && (note.length < 2 || note.length > 1000)) {
    return { ok: false, message: "Caregiver handoff note must be 2-1000 characters." };
  }
  try {
    const db = dbClient();
    const access = await requireActiveParentForPlayerEvent({
      db,
      parentUserId: input.parentUserId,
      playerId: input.playerId,
      eventId: input.eventId
    });
    if (!access.ok) return { ok: false, message: access.message };
    const [{ data: player }, { data: event }] = await withSupabaseTimeout(Promise.all([
      db.from("players").select("id,organization_id,team_id").eq("id", input.playerId).single(),
      db.from("events").select("id,organization_id,team_id").eq("id", input.eventId).single()
    ]), 7000) as [
      { data: { id: string; organization_id: string; team_id: string } | null },
      { data: { id: string; organization_id: string; team_id: string } | null }
    ];
    if (!player || !event || player.team_id !== event.team_id || player.organization_id !== event.organization_id) {
      return { ok: false, message: "Caregiver handoff could not verify the player and event context." };
    }
    const now = new Date().toISOString();
    const { data, error } = await withSupabaseTimeout(db
      .from("family_event_handoffs")
      .upsert({
        organization_id: event.organization_id,
        team_id: event.team_id,
        event_id: event.id,
        player_id: player.id,
        requested_by_user_id: input.parentUserId,
        caregiver_label: caregiverLabel,
        note: note || null,
        confirmed_at: now,
        cancelled_at: null
      }, { onConflict: "event_id,player_id,requested_by_user_id" })
      .select(handoffColumns)
      .single(), 7000) as {
        data: HandoffRow | null;
        error: { message?: string } | null;
      };
    if (error || !data) return { ok: false, message: "Caregiver handoff could not be saved." };
    await withSupabaseTimeout(db.from("audit_events").insert({
      organization_id: event.organization_id,
      actor_user_id: input.parentUserId,
      action: "family_event_handoff_confirmed",
      target_type: "family_event_handoff",
      target_id: data.id,
      summary: "Guardian confirmed a caregiver handoff for one player event. No provider message was sent."
    }), 7000);
    return {
      ok: true,
      message: "Caregiver handoff confirmed for this event. No invitation or provider message was sent.",
      handoff: mapHandoff(data)
    };
  } catch {
    return { ok: false, message: "Caregiver handoff could not reach team records." };
  }
}

export async function cancelFamilyEventHandoff(input: {
  parentUserId: string;
  handoffId: string;
}) {
  if (!input.parentUserId || !input.handoffId) {
    return { ok: false, message: "Canceling a caregiver handoff requires guardian and handoff." };
  }
  try {
    const db = dbClient();
    const { data: existing } = await withSupabaseTimeout(db
      .from("family_event_handoffs")
      .select(handoffColumns)
      .eq("id", input.handoffId)
      .eq("requested_by_user_id", input.parentUserId)
      .maybeSingle(), 7000) as { data: HandoffRow | null };
    if (!existing) return { ok: false, message: "Caregiver handoff is not available to this guardian." };
    if (existing.cancelled_at) {
      return { ok: true, idempotentReplay: true, message: "Caregiver handoff was already cancelled.", handoff: mapHandoff(existing) };
    }
    const access = await requireActiveParentForPlayerEvent({
      db,
      parentUserId: input.parentUserId,
      playerId: existing.player_id,
      eventId: existing.event_id
    });
    if (!access.ok) return { ok: false, message: access.message };
    const { data, error } = await withSupabaseTimeout(db
      .from("family_event_handoffs")
      .update({ cancelled_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("requested_by_user_id", input.parentUserId)
      .select(handoffColumns)
      .single(), 7000) as {
        data: HandoffRow | null;
        error: { message?: string } | null;
      };
    if (error || !data) return { ok: false, message: "Caregiver handoff cancellation could not be saved." };
    await withSupabaseTimeout(db.from("audit_events").insert({
      organization_id: existing.organization_id,
      actor_user_id: input.parentUserId,
      action: "family_event_handoff_cancelled",
      target_type: "family_event_handoff",
      target_id: existing.id,
      summary: "Guardian cancelled a caregiver handoff."
    }), 7000);
    return { ok: true, message: "Caregiver handoff cancelled.", handoff: mapHandoff(data) };
  } catch {
    return { ok: false, message: "Caregiver handoff cancellation could not reach team records." };
  }
}
