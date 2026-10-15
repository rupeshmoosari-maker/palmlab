// sw.js - lets AI Palm Lab work offline after one visit (handy on school Wi-Fi).
// The app files are saved on first visit; the AI files (about 17 MB) only
// the first time the camera screen loads them, so a visitor who never scans
// never downloads them. Change VERSION whenever a file changes.
const VERSION = "palmlab-v3";
const CORE = [
  "./", "index.html", "css/style.css", "js/app.js", "js/scan.js", "js/measure.js",
  "js/reading.js", "js/experiment.js", "js/kb.js", "js/palmread.js", "js/readingui.js",
  "data/palmistry_knowledge.json", "data/astrology_knowledge.json", "icon.svg", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Cache first, then the network; anything fetched from this site is kept for next time.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit ||
    fetch(e.request).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
      }
      return res;
    })));
});
