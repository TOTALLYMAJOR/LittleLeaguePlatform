import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createSupabaseAdminClient } from "./admin";
import { createSnackReminderDrafts, unclaimSnackSlot } from "./operations";

vi.mock("./admin", () => ({
  createSupabaseAdminClient: vi.fn()
}));

const adminClientMock = vi.mocked(createSupabaseAdminClient);

function communityClient() {
  const inserts: Array<{ table: string; value: unknown }> = [];
  const updates: Array<{ table: string; value: Record<string, unknown> }> = [];

  return {
    inserts,
    updates,
    client: {
      from(table: string) {
        const builder = {
          operation: "select",
          payload: {} as Record<string, unknown>,
          filters: {} as Record<string, string>,
          select() { return this; },
          eq(column: string, value: string) {
            this.filters[column] = value;
            return this;
          },
          single() { return this; },
          insert(value: unknown) {
            this.operation = "insert";
            inserts.push({ table, value });
            return this;
          },
          update(value: Record<string, unknown>) {
            this.operation = "update";
            this.payload = value;
            updates.push({ table, value });
            return this;
          },
          then(resolve: (value: { data: unknown; error: null }) => unknown, reject?: (reason?: unknown) => unknown) {
            let data: unknown = null;
            if (table === "teams") data = { id: "team-1", organization_id: "org-1" };
            if (table === "organization_memberships") data = [];
            if (table === "team_memberships" && this.filters.role === "parent") {
              data = [{ user_id: "user-parent-1" }, { user_id: "user-parent-2" }];
            } else if (table === "team_memberships" && this.filters.user_id === "user-coach") {
              data = [{ id: "membership-coach", role: "coach" }];
            } else if (table === "team_memberships" && this.filters.user_id === "user-other") {
              data = [];
            } else if (table === "team_memberships") {
              data = [{ id: "membership-parent", role: "parent" }];
            }
            if (table === "volunteer_signups" && this.operation === "select" && this.filters.id) {
              data = {
                id: "volunteer-1",
                team_id: "team-1",
                event_id: "event-1",
                role: "Score helper",
                assigned_user_id: null,
                status: "open",
                role_cap: 1
              };
            }
            if (table === "volunteer_signups" && this.operation === "select" && this.filters.status === "filled") {
              data = [{ id: "volunteer-filled" }];
            }
            if (table === "snack_schedule_slots" && this.operation === "select" && this.filters.id) {
              data = {
                id: "snack-1",
                team_id: "team-1",
                event_id: "event-1",
                item: "Orange slices",
                assigned_parent_user_id: "user-parent-1",
                status: "assigned",
                slot_cap: 1
              };
            }
            if (table === "snack_schedule_slots" && this.operation === "select" && !this.filters.id) {
              data = [{
                id: "snack-1",
                event_id: "event-1",
                item: "Orange slices",
                assigned_parent_user_id: null,
                status: "open",
                reminder_draft_count: 0
              }];
            }
            if (this.operation === "update") data = { id: this.filters.id ?? "updated", ...this.payload };
            return Promise.resolve({ data, error: null }).then(resolve, reject);
          }
        };
        return builder;
      }
    }
  };
}

describe("community snack and volunteer operations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("enforces snack and volunteer caps inside service-role-only transactions", () => {
    const migration = readFileSync(
      join(process.cwd(), "supabase/migrations/20260729144504_community_claim_caps.sql"),
      "utf8"
    );

    expect(migration).toContain("claim_snack_slot_compare_and_set");
    expect(migration).toContain("claim_volunteer_role_compare_and_set");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });

  it("blocks snack unclaim when the actor is neither assignee nor staff", async () => {
    const { client } = communityClient();
    adminClientMock.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const result = await unclaimSnackSlot({
      slotId: "snack-1",
      actorUserId: "user-other",
      reason: "Schedule changed"
    });

    expect(result.ok).toBe(false);
    expect(result.message).toContain("assigned parent");
  });

  it("drafts snack reminders as pending notifications without provider sends", async () => {
    const { client, inserts, updates } = communityClient();
    adminClientMock.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const result = await createSnackReminderDrafts({
      teamId: "team-1",
      actorUserId: "user-coach"
    });

    expect(result.ok).toBe(true);
    expect(result.notificationCount).toBe(2);
    expect(inserts.find((entry) => entry.table === "notifications")?.value).toEqual([
      expect.objectContaining({ notification_type: "snack_reminder", status: "pending", channel: "email" }),
      expect.objectContaining({ notification_type: "snack_reminder", status: "pending", channel: "email" })
    ]);
    expect(updates.find((entry) => entry.table === "snack_schedule_slots")?.value).toMatchObject({
      reminder_draft_count: 1
    });
  });
});
