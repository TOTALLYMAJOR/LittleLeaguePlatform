const CACHE_NAME = "little-league-hq-shell-v3";
const OFFLINE_URL = "/offline";
const STATIC_CACHE_PREFIXES = [
  "/_next/static/",
  "/favicons/"
];
const STATIC_CACHE_URLS = [
  "/manifest.webmanifest",
  OFFLINE_URL
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_CACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

function isStaticRequest(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return STATIC_CACHE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)) || STATIC_CACHE_URLS.includes(url.pathname);
}

async function networkFirstNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    return await caches.match(OFFLINE_URL);
  }
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

  if (isStaticRequest(event.request)) {
    event.respondWith(cacheFirstStatic(event.request));
  }
});
