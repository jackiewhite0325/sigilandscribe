/**
 * Manuscript Map | Service Worker
 * Caches the app shell so the app installs and runs fully offline.
 * Data itself lives in localStorage (unaffected by this file) — this
 * only caches the static files needed to load the app at all.
 *
 * Strategy: cache-first for instant offline loads, with a background
 * network fetch that refreshes the cache for next time. Bump CACHE_NAME
 * whenever app.js / index.html / styles.css change so old caches get
 * cleared out on the next visit.
 */

const CACHE_NAME = "manuscript-map-shell-v6-checklist-date";

const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./privacy.html",
  "./terms.html",
  "./return-policy.html",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Only handle same-origin GET requests — let everything else pass through normally.
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached); // offline and not cached yet — nothing more we can do

      // Cache-first: instant load if we have it, refresh in the background either way.
      return cached || networkFetch;
    })
  );
});
