import type { Sponsor } from "./types";

export function getSponsorPublicDisplayPolicy() {
  return {
    status: "review_required" as const,
    detail: "Public sponsor display requires active status, HTTPS URL, approved placement, and no child endorsement language."
  };
}

export function getSponsorPlacement(sponsors: Sponsor[], placementKey: NonNullable<Sponsor["placementKey"]>) {
  return sponsors.filter((sponsor) => sponsor.status === "active" && sponsor.placementKey === placementKey);
}

export function getTeamPortalSponsorPlacement(sponsors: Sponsor[], teamId: string) {
  return getSponsorPlacement(sponsors, "team_portal").filter((sponsor) => !sponsor.teamId || sponsor.teamId === teamId);
}

export function getScheduleSponsorPlacement(sponsors: Sponsor[]) {
  return getSponsorPlacement(sponsors, "weekly_digest");
}

export function getMediaGallerySponsorPlacement(sponsors: Sponsor[]) {
  return getSponsorPlacement(sponsors, "field_map");
}

export function getEmailSponsorPlacement(sponsors: Sponsor[]) {
  return getSponsorPlacement(sponsors, "weekly_digest");
}

export function getBannerSponsorPlacement(sponsors: Sponsor[]) {
  return getSponsorPlacement(sponsors, "registration");
}
