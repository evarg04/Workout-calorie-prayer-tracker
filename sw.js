// Offline support. Network-first so the app is always current when online,
// with the last good copy served from cache when offline.
// The version comes from the registration URL (sw.js?v=...), so every release installs fresh.
const VERSION = new URL(self.location).searchParams.get("v") || "dev";
const CACHE = `temple-${VERSION}`;
const SHELL = [
  "./", "index.html", "styles.css", "manifest.webmanifest",
  "icons/icon.svg", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png",
  "js/app.js", "js/version.js", "js/store.js", "js/nutrition.js", "js/lifts.js", "js/liturgy.js", "js/chart.js", "js/reflect.js",
  "js/ai.js", "js/recipes.js", "js/mealplan.js", "js/programs.js", "js/exercise-db.js", "js/recipe-steps.js", "js/workout-text.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "version") e.source?.postMessage({ type: "version", version: VERSION });
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  // The update checker must always hit the network.
  if (url.searchParams.has("check")) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
