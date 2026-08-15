import { describe, expect, it } from "vitest";
import { discoverFamilyContrastRoutes } from "../scripts/lib/family-contrast-routes.mjs";

describe("Family contrast route discovery", () => {
  it("derives every authenticated Family destination from route topology", () => {
    const paths = discoverFamilyContrastRoutes().map((route) => route.path);
    expect(paths).toEqual(expect.arrayContaining([
      "/parent",
      "/parent/schedule",
      "/parent/rsvp",
      "/parent/messages",
      "/parent/photos",
      "/parent/practice-recaps",
      "/parent/family-access",
      "/parent/transportation",
      "/parent/settings",
      "/parent/more",
      "/parent/setup",
      "/team-chat",
      "/team-portal",
      "/account"
    ]));
    expect(new Set(paths).size).toBe(paths.length);
  });
});
