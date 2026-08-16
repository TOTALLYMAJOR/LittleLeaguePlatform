import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireActiveTeamCoachOrOrgAdmin } from "./access-control";
import { createSupabaseAdminClient } from "./admin";
import { createCoachRsvpReminderDraft } from "./operations";

vi.mock("./admin", () => ({
  createSupabaseAdminClient: vi.fn()
}));

vi.mock("./access-control", () => ({
  requireActiveOrganizationAdmin: vi.fn(),
  requireActiveParentForPlayerEvent: vi.fn(),
  requireActiveTeamCoachOrOrgAdmin: vi.fn()
}));

const adminClientMock = vi.mocked(createSupabaseAdminClient);
const teamAccessMock = vi.mocked(requireActiveTeamCoachOrOrgAdmin);

interface ReminderClientOptions {
  event?: { id: string; team_id: string; title: string } | null;
  guardians?: Array<{ player_id: string }>;
  rsvps?: Array<{ player_id: string }>;
  existingDraft?: { id: string } | null;
  eventError?: boolean;
  guardianError?: boolean;
  rsvpError?: boolean;
  duplicateCheckError?: boolean;
  notificationError?: boolean;
  auditError?: boolean;
}

function reminderClient(options: ReminderClientOptions = {}) {
  const inserts: Array<{ table: string; value: unknown }> = [];
  const defaults = {
    event: { id: "event-1", team_id: "team-1", title: "Saturday game" },
    guardians: [{ player_id: "player-1" }, { player_id: "player-2" }],
    rsvps: [] as Array<{ player_id: string }>,
    existingDraft: null as { id: string } | null
  };
  const state = { ...defaults, ...options };

  return {
    inserts,
    client: {
      from(table: string) {
        const builder = {
          operation: "select",
          filters: {} as Record<string, unknown>,
          select() { return this; },
          eq(column: string, value: unknown) {
            this.filters[column] = value;
            return this;
          },
          maybeSingle() { return this; },
          single() { return this; },
          insert(value: unknown) {
            this.operation = "insert";
            inserts.push({ table, value });
            return this;
          },
          then(resolve: (value: { data: unknown; error: { message: string } | null }) => unknown, reject?: (reason?: unknown) => unknown) {
            let data: unknown = null;
            let error: { message: string } | null = null;

            if (table === "events") {
              data = state.event;
              if (state.eventError) error = { message: "event unavailable" };
            }
            if (table === "player_guardians") {
              data = state.guardians;
              if (state.guardianError) error = { message: "guardian unavailable" };
            }
            if (table === "rsvps") {
              data = state.rsvps;
              if (state.rsvpError) error = { message: "rsvp unavailable" };
            }
            if (table === "notifications" && this.operation === "select") {
              data = state.existingDraft;
              if (state.duplicateCheckError) error = { message: "duplicate check unavailable" };
            }
            if (table === "notifications" && this.operation === "insert") {
              data = state.notificationError ? null : { id: "notification-1" };
              if (state.notificationError) error = { message: "notification unavailable" };
            }
            if (table === "audit_events" && this.operation === "insert") {
              if (state.auditError) error = { message: "audit unavailable" };
            }

            return Promise.resolve({ data, error }).then(resolve, reject);
          }
        };
        return builder;
      }
    }
  };
}

