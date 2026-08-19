import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireActiveOrganizationAdmin } from "@/lib/supabase/access-control";
import { listAdminOperationsData } from "@/lib/supabase/admin-operations";
import { createOperationsCopilotBrief } from "@/lib/supabase/operations-copilot";

vi.mock("@/lib/supabase/route-auth", () => ({ requireAuthenticatedRouteUser: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/access-control", () => ({ requireActiveOrganizationAdmin: vi.fn() }));
vi.mock("@/lib/supabase/admin-operations", () => ({ listAdminOperationsData: vi.fn() }));
vi.mock("@/lib/supabase/operations-copilot", () => ({ createOperationsCopilotBrief: vi.fn() }));

const operationsData = {
  source: "supabase" as const,
  settings: {
    organizationId: "org-1",
    organizationName: "League",
    activeSeasonName: "Spring",
    activeSeasonStatus: "active" as const,
    timezone: "America/Chicago"
  },
  providerInventory: [],
  approvalQueues: [],
  auditLogs: [],
  message: "Scoped records."
};

function request() {
  return new Request("http://localhost/api/admin/operations-copilot/generate", {
    method: "POST",
    headers: {
      authorization: "Bearer session",
      "content-type": "application/json",
      "idempotency-key": "operations-request-1"
    },
    body: JSON.stringify({ organizationId: "org-1" })
  });
}

describe("/api/admin/operations-copilot/generate", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireAuthenticatedRouteUser).mockResolvedValue({ ok: true, user: { id: "admin-1" } });
    vi.mocked(createSupabaseAdminClient).mockReturnValue({ from: vi.fn() } as never);
    vi.mocked(requireActiveOrganizationAdmin).mockResolvedValue({ ok: true, message: "Access allowed.", organizationId: "org-1" });
    vi.mocked(listAdminOperationsData).mockResolvedValue(operationsData);
    vi.mocked(createOperationsCopilotBrief).mockResolvedValue({
      ok: true,
      message: "Brief recorded.",
      agentRunId: "run-1",
      proposalCount: 2,
      source: "deterministic"
    });
  });

  it("scopes briefing creation to the verified organization admin", async () => {
    const response = await POST(request());

    expect(response.status).toBe(201);
    expect(requireActiveOrganizationAdmin).toHaveBeenCalledWith({
      db: expect.anything(),
      organizationId: "org-1",
      userId: "admin-1",
      action: "create an Operations Copilot briefing"
    });
    expect(listAdminOperationsData).toHaveBeenCalledWith({ organizationId: "org-1" });
    expect(createOperationsCopilotBrief).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-1",
      actorUserId: "admin-1",
      requestKey: "operations-request-1"
    }));
  });

  it("denies cross-organization generation before reading operations data", async () => {
    vi.mocked(requireActiveOrganizationAdmin).mockResolvedValue({ ok: false, message: "Admin access required." });

    const response = await POST(request());

    expect(response.status).toBe(403);
    expect(listAdminOperationsData).not.toHaveBeenCalled();
    expect(createOperationsCopilotBrief).not.toHaveBeenCalled();
  });
});
