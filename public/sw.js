// Minimal Service Worker for PWA installability (Vite public/).
// Intencionalmente simples: garante "Add to Home Screen" e modo standalone.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Pass-through fetch (sem cache agressivo para evitar dados desatualizados).
self.addEventListener("fetch", () => {});


