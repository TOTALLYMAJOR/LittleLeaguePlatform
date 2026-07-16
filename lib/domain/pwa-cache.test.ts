import { describe, expect, it } from "vitest";
import { PWA_BRAND_ASSET_REVISION, PWA_CACHE_VERSION, PWA_MANIFEST_REVISION, versionedPwaAsset } from "./pwa-cache";

describe("PWA cache versioning", () => {
  it("keeps manifest and service-worker revisions explicit", () => {
    expect(PWA_CACHE_VERSION).toMatch(/^\d{4}\.\d{2}\.\d{2}\.\d+$/);
    expect(PWA_MANIFEST_REVISION).toBe(PWA_CACHE_VERSION);
    expect(PWA_BRAND_ASSET_REVISION).toContain(PWA_CACHE_VERSION);
  });

  it("adds cache-busting revision parameters without dropping existing query params", () => {
    expect(versionedPwaAsset("/sw.js", PWA_CACHE_VERSION)).toBe("/sw.js?v=2026.07.16.14");
    expect(versionedPwaAsset("/manifest.webmanifest?source=layout", PWA_MANIFEST_REVISION)).toBe(
      "/manifest.webmanifest?source=layout&v=2026.07.16.14"
    );
  });
});
