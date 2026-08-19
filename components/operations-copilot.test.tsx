import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { OperationsCopilot } from "./operations-copilot";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() })
}));

const readiness = {
  configured: false,
  delivery: "netlify_gateway" as const,
  model: "gpt-test",
  reason: "AI ranking is disabled."
};

describe("OperationsCopilot", () => {
  it("renders an evidence-backed durable proposal with a visible execution boundary", () => {
    const html = renderToStaticMarkup(<OperationsCopilot
      organizationId="org-1"
      initialWorkspace={{
        available: true,
        source: "supabase",
        message: "Durable proposals loaded.",
        providerReadiness: readiness,
        proposals: [{
          id: "approval-1",
          agentRunId: "run-1",
          proposalKey: "registration_review:org-1:2",
          proposalType: "registration_review",
          priority: "high",
          title: "Review pending family access requests",
          summary: "2 records need an authorized administrator's review.",
          rationale: "The verified queue contains two pending records.",
          recommendedNextStep: "Open registration review and verify scope.",
          targetType: "registration_request_queue",
          actionHref: "/admin/registrations",
          evidence: [{
            label: "Registration review",
            value: "2 pending",
            observedAt: "2026-08-18T12:00:00.000Z",
            source: "leaguepilot_record"
          }],
          boundary: "Approval does not grant family access.",
          source: "deterministic",
          status: "pending",
          createdAt: "2026-08-18T12:00:00.000Z"
        }]
      }}
    />);

    expect(html).toContain("Operations Copilot");
    expect(html).toContain("2 pending");
    expect(html).toContain("Approve plan");
    expect(html).toContain("does not execute it");
    expect(html).toContain("Netlify AI Gateway");
  });

  it("labels fallback proposals as preview-only and disables durable generation", () => {
    const html = renderToStaticMarkup(<OperationsCopilot
      organizationId="org-1"
      initialWorkspace={{
        available: false,
        source: "fallback",
        message: "Local preview only.",
        providerReadiness: readiness,
        proposals: []
      }}
    />);

    expect(html).toContain("Local preview only");
    expect(html).toContain("Refresh briefing");
    expect(html).toContain("disabled");
  });
});
