export const PWA_CACHE_VERSION = "2026.07.29.1";
export const PWA_MANIFEST_REVISION = PWA_CACHE_VERSION;
export const PWA_BRAND_ASSET_REVISION = "brand-2026.07.29.1";

export function versionedPwaAsset(path: string, revision: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${encodeURIComponent(revision)}`;
}
