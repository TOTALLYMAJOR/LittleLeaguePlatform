import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseAdminClient } from "./admin";
import { listRegistrationRequests } from "./registrations";

vi.mock("./admin", () => ({
  createSupabaseAdminClient: vi.fn(),
}));

const createSupabaseAdminClientMock = vi.mocked(createSupabaseAdminClient);

describe("registration request tenant scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const rows = [
      {
        id: "request-a",
        organization_id: "org-a",
        season_id: "season-a",
        team_id: "team-a",
        parent_name: "Parent A",
        parent_email: "a@example.com",
        player_first_name: "Avery",
        player_last_initial: "A",
        status: "pending",
        created_at: "2026-08-20T12:00:00.000Z",
        reviewed_at: null,
        reviewed_by_user_id: null,
      },
      {
        id: "request-b",
        organization_id: "org-b",
        season_id: "season-b",
        team_id: "team-b",
        parent_name: "Parent B",
        parent_email: "b@example.com",
        player_first_name: "Blake",
        player_last_initial: "B",
        status: "pending",
        created_at: "2026-08-20T13:00:00.000Z",
        reviewed_at: null,
        reviewed_by_user_id: null,
      },
    ];
    let result = { data: rows, error: null };
    const query = {
      select: vi.fn(),
      in: vi.fn(),
      order: vi.fn(),
      then: (
        resolve: (value: typeof result) => unknown,
        reject: (reason: unknown) => unknown,
      ) => Promise.resolve(result).then(resolve, reject),
    };
    query.select.mockReturnValue(query);
    query.in.mockImplementation((column: string, values: string[]) => {
      result = {
        data: rows.filter((row) => values.includes(row[column as keyof typeof row] as string)),
        error: null,
      };
      return query;
    });
    query.order.mockReturnValue(query);
    createSupabaseAdminClientMock.mockReturnValue({
      from: vi.fn(() => query),
    } as never);
  });

  it("returns only requests in the signed-in admin organizations", async () => {
    const requests = await listRegistrationRequests({ organizationIds: ["org-a"] });

    expect(requests.map((request) => request.id)).toEqual(["request-a"]);
  });

  it("fails closed when the caller has no organization scope", async () => {
    await expect(listRegistrationRequests({ organizationIds: [] })).resolves.toEqual([]);
    expect(createSupabaseAdminClientMock).not.toHaveBeenCalled();
  });
});
