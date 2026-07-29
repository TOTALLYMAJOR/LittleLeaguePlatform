const PWA_CACHE_VERSION = "2026.07.29.1";
const PWA_MANIFEST_REVISION = PWA_CACHE_VERSION;
const PWA_BRAND_ASSET_REVISION = "brand-2026.07.29.1";
const SHELL_CACHE_NAME = `little-league-hq-shell-${PWA_CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `little-league-hq-runtime-${PWA_CACHE_VERSION}`;
const CURRENT_CACHES = [SHELL_CACHE_NAME, RUNTIME_CACHE_NAME];
const OFFLINE_URL = "/offline.html";
const NEVER_CACHE_DYNAMIC_ROUTES = ["/offline"];
const STATIC_CACHE_PREFIXES = [
  "/_next/static/"
];
const STATIC_CACHE_URLS = [
  `/manifest.webmanifest?v=${PWA_MANIFEST_REVISION}`,
  `/favicon.ico?v=${PWA_BRAND_ASSET_REVISION}`,
  `/favicons/favicon-option-1-shield.png?v=${PWA_BRAND_ASSET_REVISION}`,
  `/favicons/favicon-option-1-shield.svg?v=${PWA_BRAND_ASSET_REVISION}`,
  `/favicons/favicon-option-4-team-chat.png?v=${PWA_BRAND_ASSET_REVISION}`,
  OFFLINE_URL
];

self.addEventListener("install", (event) => {
  event.waitUntil(precacheStaticShell());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith("little-league-hq-") && !CURRENT_CACHES.includes(key))
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

function isStaticRequest(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return STATIC_CACHE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
}

function isBrandAssetUrl(url) {
  return url.pathname === "/manifest.webmanifest"
    || url.pathname === "/favicon.ico"
    || url.pathname.startsWith("/favicons/");
}

async function networkFirstNavigation(request) {
  try {
    // Navigation responses may contain session, role, organization, season, or
    // team context. They are returned directly and are never written to cache.
    const url = new URL(request.url);
    if (NEVER_CACHE_DYNAMIC_ROUTES.includes(url.pathname)) return await fetch(request);
    return await fetch(request);
  } catch {
    return await caches.match(OFFLINE_URL);
  }
}

async function precacheStaticShell() {
  const cache = await caches.open(SHELL_CACHE_NAME);
  await Promise.all(STATIC_CACHE_URLS.map(async (url) => {
    const response = await fetch(url, { cache: "reload" });
    if (response.ok) await cache.put(url, response);
  }));
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(RUNTIME_CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidateBrandAsset(event) {
  const cache = await caches.open(SHELL_CACHE_NAME);
  const cached = await cache.match(event.request);
  const network = fetch(event.request)
    .then((response) => {
      if (response.ok) void cache.put(event.request, response.clone());
      return response;
    })
    .catch(() => cached);

  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  return network;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }
  if (isBrandAssetUrl(url)) {
    event.respondWith(staleWhileRevalidateBrandAsset(event));
    return;
  }
  if (isStaticRequest(event.request)) event.respondWith(cacheFirstStatic(event.request));
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "New team update." };
  }

  const title = data.title || "LeaguePilot";
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || "New team update.",
    icon: `/favicons/favicon-option-1-shield.png?v=${PWA_BRAND_ASSET_REVISION}`,
    badge: `/favicon.ico?v=${PWA_BRAND_ASSET_REVISION}`,
    data: {
      notificationId: data.notificationId,
      teamId: data.teamId,
      url: data.url || "/team-portal"
    }
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/team-portal";
  event.waitUntil(clients.openWindow(url));
});
