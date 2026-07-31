import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FamilyAccessProgression } from "./family-access-progression";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() })
}));

describe("FamilyAccessProgression", () => {
  it("uses one child selection and keeps permanent and temporary access distinct", () => {
    const html = renderToStaticMarkup(<FamilyAccessProgression
      guardianData={{
        ok: true,
        message: "Current family access loaded.",
        children: [{
          playerId: "player-1",
          playerName: "Maya R.",
          teamId: "team-1",
          teamName: "Tigers"
        }],
        requests: []
      }}
      caregiverData={{
        ok: true,
        message: "Current temporary care loaded.",
        children: [{
          playerId: "player-1",
          childLabel: "Maya R.",
          teamName: "Tigers",
          events: []
        }],
        authorizations: []
      }}
      transitionData={{
        ok: true,
        message: "No transition review is waiting.",
        transitions: []
      }}
    />);

    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("Maya R. · Tigers");
    expect(html).toContain("Permanent team access after league verification");
    expect(html).toContain("Temporary access for selected events, up to 14 days");
    expect(html).toContain("One never upgrades into the other");
    expect(html).toContain("Request guardian review");
    expect(html).not.toContain("No season transition review is waiting");
  });
});
