import { describe, expect, it } from "vitest";
import {
  buildDeterministicOperationsCopilotBrief,
  buildOperationsCopilotCandidates
} from "./operations-copilot";

describe("Operations Copilot domain", () => {
  it("turns only supported non-zero organization queues into bounded proposals", () => {
    const candidates = buildOperationsCopilotCandidates({
      organizationId: "org-1",
      observedAt: "2026-08-18T12:00:00.000Z",
      queues: [
        { queue: "Registration review", count: 3, actionHref: "/admin/registrations", boundary: "Admin review required." },
        { queue: "Provider delivery review", count: 0, actionHref: "/admin/message-delivery-review", boundary: "No send." },
        { queue: "Unknown queue", count: 9, actionHref: "/admin", boundary: "Unsupported." }
      ]
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      proposalType: "registration_review",
      actionHref: "/admin/registrations",
      evidence: [{ value: "3 pending", source: "leaguepilot_record" }]
    });
  });

  it("creates review-only deterministic proposals without execution claims", () => {
    const candidates = buildOperationsCopilotCandidates({
      organizationId: "org-1",
      queues: [{
        queue: "Media moderation",
        count: 1,
        actionHref: "/admin/media-review",
        boundary: "Reported media remains unchanged until review."
      }]
    });
    const brief = buildDeterministicOperationsCopilotBrief(candidates, "2026-08-18T12:00:00.000Z");

    expect(brief.source).toBe("deterministic");
    expect(brief.proposals[0]).toMatchObject({ status: "pending", proposalType: "media_moderation" });
    expect(brief.proposals[0]?.recommendedNextStep).toContain("Open media review");
    expect(brief.message).toContain("requires an administrator decision");
  });
});
