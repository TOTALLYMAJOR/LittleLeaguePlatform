import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  AdminSeasonTransitionReview,
  ParentSeasonTransitionReview
} from "./season-transition-review";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() })
}));

const transition = {
  id: "transition-1",
  sourcePlayerId: "player-1",
  childLabel: "Maya R.",
  sourceTeamName: "Tigers",
  sourceSeasonName: "Spring 2026",
  targetTeamName: "Comets",
  targetSeasonName: "Fall 2026",
  state: "awaiting_guardian_review" as const,
  carryForwardFields: ["child_display_identity", "guardian_relationship"],
  resetRequiredFields: [
    "guardian_permissions",
    "custody_restrictions",
    "medical_information",
    "attendance_and_rsvp",
    "transportation_responsibility",
    "temporary_caregivers",
    "media_consent",
    "notification_preferences",
    "team_conversation"
  ],
  proposalReason: "Age division alignment for the new season.",
  expiresAt: "2026-08-07T12:00:00.000Z",
  lockVersion: 1,
  guardianDecision: "pending" as const,
  guardianReviewCount: 2,
  guardianAcceptedCount: 1
};

describe("season transition review experience", () => {
  it("shows parents exactly what moves, resets, and remains unchanged until admin application", () => {
    const html = renderToStaticMarkup(<ParentSeasonTransitionReview data={{
      ok: true,
      message: "Showing your review.",
      transitions: [transition]
    }} />);
    expect(html).toContain("Know exactly what moves—and what does not.");
    expect(html).toContain("Child display identity");
    expect(html).toContain("Custody restrictions");
    expect(html).toContain("Medical information");
    expect(html).toContain("response alone does not change the roster or access");
    expect(html).toContain("Accept this reviewed move");
    expect(html).toContain("Decline");
  });

  it("gives administrators attributed readiness and correction gates", () => {
    const html = renderToStaticMarkup(<AdminSeasonTransitionReview data={{
      ok: true,
      message: "Privacy-minimized review.",
      transitions: [transition],
      sourcePlayers: [{ id: "player-1", childLabel: "Maya R.", teamId: "team-1", teamName: "Tigers", seasonName: "Spring 2026" }],
      targetTeams: [{ id: "team-2", teamName: "Comets", seasonName: "Fall 2026" }]
    }} />);
    expect(html).toContain("Reviewed season and team changes");
    expect(html).toContain("TRANSITION-001");
    expect(html).toContain("No roster change or provider message occurs");
    expect(html).toContain("Apply reviewed move");
    expect(html).toContain("Correct before activity");
  });
});
