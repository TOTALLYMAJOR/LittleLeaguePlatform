import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { applyFamilyPhotoReportResult, FamilyPhotos, type FamilyPhotoItem } from "./family-photos";

const releasedPhotos: FamilyPhotoItem[] = [
  {
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
  },
  {
    id: "media-second",
    teamId: "team-tigers",
    teamName: "Tiny Tigers",
    title: "Team warmup",
    type: "google_photos",
    url: "https://example.com/second",
    moderationStatus: "approved",
    visibility: "team",
    reportCount: 0,
    createdAt: "2026-04-05T12:00:00.000Z"
  }
];

describe("FamilyPhotos", () => {
  it("renders only the release-bounded family media contract", () => {
    const html = renderToStaticMarkup(
      <FamilyPhotos
        photos={[releasedPhotos[0]]}
        childLabels={["Mason T."]}
        isCurrent
      />
    );

    expect(html).toContain("explicit family-release evidence");
    expect(html).toContain("Opening day");
    expect(html).toContain("Report for review");
    expect(html).toContain('aria-label="Open released photo: Opening day"');
    expect(html).toContain('aria-label="Report Opening day for staff review"');
    expect(html).toContain('data-media-id="media-released"');
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

  it("removes only the reported photo after a successful staff-review request", () => {
    const next = applyFamilyPhotoReportResult(releasedPhotos, "media-released", {
      ok: true,
      message: "Report saved for staff review."
    });

    expect(next.photos.map((photo) => photo.id)).toEqual(["media-second"]);
    expect(next.feedback).toEqual({
      tone: "success",
      message: "Report saved for staff review."
    });
  });

  it("retains every photo and permits retry after a failed request", () => {
    const next = applyFamilyPhotoReportResult(releasedPhotos, "media-released", {
      ok: false,
      message: "Staff review could not be requested. Try again."
    });

    expect(next.photos).toBe(releasedPhotos);
    expect(next.feedback).toEqual({
      tone: "error",
      message: "Staff review could not be requested. Try again."
    });
  });
});
