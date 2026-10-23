// Read-Along Lab offline support. Its scope (/read-along-lab/) is narrower than the site's root
// service worker, so this one controls the lab pages. Network first, so updates arrive at once.
const VERSION = "read-along-lab-v1";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icons/apple-touch-icon.png", "./icons/icon-192.png", "./icons/icon-512.png"];
const CDN = ["cdn.jsdelivr.net", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("read-along-lab-") && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;               // Claude API calls (POST) always go straight to the network
  const url = new URL(req.url);
  const mine = url.origin === location.origin && url.pathname.startsWith(new URL("./", self.registration.scope).pathname);
  const cdn = CDN.some(h => url.hostname.endsWith(h));
  if (!mine && !cdn) return;
  if (cdn) {                                      // pinned library versions and fonts: cache first
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    })));
    return;
  }
  e.respondWith(fetch(req).then(res => {          // the lab itself: network first, cache as fallback
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req.mode === "navigate" ? "./index.html" : req, copy)); }
    return res;
  }).catch(() => caches.match(req.mode === "navigate" ? "./index.html" : req)));
});
