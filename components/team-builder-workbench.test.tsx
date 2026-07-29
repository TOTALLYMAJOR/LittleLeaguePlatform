import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TeamBuilderWorkbench } from "./team-builder-workbench";

describe("team-builder workbench", () => {
  it("renders the full reviewed lifecycle and proof-safe provider boundary", () => {
    const html = renderToStaticMarkup(<TeamBuilderWorkbench initialData={{
      ok: true,
      message: "Ready for local review.",
      organizationId: "org-1",
      seasons: [{ id: "season-1", name: "Spring", status: "active" }],
      teams: [
        { id: "team-1", seasonId: "season-1", name: "Tigers", division: "8U", status: "active" },
        { id: "team-2", seasonId: "season-1", name: "Bears", division: "8U", status: "active" }
      ],
      inputs: [{
        playerId: "player-1",
        playerLabel: "Maya R.",
        organizationId: "org-1",
        seasonId: "season-1",
        teamId: "team-1",
        birthDate: null,
        ageBand: null,
        evaluationRating: null,
        profileMissing: true,
        ageBandDefaulted: true,
        evaluationDefaulted: true
      }],
      plans: [],
      providerExecution: "not_started"
    }} />);
    expect(html).toContain("Preview → Edit → Approve → Publish");
    expect(html).toContain("Create persisted preview");
    expect(html).toContain("Save edited assignments");
    expect(html).toContain("Approve reviewed plan");
    expect(html).toContain("Publish approved assignments");
    expect(html).toContain("sends no email, SMS, push");
    expect(html).toContain("Hosted browser and Supabase readback proof remain external acceptance gates");
    expect(html).toContain("Profile missing");
    expect(html).toContain("Evaluation default 3");
  });

  it("renders a retryable empty state without inventing roster data", () => {
    const html = renderToStaticMarkup(<TeamBuilderWorkbench initialData={{
      ok: false,
      message: "Migration not promoted.",
      organizationId: "org-1",
      seasons: [],
      teams: [],
      inputs: [],
      plans: [],
      providerExecution: "not_started"
    }} />);
    expect(html).toContain("No active roster is ready");
    expect(html).toContain("Retry roster load");
    expect(html).not.toContain("Maya R.");
  });
});
