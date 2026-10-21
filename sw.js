// Offline support: cache the app shell; network-first so updates arrive when online.
const CACHE = "temple-v3";
const SHELL = [
  "./", "index.html", "styles.css", "manifest.webmanifest", "icons/icon.svg",
  "js/app.js", "js/store.js", "js/nutrition.js", "js/lifts.js", "js/liturgy.js", "js/chart.js", "js/reflect.js",
  "js/ai.js", "js/recipes.js", "js/mealplan.js", "js/programs.js", "js/exercise-db.js",
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

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request)),
  );
});
