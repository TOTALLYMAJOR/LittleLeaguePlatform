import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FamilyPhotos } from "./family-photos";

describe("FamilyPhotos", () => {
  it("renders only the release-bounded family media contract", () => {
    const html = renderToStaticMarkup(
      <FamilyPhotos
        photos={[{
          id: "media-released",
          teamId: "team-tigers",
          teamName: "Tiny Tigers",
          title: "Opening day",
          type: "google_photos",
          url: "https://example.com/released",
          moderationStatus: "approved",
          visibility: "team",
          reportCount: 0,
          createdAt: "2026-04-04T12:00:00.000Z"
        }]}
        childLabels={["Mason T."]}
        isCurrent
      />
    );

    expect(html).toContain("explicit family-release evidence");
    expect(html).toContain("Opening day");
    expect(html).toContain("Report for review");
    expect(html).toContain("this page has no consent writer");
    expect(html).not.toContain("Portal colors and mascot");
    expect(html).not.toContain("Acting user");
  });

  it("explains the release pipeline when no items qualify", () => {
    const html = renderToStaticMarkup(
      <FamilyPhotos photos={[]} childLabels={["Mason T."]} isCurrent />
    );

    expect(html).toContain("No released photos yet");
    expect(html).toContain("required consent evidence");
  });
});
