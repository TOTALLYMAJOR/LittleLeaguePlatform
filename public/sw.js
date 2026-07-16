const PWA_CACHE_VERSION = "2026.07.16.14";
const PWA_MANIFEST_REVISION = PWA_CACHE_VERSION;
const PWA_BRAND_ASSET_REVISION = "brand-2026.07.16.14";
const SHELL_CACHE_NAME = `little-league-hq-shell-${PWA_CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `little-league-hq-runtime-${PWA_CACHE_VERSION}`;
const CURRENT_CACHES = [SHELL_CACHE_NAME, RUNTIME_CACHE_NAME];
const SHELL_ROUTES = ["/", "/offline", "/team-portal", "/parent", "/coach", "/admin", "/team-chat", "/registration"];
const BRAND_ASSETS = [
  `/manifest.webmanifest?v=${PWA_MANIFEST_REVISION}`,
  `/favicon.ico?v=${PWA_BRAND_ASSET_REVISION}`,
  `/favicons/favicon-option-1-shield.png?v=${PWA_BRAND_ASSET_REVISION}`,
  `/favicons/favicon-option-1-shield.svg?v=${PWA_BRAND_ASSET_REVISION}`,
  `/favicons/favicon-option-4-team-chat.png?v=${PWA_BRAND_ASSET_REVISION}`
];
const PRECACHE_URLS = [...SHELL_ROUTES, ...BRAND_ASSETS];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => !CURRENT_CACHES.includes(key)).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

function isNavigationRequest(request) {
  return request.mode === "navigate" || request.headers.get("accept")?.includes("text/html");
}

function isBrandAssetUrl(url) {
  return url.pathname === "/manifest.webmanifest" || url.pathname === "/favicon.ico" || url.pathname.startsWith("/favicons/");
}

async function networkFirstNavigation(request) {
  const url = new URL(request.url);
  const shellPath = SHELL_ROUTES.includes(url.pathname) ? url.pathname : null;
  try {
    const response = await fetch(request);
    if (shellPath && response.ok) {
      const cache = await caches.open(SHELL_CACHE_NAME);
      await cache.put(shellPath, response.clone());
    }
    return response;
  } catch {
    return (shellPath ? await caches.match(shellPath) : null) ?? await caches.match("/offline");
  }
}

async function staleWhileRevalidateBrandAsset(event) {
  const cache = await caches.open(SHELL_CACHE_NAME);
  const cached = await cache.match(event.request);
  const network = fetch(event.request)
    .then((response) => {
      if (response.ok) cache.put(event.request, response.clone());
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

  if (isNavigationRequest(event.request)) {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  if (isBrandAssetUrl(url)) {
    event.respondWith(staleWhileRevalidateBrandAsset(event));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request).catch(() => caches.match("/offline")))
  );
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
