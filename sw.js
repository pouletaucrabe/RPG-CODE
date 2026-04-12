const CACHE = "rpg-v1"

// Assets critiques à précacher au démarrage
const PRECACHE = [
  "/",
  "/index.html",
  "/style.css",
  "/ws-shim.js",
  "/game.js",
  "/ui.js",
  "/combat.js",
  "/config.js",
  "/state.js",
  "/utils.js",
  "/manifest.json",
  "/fonts/fonts.css"
]

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()) // Ne pas bloquer si un asset manque
  )
})

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url)

  // Ne pas intercepter les WebSockets ou les requêtes externes
  if (url.protocol === "ws:" || url.protocol === "wss:") return
  if (url.origin !== self.location.origin) return

  // HTML → Network first (pour avoir toujours le dernier index.html)
  if (url.pathname === "/" || url.pathname.endsWith(".html")) {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          if (resp.ok) {
            const clone = resp.clone()
            caches.open(CACHE).then(c => c.put(e.request, clone))
          }
          return resp
        })
        .catch(() => caches.match(e.request))
    )
    return
  }

  // Audio → ne pas cacher (range requests 206 incompatibles avec Cache API)
  const ext = url.pathname.split(".").pop().toLowerCase()
  if (ext === "mp3" || ext === "ogg" || ext === "wav") {
    return // laisse le navigateur gérer
  }

  // Tout le reste → Cache first, puis réseau
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached
      return fetch(e.request).then(resp => {
        if (resp.ok && resp.status === 200) {
          const clone = resp.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return resp
      }).catch(() => new Response("Offline", { status: 503 }))
    })
  )
})
