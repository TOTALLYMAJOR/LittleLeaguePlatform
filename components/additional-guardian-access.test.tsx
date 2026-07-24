import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  AdminAdditionalGuardianClient,
  ParentAdditionalGuardianClient
} from "./additional-guardian-access";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() })
}));

describe("additional guardian experience", () => {
  it("starts blank and explains review, timing, privacy, and excluded authority", () => {
    const html = renderToStaticMarkup(<ParentAdditionalGuardianClient data={{
      ok: true,
      message: "Private review.",
      children: [{ playerId: "player-1", playerName: "Maya R.", teamId: "team-1", teamName: "Tigers" }],
      requests: []
    }} />);
    expect(html).toContain("Ask the league to connect another trusted adult.");
    expect(html).toContain("one to two business days");
    expect(html).toContain("custody authority");
    expect(html).toContain("transportation responsibility");
    expect(html).toContain("authorized league administrators");
    expect(html).toContain("Send for league review");
    expect(html).not.toContain("sam@example.com");
    expect(html).not.toContain("access grant");
    expect(html).not.toContain("/api/");
  });

  it("makes admin approval attributed, reasoned, and manually issued", () => {
    const html = renderToStaticMarkup(<AdminAdditionalGuardianClient data={{
      ok: true,
      message: "Verify scope.",
      requests: [{
        id: "request-1",
        organizationId: "org-1",
        playerId: "player-1",
        playerName: "Maya R.",
        teamId: "team-1",
        teamName: "Tigers",
        proposedByLabel: "Jordan R.",
        proposedEmail: "trusted@example.com",
        relationship: "guardian",
        requestedAt: "2026-07-24T12:00:00.000Z",
        state: "pending_review"
      }]
    }} />);
    expect(html).toContain("Family-visible decision note");
    expect(html).toContain("Approve and issue link");
    expect(html).toContain("does not send it");
    expect(html).toContain("exact invited email");
  });
});
