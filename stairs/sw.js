// Scoped to /stairs/ so the site's root service worker never handles this game's pages.
// Network first, so a new version shows up right away; cached copy only as a fallback.
const VERSION = "endless-stairs-v4";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("endless-stairs-") && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const mine = url.origin === location.origin && url.pathname.startsWith(new URL("./", self.registration.scope).pathname);
  const fonts = url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com");
  if (!mine && !fonts) return;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === "navigate" ? caches.match("./") : undefined)))
  );
});
