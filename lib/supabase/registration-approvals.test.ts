import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdminClient } from "./admin";
import { listRegistrationRequests } from "./registrations";
import {
  approveRegistrationRequest,
  listRegistrationReviewData,
} from "./registration-approvals";

vi.mock("./admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));
vi.mock("./registrations", () => ({
  listRegistrationRequests: vi.fn(),
}));

const createSupabaseAdminClientMock = vi.mocked(createSupabaseAdminClient);
const listRegistrationRequestsMock = vi.mocked(listRegistrationRequests);

type Row = Record<string, unknown>;

const datasets: Record<string, Row[]> = {
  organization_memberships: [
    { user_id: "admin-a", organization_id: "org-a", role: "admin", status: "active" },
    { user_id: "admin-b", organization_id: "org-b", role: "admin", status: "active" },
  ],
  profiles: [
    { id: "admin-a", display_name: "Admin A", email: "a@example.com", default_role: "admin" },
    { id: "admin-b", display_name: "Admin B", email: "b@example.com", default_role: "admin" },
  ],
  registration_approval_actions: [
    { id: "action-a", registration_request_id: "request-a", organization_id: "org-a", action: "approved", note: "Verified A", created_at: "2026-08-20T12:00:00.000Z" },
    { id: "action-b", registration_request_id: "request-b", organization_id: "org-b", action: "approved", note: "Verified B", created_at: "2026-08-20T13:00:00.000Z" },
  ],
};

function queryFor(table: string) {
  let rows = [...(datasets[table] ?? [])];
  let result = { data: rows, error: null };
  const query: Record<string, unknown> = {};
  query.select = vi.fn(() => query);
  query.eq = vi.fn((column: string, value: unknown) => {
    rows = rows.filter((row) => row[column] === value);
    result = { data: rows, error: null };
    return query;
  });
  query.in = vi.fn((column: string, values: unknown[]) => {
    rows = rows.filter((row) => values.includes(row[column]));
    result = { data: rows, error: null };
    return query;
  });
  query.order = vi.fn(() => query);
  query.limit = vi.fn(() => query);
  query.then = (
    resolve: (value: typeof result) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return query;
}

describe("registration approval verification boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listRegistrationRequestsMock.mockResolvedValue([]);
    createSupabaseAdminClientMock.mockReturnValue({
      from: (table: string) => queryFor(table),
    } as never);
  });

  it("requires review evidence before attempting the approval RPC", async () => {
    const result = await approveRegistrationRequest({
      requestId: "request-1",
      reviewerUserId: "admin-1",
      note: "   ",
    });

    expect(result).toEqual({
      ok: false,
      message:
        "Registration request, reviewer, and verification note are required.",
    });
  });

  it("limits the review queue, actions, and reviewer identities to the admin organizations", async () => {
    const data = await listRegistrationReviewData({ organizationIds: ["org-a"] });

    expect(listRegistrationRequestsMock).toHaveBeenCalledWith({ organizationIds: ["org-a"] });
    expect(data.reviewers.map((reviewer) => reviewer.id)).toEqual(["admin-a"]);
    expect(data.actions.map((action) => action.id)).toEqual(["action-a"]);
  });

  it("fails closed before database access without an admin organization", async () => {
    await expect(listRegistrationReviewData({ organizationIds: [] })).resolves.toEqual({
      registrationRequests: [],
      reviewers: [],
      actions: [],
    });
    expect(createSupabaseAdminClientMock).not.toHaveBeenCalled();
    expect(listRegistrationRequestsMock).not.toHaveBeenCalled();
  });
});
