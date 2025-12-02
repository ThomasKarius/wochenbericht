// einfacher Service Worker ohne eigenes Caching
self.addEventListener("install", event => {
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  clients.claim();
});

// alle Requests einfach normal durchs Netz schicken
self.addEventListener("fetch", () => {});
