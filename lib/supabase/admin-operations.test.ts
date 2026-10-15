import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdminClient } from "./admin";
import { listAdminOperationsData } from "./admin-operations";

vi.mock("./admin", () => ({
  createSupabaseAdminClient: vi.fn()
}));

const adminClientMock = vi.mocked(createSupabaseAdminClient);

function query(result: { data: unknown[] | null; error?: unknown }) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    then: (resolve: (value: { data: unknown[] | null; error?: unknown }) => unknown) => Promise.resolve(result).then(resolve)
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  return chain;
}

describe("listAdminOperationsData", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("scopes every service-role aggregate to the explicit organization", async () => {
    const queries = {
      organizations: query({ data: [{ id: "org-2", name: "North League" }] }),
      seasons: query({ data: [{ id: "season-2", name: "Fall", status: "active" }] }),
      registration_requests: query({ data: [{ id: "registration-1", status: "pending" }] }),
      notifications: query({ data: [{ id: "notification-1", status: "pending", provider_approval_status: "pending" }] }),
      media_items: query({ data: [{ id: "media-1", moderation_status: "pending" }] }),
      audit_events: query({ data: [{ id: "audit-1", action: "review", target_type: "registration", summary: "Reviewed", created_at: "2026-10-15T00:00:00.000Z" }] })
    };
    adminClientMock.mockReturnValue({
      from: vi.fn((table: keyof typeof queries) => queries[table])
    } as never);

    const result = await listAdminOperationsData({ organizationId: "org-2" });

    expect(queries.organizations.eq).toHaveBeenCalledWith("id", "org-2");
    for (const table of ["seasons", "registration_requests", "notifications", "media_items", "audit_events"] as const) {
      expect(queries[table].eq).toHaveBeenCalledWith("organization_id", "org-2");
    }
    expect(result.settings).toMatchObject({ organizationId: "org-2", organizationName: "North League" });
    expect(result.approvalQueues.map((queueItem) => queueItem.count)).toEqual([1, 1, 1]);
    expect(result.auditLogs).toHaveLength(1);
  });

  it("does not create a service-role client when organization scope is blank", async () => {
    const result = await listAdminOperationsData({ organizationId: "   " });

    expect(adminClientMock).not.toHaveBeenCalled();
    expect(result.settings.activeSeasonStatus).toBe("unavailable");
    expect(result.approvalQueues).toEqual([]);
    expect(result.auditLogs).toEqual([]);
  });

  it("withholds every aggregate when any PostgREST read fails", async () => {
    const queries = {
      organizations: query({ data: [{ id: "org-2", name: "North League" }] }),
      seasons: query({ data: [{ id: "season-2", name: "Fall", status: "active" }] }),
      registration_requests: query({ data: null, error: { message: "unavailable" } }),
      notifications: query({ data: [] }),
      media_items: query({ data: [] }),
      audit_events: query({ data: [] })
    };
    adminClientMock.mockReturnValue({
      from: vi.fn((table: keyof typeof queries) => queries[table])
    } as never);

    const result = await listAdminOperationsData({ organizationId: "org-2" });

    expect(result.settings).toMatchObject({ organizationId: "org-2", activeSeasonStatus: "unavailable" });
    expect(result.message).toContain("withheld rather than shown as zero");
    expect(result.approvalQueues).toEqual([]);
    expect(result.auditLogs).toEqual([]);
  });

  it("does not substitute global seed records when the scoped season is missing", async () => {
    const queries = {
      organizations: query({ data: [{ id: "org-2", name: "North League" }] }),
      seasons: query({ data: [] }),
      registration_requests: query({ data: [] }),
      notifications: query({ data: [] }),
      media_items: query({ data: [] }),
      audit_events: query({ data: [] })
    };
    adminClientMock.mockReturnValue({
      from: vi.fn((table: keyof typeof queries) => queries[table])
    } as never);

    const result = await listAdminOperationsData({ organizationId: "org-2" });

    expect(result.settings).toEqual({
      organizationId: "org-2",
      organizationName: "Authorized organization",
      activeSeasonName: "Unavailable",
      activeSeasonStatus: "unavailable",
      timezone: "America/Chicago"
    });
    expect(result.approvalQueues).toEqual([]);
    expect(result.auditLogs).toEqual([]);
  });
});
