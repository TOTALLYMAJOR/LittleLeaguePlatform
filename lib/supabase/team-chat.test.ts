import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createSupabaseAdminClient } from "./admin";
import {
  reportSupabaseTeamChatMessage,
  reviewSupabaseTeamChatReport,
  runSupabaseTeamChatRetentionJob
} from "./team-chat";

vi.mock("./admin", () => ({
  createSupabaseAdminClient: vi.fn()
}));

const adminClientMock = vi.mocked(createSupabaseAdminClient);

function teamChatClient() {
  const inserts: Array<{ table: string; value: Record<string, unknown> }> = [];
  const updates: Array<{ table: string; value: Record<string, unknown> }> = [];
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const baseMessage = {
    id: "message-1",
    organization_id: "org-1",
    season_id: "season-1",
    team_id: "team-1",
    channel_id: "channel-1",
    event_id: null,
    author_user_id: "user-parent",
    author_role: "parent",
    message_kind: "message",
    announcement_topic: null,
    body: "Can someone check this?",
    pinned: false,
    moderation_status: "visible",
    read_by_user_ids: [],
    created_at: "2026-07-16T12:00:00.000Z",
    edited_at: null,
    deleted_at: null,
    moderated_at: null,
    moderated_by_user_id: null,
    moderation_reason: null,
    reported_count: 0
  };
  const report = {
    id: "report-1",
    message_id: "message-1",
    team_id: "team-1",
    reporter_user_id: "user-parent",
    reason: "Needs review",
    status: "open",
    reviewed_by_user_id: null,
    reviewed_at: null,
    created_at: "2026-07-16T12:01:00.000Z"
  };

  return {
    inserts,
    updates,
    rpcCalls,
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
          insert(value: Record<string, unknown>) {
            this.operation = "insert";
            this.payload = value;
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
            if (table === "profiles") {
              data = {
                id: this.filters.id,
                default_role: this.filters.id === "user-coach" ? "coach" : "parent"
              };
            }
            if (table === "teams") data = { id: "team-1", organization_id: "org-1", season_id: "season-1" };
            if (table === "team_memberships") {
              data = [{
                id: "membership-1",
                role: this.filters.user_id === "user-coach" ? "coach" : "parent",
                status: "active"
              }];
            }
            if (table === "team_chat_messages" && this.operation === "select") data = baseMessage;
            if (table === "team_chat_messages" && this.operation === "update") data = { ...baseMessage, ...this.payload };
            if (table === "team_chat_reports" && this.operation === "select" && this.filters.id === "report-1") data = report;
            if (table === "team_chat_reports" && this.operation === "insert") data = report;
            if (table === "team_chat_reports" && this.operation === "update") {
              data = {
                ...report,
                ...this.payload,
                reviewed_by_user_id: this.payload.reviewed_by_user_id,
                reviewed_at: this.payload.reviewed_at
              };
            }
            return Promise.resolve({ data, error: null }).then(resolve, reject);
          }
        };
        return builder;
      },
      rpc(name: string, args: Record<string, unknown>) {
        rpcCalls.push({ name, args });
        return Promise.resolve({ data: 0, error: null });
      }
    }
  };
}

describe("Team Chat report and retention services", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates report rows, increments reported count, and audits the report", async () => {
    const { client, inserts, updates } = teamChatClient();
    adminClientMock.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const result = await reportSupabaseTeamChatMessage({
      messageId: "message-1",
      reporterUserId: "user-parent",
      reason: "Needs review"
    });

    expect(result.ok).toBe(true);
    expect(result.report?.status).toBe("open");
    expect(updates.find((entry) => entry.table === "team_chat_messages")?.value).toMatchObject({ reported_count: 1 });
    expect(inserts.find((entry) => entry.table === "audit_events")?.value).toMatchObject({
      action: "team_chat_message_reported",
      actor_user_id: "user-parent"
    });
  });

  it("lets a coach review report rows and writes an audit event", async () => {
    const { client, inserts, updates } = teamChatClient();
    adminClientMock.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const result = await reviewSupabaseTeamChatReport({
      reportId: "report-1",
      reviewerUserId: "user-coach",
      status: "dismissed",
      reason: "Reviewed with no action."
    });

    expect(result.ok).toBe(true);
    expect(result.report?.status).toBe("dismissed");
    expect(updates.find((entry) => entry.table === "team_chat_reports")?.value).toMatchObject({
      status: "dismissed",
      reviewed_by_user_id: "user-coach"
    });
    expect(inserts.find((entry) => entry.table === "audit_events")?.value).toMatchObject({
      action: "team_chat_report_reviewed",
      actor_user_id: "user-coach"
    });
  });

  it("runs retention idempotently when no expired messages are returned", async () => {
    const { client, inserts, rpcCalls } = teamChatClient();
    adminClientMock.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const result = await runSupabaseTeamChatRetentionJob({
      teamId: "team-1",
      actorUserId: "user-coach",
      retentionCutoff: "2026-07-16T12:00:00.000Z"
    });

    expect(result.ok).toBe(true);
    expect(result.purgedCount).toBe(0);
    expect(result.message).toContain("no expired messages");
    expect(rpcCalls).toEqual([{
      name: "purge_expired_team_chat_messages_for_team",
      args: {
        p_team_id: "team-1",
        p_retention_cutoff: "2026-07-16T12:00:00.000Z"
      }
    }]);
    expect(inserts.find((entry) => entry.table === "audit_events")?.value).toMatchObject({
      action: "team_chat_retention_run",
      actor_user_id: "user-coach"
    });

    const migration = readFileSync(
      join(process.cwd(), "supabase/migrations/20260729144505_team_chat_retention_scope.sql"),
      "utf8"
    );
    expect(migration).toContain("where team_id = p_team_id");
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });
});
