const CACHE_NAME = "little-league-hq-static-v5";
const OFFLINE_URL = "/offline.html";
const NEVER_CACHE_DYNAMIC_ROUTES = ["/offline"];
const STATIC_CACHE_PREFIXES = [
  "/_next/static/",
  "/favicons/"
];
const STATIC_CACHE_URLS = [
  "/manifest.webmanifest",
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
        .filter((key) => key.startsWith("little-league-hq-") && key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

function isStaticRequest(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return STATIC_CACHE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
    || STATIC_CACHE_URLS.includes(url.pathname);
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
  const cache = await caches.open(CACHE_NAME);
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
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }
  if (isStaticRequest(event.request)) event.respondWith(cacheFirstStatic(event.request));
});
