/* MONE PWA Service Worker (offline robusto) */
const CACHE_NAME = "mone-cache-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./register.html",
  "./dashboard.html",
  "./style.css",
  "./app.js",
  "./logo.png",
  "./manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Cross-origin (por ejemplo Apps Script): NO cacheamos aquí.
  // Si falla, devolvemos una respuesta válida (no null).
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(req).catch(() =>
        new Response(
          JSON.stringify({ ok: false, error: "Network error (offline?)" }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        )
      )
    );
    return;
  }

  // Navegación: intenta red y fallback a cache/index
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((resp) => resp)
        .catch(async () => {
          const cached = await caches.match("./index.html");
          return cached || new Response("Offline", { status: 503 });
        })
    );
    return;
  }

  // Assets: cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((resp) => {
          // Cachea solo respuestas correctas
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return resp;
        })
        .catch(() => new Response("", { status: 504 }));
    })
  );
});
