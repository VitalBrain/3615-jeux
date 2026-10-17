// 3615 JEUX — service worker : rend l'application installable et jouable hors ligne.
// Pour publier une mise à jour, il suffit de redéployer : la page est toujours
// rechargée depuis le réseau quand il est disponible (le cache ne sert que hors ligne).
// Changez CACHE_VERSION seulement si vous ajoutez ou renommez des fichiers.
const CACHE_VERSION = "3615-jeux-v9";
const PRECACHE = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/favicon-32.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Ne touche qu'aux GET du site lui-même : le formulaire de contact (POST),
  // les publicités et Ko-fi passent directement par le réseau.
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Pages : réseau d'abord (pour avoir la dernière version), cache si hors ligne.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put("/index.html", copy));
          return res;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Fichiers statiques (icônes, manifeste) : cache d'abord.
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});

// ---------------------------------------------------------------
// Rappel quotidien : notifications push envoyées par Netlify
// (fonction planifiée netlify/functions/send-reminders.mjs).
// ---------------------------------------------------------------
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data ? event.data.text() : "" }; }
  const title = data.title || "3615 JEUX";
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/favicon-32.png",
    tag: data.tag || "daily-reminder",
    renotify: true,
    data: { url: data.url || "/" }
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin);
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) {
      if (new URL(c.url).origin === target.origin && "focus" in c) return c.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(target.href);
  })());
});
