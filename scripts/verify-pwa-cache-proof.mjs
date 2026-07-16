import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function requireMatch(name, value, pattern) {
  if (!pattern.test(value)) throw new Error(`${name} did not match ${pattern}`);
}

function requireContains(name, value, expected) {
  if (!value.includes(expected)) throw new Error(`${name} is missing ${expected}`);
}

const contract = read("lib/domain/pwa-cache.ts");
const worker = read("public/sw.js");
const manifest = read("public/manifest.webmanifest");
const layout = read("app/layout.tsx");
const providers = read("app/providers.tsx");
const docs = read("docs/pwa-cache-invalidation.md");

const cacheVersion = contract.match(/PWA_CACHE_VERSION = "([^"]+)"/)?.[1];
const brandRevision = contract.match(/PWA_BRAND_ASSET_REVISION = "([^"]+)"/)?.[1];

if (!cacheVersion || !brandRevision) throw new Error("PWA cache contract is missing version constants.");
requireMatch("PWA_CACHE_VERSION", cacheVersion, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
requireContains("PWA_BRAND_ASSET_REVISION", brandRevision, cacheVersion);

for (const [name, value] of [
  ["service worker", worker],
  ["manifest", manifest],
  ["PWA docs", docs]
]) {
  requireContains(name, value, cacheVersion);
}

for (const [name, value] of [
  ["service worker", worker],
  ["manifest", manifest],
  ["PWA docs", docs]
]) {
  requireContains(name, value, brandRevision);
}

requireContains("service worker", worker, "little-league-hq-shell-${PWA_CACHE_VERSION}");
requireContains("service worker", worker, "little-league-hq-runtime-${PWA_CACHE_VERSION}");
requireContains("service worker", worker, "caches.keys()");
requireContains("service worker", worker, "networkFirstNavigation");
requireContains("service worker", worker, "isBrandAssetUrl");
requireContains("service worker", worker, "event.waitUntil(network)");
requireContains("provider registration", providers, "PWA_CACHE_VERSION");
requireContains("provider registration", providers, "updateViaCache: \"none\"");
requireContains("layout metadata", layout, "PWA_MANIFEST_REVISION");
requireContains("layout metadata", layout, "PWA_BRAND_ASSET_REVISION");
requireContains("layout metadata", layout, "versionedPwaAsset(\"/manifest.webmanifest\", PWA_MANIFEST_REVISION)");
requireContains("manifest", manifest, "\"version\":");
requireContains("manifest", manifest, "?v=brand-");
requireContains("PWA docs", docs, "Bump `PWA_CACHE_VERSION`");
requireContains("PWA docs", docs, "stale-brand avoidance");

console.log(`PWA cache proof passed for ${cacheVersion}.`);
