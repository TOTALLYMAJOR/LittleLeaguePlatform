import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdminClient } from "./admin";
import { listCoachDraftReviewData } from "./coach-drafts";

vi.mock("./admin", () => ({
  createSupabaseAdminClient: vi.fn()
}));

const adminClientMock = vi.mocked(createSupabaseAdminClient);

function draftClient(input: {
  data?: Array<Record<string, unknown>>;
  error?: { message: string } | null;
}) {
  const filters = {
    teamIds: [] as string[],
    status: ""
  };
  const query = {
    select() { return this; },
    in(_column: string, values: string[]) {
      filters.teamIds = values;
      return this;
    },
    eq(_column: string, value: string) {
      filters.status = value;
      return this;
    },
    order() { return this; },
    then(resolve: (value: { data: unknown; error: { message: string } | null }) => unknown, reject?: (reason?: unknown) => unknown) {
      return Promise.resolve({ data: input.data ?? [], error: input.error ?? null }).then(resolve, reject);
    }
  };

  return {
    filters,
    client: {
      from: vi.fn(() => query)
    }
  };
}

describe("coach draft review data", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("fails closed before Supabase when no active coach teams are available", async () => {
    const result = await listCoachDraftReviewData({ teamIds: ["", ""] });

    expect(result).toEqual({
      drafts: [],
      isSupabaseBacked: false,
      message: "An active coach team assignment is required to review drafts."
    });
    expect(adminClientMock).not.toHaveBeenCalled();
  });

  it("deduplicates team scope and groups matching recipient rows without exposing recipient identities", async () => {
    const { client, filters } = draftClient({
      data: [
        {
          id: "draft-1",
          team_id: "team-1",
          event_id: "event-1",
          title: "RSVP needed: Saturday game",
          body: "Please record the missing RSVP.",
          channel: "email",
          status: "pending",
          created_at: "2026-08-03T10:00:00.000Z"
        },
        {
          id: "draft-2",
          team_id: "team-1",
          event_id: "event-1",
          title: "RSVP needed: Saturday game",
          body: "Please record the missing RSVP.",
          channel: "email",
          status: "pending",
          created_at: "2026-08-03T10:00:01.000Z"
        }
      ]
    });
    adminClientMock.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const result = await listCoachDraftReviewData({ teamIds: ["team-1", "team-1", "team-2"] });

    expect(filters).toEqual({ teamIds: ["team-1", "team-2"], status: "pending" });
    expect(result.isSupabaseBacked).toBe(true);
    expect(result.drafts).toEqual([{
      id: "draft-1",
      teamId: "team-1",
      eventId: "event-1",
      title: "RSVP needed: Saturday game",
      body: "Please record the missing RSVP.",
      channel: "email",
      createdAt: "2026-08-03T10:00:00.000Z",
      recipientCount: 2
    }]);
    expect(JSON.stringify(result)).not.toContain("recipient_user_id");
  });

  it("returns an empty degraded queue when the pending-draft read fails", async () => {
    const { client } = draftClient({ error: { message: "database unavailable" } });
    adminClientMock.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);

    const result = await listCoachDraftReviewData({ teamIds: ["team-1"] });

    expect(result).toEqual({
      drafts: [],
      isSupabaseBacked: false,
      message: "Pending drafts could not be loaded. No queue is shown."
    });
  });
});
