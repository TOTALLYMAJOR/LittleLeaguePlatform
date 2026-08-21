import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./api/schedule/export/route";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { requireActiveTeamMemberOrOrgAdmin } from "@/lib/supabase/access-control";
import { listScheduleOperationsData, exportScheduleIcs } from "@/lib/supabase/schedule-management";

vi.mock("@/lib/supabase/route-auth", () => ({ requireAuthenticatedRouteUser: vi.fn() }));
vi.mock("@/lib/supabase/access-control", () => ({ requireActiveTeamMemberOrOrgAdmin: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: vi.fn(() => ({})) }));
vi.mock("@/lib/supabase/schedule-management", () => ({
  listScheduleOperationsData: vi.fn(),
  exportScheduleIcs: vi.fn(() => "BEGIN:VCALENDAR\nEND:VCALENDAR")
}));

const authMock = vi.mocked(requireAuthenticatedRouteUser);
const accessMock = vi.mocked(requireActiveTeamMemberOrOrgAdmin);
const listScheduleMock = vi.mocked(listScheduleOperationsData);
const exportMock = vi.mocked(exportScheduleIcs);

describe("team calendar export authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ ok: true, user: { id: "parent-a" } });
  });

  it("denies an authenticated user without access to the requested team", async () => {
    accessMock.mockResolvedValue({ ok: false, message: "Team access denied." });

    const response = await GET(new Request("http://localhost/api/schedule/export?teamId=team-b"));

    expect(response.status).toBe(403);
    expect(listScheduleMock).not.toHaveBeenCalled();
    expect(exportMock).not.toHaveBeenCalled();
  });

  it("loads only the authorized team's organization before exporting", async () => {
    accessMock.mockResolvedValue({
      ok: true,
      message: "Access allowed.",
      team: { id: "team-a", organization_id: "org-a" }
    });
    listScheduleMock.mockResolvedValue({
      organizationId: "org-a",
      isSupabaseBacked: true,
      message: "Scoped schedule.",
      teams: [],
      events: [],
      fieldLocations: []
    });

    const response = await GET(new Request("http://localhost/api/schedule/export?teamId=team-a"));

    expect(response.status).toBe(200);
    expect(listScheduleMock).toHaveBeenCalledWith({ organizationIds: ["org-a"] });
    expect(exportMock).toHaveBeenCalledWith([], "team-a");
  });
});
