const CACHE_NAME = "little-league-hq-shell-v2";
const SHELL_ROUTES = ["/", "/offline", "/team-portal", "/parent", "/coach", "/admin", "/team-chat", "/registration"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ROUTES)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
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
    icon: "/favicons/favicon-option-1-shield.png",
    badge: "/favicon.ico",
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
