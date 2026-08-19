import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { requireAuthenticatedRouteUser } from "@/lib/supabase/route-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireActiveOrganizationAdmin } from "@/lib/supabase/access-control";
import { reviewOperationsCopilotProposal } from "@/lib/supabase/operations-copilot";

vi.mock("@/lib/supabase/route-auth", () => ({ requireAuthenticatedRouteUser: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient: vi.fn() }));
vi.mock("@/lib/supabase/access-control", () => ({ requireActiveOrganizationAdmin: vi.fn() }));
vi.mock("@/lib/supabase/operations-copilot", () => ({ reviewOperationsCopilotProposal: vi.fn() }));

function request(reason = "Counts and scope verified.") {
  return new Request("http://localhost/api/admin/operations-copilot/approval-1/review", {
    method: "POST",
    headers: { authorization: "Bearer session", "content-type": "application/json" },
    body: JSON.stringify({ organizationId: "org-1", decision: "approved", reason })
  });
}

describe("/api/admin/operations-copilot/[approvalId]/review", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(requireAuthenticatedRouteUser).mockResolvedValue({ ok: true, user: { id: "admin-1" } });
    vi.mocked(createSupabaseAdminClient).mockReturnValue({ from: vi.fn() } as never);
    vi.mocked(requireActiveOrganizationAdmin).mockResolvedValue({ ok: true, message: "Access allowed.", organizationId: "org-1" });
    vi.mocked(reviewOperationsCopilotProposal).mockResolvedValue({
      ok: true,
      message: "Plan approved. No underlying league action was executed.",
      approval: { id: "approval-1", status: "approved", reviewedAt: "2026-08-18T12:00:00.000Z" }
    });
  });

  it("records a bounded human decision without executing the proposed action", async () => {
    const response = await POST(request(), { params: Promise.resolve({ approvalId: "approval-1" }) });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.message).toContain("No underlying league action was executed");
    expect(reviewOperationsCopilotProposal).toHaveBeenCalledWith({
      organizationId: "org-1",
      approvalRequestId: "approval-1",
      actorUserId: "admin-1",
      decision: "approved",
      reason: "Counts and scope verified."
    });
  });

  it("rejects a decision without a meaningful review reason", async () => {
    const response = await POST(request("short"), { params: Promise.resolve({ approvalId: "approval-1" }) });

    expect(response.status).toBe(400);
    expect(requireActiveOrganizationAdmin).not.toHaveBeenCalled();
    expect(reviewOperationsCopilotProposal).not.toHaveBeenCalled();
  });
});
