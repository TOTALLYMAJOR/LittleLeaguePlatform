import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FamilyTeamPage } from "./family-team-page";

describe("FamilyTeamPage", () => {
  it("keeps the parent team view useful and free of portal controls", () => {
    const html = renderToStaticMarkup(
      <FamilyTeamPage view={{
        teams: [{
          id: "team-tigers",
          name: "Tiny Tigers",
          mascot: "Tiger Cubs",
          coachNames: ["Taylor Morgan"],
          nextEvent: {
            title: "Opening day",
            startsAt: "2026-04-04T12:00:00.000Z",
            locationName: "Field 1"
          }
        }]
      }} />
    );

    expect(html).toContain("Family team page");
    expect(html).toContain("Taylor Morgan");
    expect(html).toContain("Schedule");
    expect(html).toContain("Messages");
    expect(html).toContain("Help board");
    expect(html).not.toContain("Portal colors and mascot");
    expect(html).not.toContain("Acting user");
    expect(html).not.toContain("Save portal branding");
  });
});
