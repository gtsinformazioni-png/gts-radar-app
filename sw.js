// Service worker del Radar GTS: tiene l'app disponibile anche offline e mostra le notifiche.
const VERSIONE = "radar-gts-v1";
const FILE_APP = ["./", "./index.html", "./manifest.webmanifest", "./logo.png", "./icon-192.png", "./apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSIONE).then((c) => c.addAll(FILE_APP)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomi) => Promise.all(nomi.filter((n) => n !== VERSIONE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// L'app si aggiorna dalla rete quando c'è, altrimenti usa la copia salvata.
// I dati (api.github.com) e le foto non passano da qui.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        const copia = r.clone();
        caches.open(VERSIONE).then((c) => c.put(e.request, copia));
        return r;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("./index.html")))
  );
});

self.addEventListener("push", (e) => {
  let dati = { title: "Radar GTS", body: "Nuove occasioni su Subito" };
  try { if (e.data) dati = Object.assign(dati, e.data.json()); } catch (_) {}
  e.waitUntil(
    self.registration.showNotification(dati.title, {
      body: dati.body,
      icon: "icon-192.png",
      badge: "icon-192.png",
      tag: "radar-gts",
      renotify: true,
      data: { url: "./?filtro=nuovo" },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const dest = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((finestre) => {
      for (const f of finestre) {
        if (f.url.startsWith(self.registration.scope)) { f.postMessage({ tipo: "aggiorna" }); return f.focus(); }
      }
      return self.clients.openWindow(dest);
    })
  );
});
