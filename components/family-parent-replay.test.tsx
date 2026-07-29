import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FamilyParentReplay } from "./family-parent-replay";

describe("FamilyParentReplay", () => {
  it("renders a coach-approved, private, useful family memory without requiring child media", () => {
    const html = renderToStaticMarkup(
      <FamilyParentReplay data={{
        ok: true,
        message: "Showing published Replays.",
        replays: [{
          id: "replay-1",
          organizationId: "org-1",
          seasonId: "season-1",
          teamId: "team-1",
          teamName: "Tiny Tigers",
          childLabels: ["Mason T."],
          coachName: "Coach Taylor",
          title: "Ready hands, brave throws",
          summary: "Mason kept trying and helped a teammate reset.",
          focusAreas: ["catching", "teamwork"],
          homeActivities: [{
            duration: "2_minutes",
            title: "Sock-ball high five",
            coachCue: "Ready hands, kind words.",
            parentGoal: "Make one catch feel like a shared win.",
            steps: ["Roll up a pair of socks.", "Make three gentle tosses.", "High-five the effort."]
          }],
          parentTip: "Praise the brave try, not the perfect catch.",
          parentEducation: "Ready hands help a child feel prepared before the ball arrives.",
          teamQuest: "Encourage one teammate at the next practice.",
          skillCards: ["Hands ready", "Eyes on the toss"],
          publishedAt: "2026-07-20T18:00:00.000Z",
          approvedAt: "2026-07-20T17:55:00.000Z",
          media: []
        }]
      }} />
    );
    expect(html).toContain("Bring one good moment from practice home.");
    expect(html).toContain("Private by default.");
    expect(html).toContain("Coach approved");
    expect(html).toContain("Coach Taylor");
    expect(html).toContain("Mason T.");
    expect(html).toContain("Sock-ball high five");
    expect(html).toContain("No child photo needed");
    expect(html).toContain("It does not score, rank, or evaluate your child.");
    expect(html).toContain("Season memory timeline");
  });

  it("shows a truthful empty state without seeded family identities", () => {
    const html = renderToStaticMarkup(
      <FamilyParentReplay data={{
        ok: true,
        message: "No published Replay yet.",
        replays: []
      }} />
    );
    expect(html).toContain("Your first Replay will land here.");
    expect(html).toContain("Drafts, unreviewed media, and other families");
    expect(html).not.toContain("Mason");
  });
});
