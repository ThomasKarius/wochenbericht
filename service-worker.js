self.addEventListener("install", () => {
    console.log("Service Worker installiert");
    self.skipWaiting();
});

self.addEventListener("activate", () => {
    console.log("Service Worker aktiv");
});
