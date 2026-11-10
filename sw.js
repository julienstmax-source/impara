// Impara! — service worker.
// La page est servie depuis le cache (ouverture immédiate, même hors ligne) puis comparée au serveur en arrière-plan :
// si elle a changé, l'app affiche « Une mise à jour est prête ». Reçoit aussi les notifications push.
const SHELL = "impara-shell-v4", PAGE = "./index.html";
const ASSETS = ["./manifest.webmanifest", "./icon-180.png", "./icon-512.png",
  "./fonts/pjs-latin.woff2", "./fonts/pjs-latin-ext.woff2", "./fonts/nr-latin.woff2", "./fonts/nr-latin-ext.woff2", "./fonts/nr-latin-italic.woff2", "./fonts/nr-latin-ext-italic.woff2"];

// Télécharge la page ; renvoie true si elle remplace une copie différente déjà en cache
async function fetchPage(cache) {
  const r = await fetch("./", { cache: "no-cache" }); if (!r.ok) return false;
  const old = await cache.match(PAGE), text = await r.clone().text(), changed = !old || (await old.text()) !== text;
  if (changed) await cache.put(PAGE, r);
  return changed && !!old;
}
async function revalidate() {
  try { const cache = await caches.open(SHELL); if (await fetchPage(cache)) (await self.clients.matchAll({ type: "window" })).forEach((c) => c.postMessage({ type: "update-ready" })); } catch (e) {}
}

self.addEventListener("install", (e) => {
  // allSettled : un fichier manquant n'empêche pas de mettre les autres en cache
  e.waitUntil(caches.open(SHELL).then((c) => Promise.allSettled([fetchPage(c), ...ASSETS.map((a) => c.add(a))])));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url), scope = new URL(self.registration.scope).pathname;
  if (e.request.method !== "GET" || url.origin !== location.origin || !url.pathname.startsWith(scope)) return;
  const rel = url.pathname.slice(scope.length);
  if (e.request.mode === "navigate" || rel === "" || rel === "index.html") {
    e.respondWith(caches.open(SHELL).then(async (c) => {
      const hit = await c.match(PAGE); if (hit) { e.waitUntil(revalidate()); return hit; }
      const r = await fetch(e.request); if (r.ok) c.put(PAGE, r.clone()); return r;
    }));
  } else if (ASSETS.includes("./" + rel)) {
    e.respondWith(caches.open(SHELL).then(async (c) => (await c.match(e.request, { ignoreSearch: true })) || fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; })));
  }
});
self.addEventListener("message", (e) => { if (e.data && e.data.type === "check-update") e.waitUntil(revalidate()); });

self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { title: "Impara!", body: e.data ? e.data.text() : "" }; }
  const opts = { body: data.body || "", icon: "./icon-180.png", badge: "./icon-180.png", tag: data.id || undefined, data: { url: data.url || "./#/oggi", id: data.id } };
  e.waitUntil(self.registration.showNotification(data.title || "Impara!", opts));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || "./#/oggi", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    for (const c of cs) if (c.url.startsWith(self.registration.scope)) { c.postMessage({ type: "open-oggi" }); return c.focus(); }
    return self.clients.openWindow(target);
  }));
});
