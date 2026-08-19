import { describe, expect, it } from "vitest";
import {
  generateOperationsCopilotBrief,
  getOperationsCopilotProviderReadiness
} from ".";

const candidate = {
  proposalKey: "registration_review:org-1:2",
  proposalType: "registration_review" as const,
  priority: "high" as const,
  title: "Review pending family access requests",
  summary: "2 records need an authorized administrator's review.",
  targetType: "registration_request_queue",
  actionHref: "/admin/registrations" as const,
  evidence: [{
    label: "Registration review",
    value: "2 pending",
    observedAt: "2026-08-18T12:00:00.000Z",
    source: "leaguepilot_record" as const
  }],
  boundary: "Approval requires administrator review."
};

describe("Operations Copilot provider", () => {
  it("keeps deterministic ranking available when provider use is disabled", async () => {
    const result = await generateOperationsCopilotBrief({
      candidates: [candidate],
      config: { enabled: false, model: "gpt-test" }
    });

    expect(result.source).toBe("deterministic");
    expect(result.proposals).toHaveLength(1);
    expect(result.message).toContain("disabled");
  });

  it("recognizes the Netlify gateway delivery path without claiming readiness", () => {
    expect(getOperationsCopilotProviderReadiness({
      enabled: true,
      model: "gpt-test",
      baseUrl: "https://example.netlify.app/.netlify/ai",
      apiKey: undefined
    })).toMatchObject({
      configured: false,
      delivery: "netlify_gateway"
    });
  });
});
