const CACHE_NAME = "gg-pwa-shell-v1";
const APP_ROOT = new URL("./", self.location).pathname;
const OFFLINE_URL = "./offline.html";

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll([
        "./offline.html",
        "./icons/gg-app-icon.svg"
      ]))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("gg-pwa-") && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  if (url.pathname.endsWith("/icons/gg-app-icon.svg") || url.pathname.endsWith("/offline.html")) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request))
    );
  }
});
