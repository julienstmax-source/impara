// Impara! — service worker : coque hors ligne (réseau d'abord), notifications push, ouverture sur Oggi.
const SHELL = "impara-shell-v2";
const ASSETS = ["./", "./manifest.webmanifest", "./icon-180.png", "./icon-512.png",
  "./fonts/pjs-latin.woff2", "./fonts/pjs-latin-ext.woff2", "./fonts/nr-latin.woff2", "./fonts/nr-latin-ext.woff2", "./fonts/nr-latin-italic.woff2", "./fonts/nr-latin-ext-italic.woff2"];

self.addEventListener("install", (e) => { e.waitUntil(caches.open(SHELL).then((c) => c.addAll(ASSETS)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.pathname.includes("/api/") || url.pathname.endsWith("/api")) return;
  const isShell = ASSETS.some((a) => url.pathname.endsWith(a.replace("./", "/")) || (a === "./" && (url.pathname.endsWith("/") || url.pathname.endsWith("/index.html"))));
  if (!isShell) return;
  e.respondWith(fetch(e.request).then((r) => { if (r.ok) { const copy = r.clone(); caches.open(SHELL).then((c) => c.put(e.request, copy)).catch(() => {}); } return r; }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});

self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { title: "Impara!", body: e.data ? e.data.text() : "" }; }
  const title = data.title || "Impara!";
  const opts = { body: data.body || "", icon: "./icon-180.png", badge: "./icon-180.png", tag: data.id || undefined, data: { url: data.url || "./#oggi", id: data.id } };
  e.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || "./#oggi", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    for (const c of cs) if (c.url.startsWith(self.registration.scope)) { c.postMessage({ type: "open-oggi" }); return c.focus(); }
    return self.clients.openWindow(target);
  }));
});
