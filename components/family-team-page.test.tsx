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
    expect(html).toContain('dateTime="2026-04-04T12:00:00.000Z"');
  });

  it("renders honest missing-event and missing-coach states with long content contained", () => {
    const html = renderToStaticMarkup(
      <FamilyTeamPage view={{
        teams: [{
          id: "team-long",
          name: "Northwestern Community Championship Baseball Club",
          mascot: "",
          coachNames: []
        }]
      }} />
    );

    expect(html).toContain("Northwestern Community Championship Baseball Club");
    expect(html).toContain("No upcoming event is published.");
    expect(html).toContain("No assigned coach name is available.");
    expect(html).not.toContain("Save portal branding");
  });

  it("explains when no approved parent-team link is available", () => {
    const html = renderToStaticMarkup(<FamilyTeamPage view={{ teams: [] }} />);

    expect(html).toContain("No linked team is available");
    expect(html).toContain("approved guardian link");
  });
});