describe("coach RSVP reminder drafts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    teamAccessMock.mockResolvedValue({
      ok: true,
      message: "Access allowed.",
      team: {
        id: "team-1",
        organization_id: "org-1",
        season_id: "season-1",
        name: "Tiny Tigers"
      }
    });
  });

  it("rejects missing scope before creating a Supabase client", async () => {
    const result = await createCoachRsvpReminderDraft({
      teamId: " ",
      eventId: "event-1",
      parentUserId: "parent-1",
      actorUserId: "coach-1"
    });

    expect(result).toMatchObject({ ok: false, code: "invalid_input" });
    expect(adminClientMock).not.toHaveBeenCalled();
  });

  it("fails closed before team queries when the session actor lacks staff authority", async () => {
    const { client, inserts } = reminderClient();
    adminClientMock.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);
    teamAccessMock.mockResolvedValue({ ok: false, message: "Access denied." });

    const result = await createCoachRsvpReminderDraft({
      teamId: "team-1",
      eventId: "event-1",
      parentUserId: "parent-1",
      actorUserId: "other-user"
    });

    expect(result).toMatchObject({ ok: false, code: "forbidden" });
    expect(inserts).toHaveLength(0);
  });

  it("uses one non-enumerating failure for cross-team event or guardian scope", async () => {
    const { client, inserts } = reminderClient({ event: null, guardians: [] });
    adminClientMock.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const result = await createCoachRsvpReminderDraft({
      teamId: "team-1",
      eventId: "event-other-team",
      parentUserId: "parent-other-team",
      actorUserId: "coach-1"
    });

    expect(result).toMatchObject({ ok: false, code: "scope_mismatch" });
    expect(result.message).not.toContain("guardian");
    expect(inserts).toHaveLength(0);
  });

  it("does not confuse scope-query failure with an invalid family", async () => {
    const { client, inserts } = reminderClient({ guardianError: true });
    adminClientMock.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const result = await createCoachRsvpReminderDraft({
      teamId: "team-1",
      eventId: "event-1",
      parentUserId: "parent-1",
      actorUserId: "coach-1"
    });

    expect(result).toMatchObject({ ok: false, code: "unavailable" });
    expect(inserts).toHaveLength(0);
  });

  it("refuses a reminder when every linked player has responded", async () => {
    const { client, inserts } = reminderClient({
      rsvps: [{ player_id: "player-1" }, { player_id: "player-2" }]
    });
    adminClientMock.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const result = await createCoachRsvpReminderDraft({
      teamId: "team-1",
      eventId: "event-1",
      parentUserId: "parent-1",
      actorUserId: "coach-1"
    });

    expect(result).toMatchObject({ ok: false, code: "already_responded" });
    expect(inserts).toHaveLength(0);
  });

  it("reuses an existing pending draft and records the review attempt", async () => {
    const { client, inserts } = reminderClient({ existingDraft: { id: "notification-existing" } });
    adminClientMock.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const result = await createCoachRsvpReminderDraft({
      teamId: "team-1",
      eventId: "event-1",
      parentUserId: "parent-1",
      actorUserId: "coach-1"
    });

    expect(result).toMatchObject({
      ok: true,
      code: "duplicate",
      duplicate: true,
      notificationId: "notification-existing"
    });
    expect(inserts.filter((entry) => entry.table === "notifications")).toHaveLength(0);
    expect(inserts.find((entry) => entry.table === "audit_events")?.value).toMatchObject({
      action: "rsvp_reminder_draft_reused",
      actor_user_id: "coach-1",
      target_id: "notification-existing"
    });
  });

  it("creates one tenant-scoped pending email draft and an audit receipt without a provider attempt", async () => {
    const { client, inserts } = reminderClient({ rsvps: [{ player_id: "player-1" }] });
    adminClientMock.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const result = await createCoachRsvpReminderDraft({
      teamId: "team-1",
      eventId: "event-1",
      parentUserId: "parent-1",
      actorUserId: "coach-1"
    });

    expect(result).toMatchObject({ ok: true, code: "created", duplicate: false });
    expect(inserts.find((entry) => entry.table === "notifications")?.value).toMatchObject({
      organization_id: "org-1",
      team_id: "team-1",
      event_id: "event-1",
      recipient_user_id: "parent-1",
      channel: "email",
      status: "pending"
    });
    expect(inserts.find((entry) => entry.table === "audit_events")?.value).toMatchObject({
      organization_id: "org-1",
      actor_user_id: "coach-1",
      action: "rsvp_reminder_draft_created",
      target_id: "notification-1"
    });
    expect(inserts.map((entry) => entry.table)).toEqual(["notifications", "audit_events"]);
  });

  it("reports notification persistence failure without creating an audit receipt", async () => {
    const { client, inserts } = reminderClient({ notificationError: true });
    adminClientMock.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const result = await createCoachRsvpReminderDraft({
      teamId: "team-1",
      eventId: "event-1",
      parentUserId: "parent-1",
      actorUserId: "coach-1"
    });

    expect(result).toMatchObject({ ok: false, code: "unavailable" });
    expect(inserts.filter((entry) => entry.table === "audit_events")).toHaveLength(0);
  });

  it("makes the persisted-draft partial failure explicit when audit storage is unavailable", async () => {
    const { client } = reminderClient({ auditError: true });
    adminClientMock.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const result = await createCoachRsvpReminderDraft({
      teamId: "team-1",
      eventId: "event-1",
      parentUserId: "parent-1",
      actorUserId: "coach-1"
    });

    expect(result).toMatchObject({
      ok: false,
      code: "audit_unavailable",
      notificationId: "notification-1",
      draftPersisted: true
    });
  });
});
